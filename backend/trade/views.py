import json # Not directly used here, but good to have if you debug with json.dumps
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.utils.timezone import now
from rest_framework.pagination import PageNumberPagination
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Trade, Availability, Profit, Exit
from django.db.models import Q
from .serializers import TradeSerializer, ProfitSerializer, ExitSerializer
from django.shortcuts import get_object_or_404

class CreateTradeView(generics.CreateAPIView):
    serializer_class = TradeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        print(request.data)
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            trade = serializer.save(trader=self.request.user)
            self.notify_ws_clients(trade)
            return Response(TradeSerializer(trade).data, status=status.HTTP_201_CREATED)
        else:
            print("❌ Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def notify_ws_clients(self, trade):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'trades', # Send to the general 'trades' group
            {
                'type': 'trade_update', # <-- Consistent message type
                'trade': TradeSerializer(trade).data
            }
        )

class TradePagination(PageNumberPagination):
    page_size = 10  # This must match API_PAGE_SIZE in your React frontend
    page_size_query_param = 'page_size'
    max_page_size = 100

class ManagerTradeListView(generics.ListAPIView):
    queryset = Trade.objects.all().order_by('-created_at')
    serializer_class = TradeSerializer
    permission_classes = [permissions.IsAdminUser] # or custom permission for managers
    pagination_class = TradePagination # <-- ADD THIS LINE FOR PAGINATION

class UserTradeListView(generics.ListAPIView):
    serializer_class = TradeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Trade.objects.filter(trader=self.request.user).order_by('-created_at')

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_trade_status(request, trade_id):
    try:
        trade = Trade.objects.get(id=trade_id)
    except Trade.DoesNotExist:
        return Response({"error": "Trade not found."}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get("status")

    if new_status not in ['approved', 'order_placed', 'fills_received']:
        return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

    # Only managers (or specific roles) should be able to update these statuses
    # You might want to add permission checks here if not already handled by DRF permissions
    # e.g., if not request.user.is_staff: return Response(...)

    if new_status == 'approved':
        trade.approved_at = now()
        trade.approved_by = request.user
        trade.status = new_status

    elif new_status == 'order_placed':
        trade.order_placed_at = now()
        trade.status = new_status

    elif new_status == 'fills_received':
        if trade.fills_recivied_for+ int(request.data.get("fills_received_for")) > trade.lots:
            return Response({"error": "Cannot exceed total lots."}, status=status.HTTP_400_BAD_REQUEST)
        trade.fills_recivied_for = trade.fills_recivied_for+int(request.data.get("fills_received_for"))
        trade.fills_received_of = request.data.get("fills_received_of")
        trade.fills_received_at = now()

    # trade.status = new_status
    trade.save()

    # Notify all connected clients in the 'trades' group via WebSocket
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        'trades', # Send to the general 'trades' group
        {
            'type': 'trade_update', # <-- Consistent message type
            'trade': TradeSerializer(trade).data,
        }
    )

    return Response(TradeSerializer(trade).data)

@api_view(['GET'])
def get_availabilities(request):
    search = request.GET.get('search', '').strip().lower()
    qs = Availability.objects.filter(is_available=True).select_related('commodity', 'contract_month')

    if search:
        keywords = search.split()

        for kw in keywords:
            qs = qs.filter(
                Q(commodity__name__icontains=kw) |
                Q(commodity__code__icontains=kw) |
                Q(contract_month__label__icontains=kw)
            )

    data = [
        {
            "id": a.id,
            "commodity_name": a.commodity.name,
            "commodity_code": a.commodity.code,
            "contract_label": a.contract_month.label,
        }
        for a in qs.distinct()[:20]  # limit to 20 results for speed
    ]

    return Response(data)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_close(request, trade_id):
    try:
        trade = Trade.objects.get(id=trade_id)
    except Trade.DoesNotExist:
        return Response({"error": "Trade not found."}, status=status.HTTP_404_NOT_FOUND)


    if trade.is_closed:
        return Response({"error": "Request is already sent."}, status=status.HTTP_400_BAD_REQUEST)

    trade.close_requested_at = now()
    trade.is_closed = True
    trade.save()

    # Notify all connected clients in the 'trades' group via WebSocket
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        'trades', # Send to the general 'trades' group
        {
            'type': 'trade_update', # <-- Consistent message type
            'trade': TradeSerializer(trade).data,
        }
    )

    return Response(TradeSerializer(trade).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_trades(request):
    trades = Trade.objects.filter(trader=request.user).order_by('-created_at')
    serializer = TradeSerializer(trades, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def pending_close_requests(request):
    trades = Trade.objects.filter(is_closed=True, close_accepted=False).order_by('-close_requested_at')
    serializer = TradeSerializer(trades, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([permissions.IsAdminUser])
def accept_close(request, trade_id):
    try:
        trade = Trade.objects.get(id=trade_id)
    except Trade.DoesNotExist:
        return Response({"error": "Trade not found."}, status=status.HTTP_404_NOT_FOUND)

    if not trade.is_closed or trade.close_accepted:
        return Response({"error": "Invalid close request."}, status=status.HTTP_400_BAD_REQUEST)

    trade.close_accepted = True
    trade.save()

    # WebSocket notification to all managers
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        'trades',
        {
            'type': 'trade_update',
            'trade': TradeSerializer(trade).data
        }
    )

    return Response(TradeSerializer(trade).data)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def closed_trades(request):
    trades = Trade.objects.filter(is_closed=True, close_accepted=True).order_by('-fills_received_at')
    serializer = TradeSerializer(trades, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def set_settlement_price(request, pk):
    try:
        trade = Trade.objects.get(pk=pk)

        if not request.user.is_staff:  # or custom manager check
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        settlement_price = request.data.get("settlement_price")
        if settlement_price is None:
            return Response({"error": "Settlement price required"}, status=status.HTTP_400_BAD_REQUEST)

        trade.settlement_price = float(settlement_price)
        trade.calculate_profit()

        return Response({"message": "Settlement price set", "profit": trade.profit}, status=status.HTTP_200_OK)

    except Trade.DoesNotExist:
        return Response({"error": "Trade not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_profit(request, trade_id):
    trade = get_object_or_404(Trade, id=trade_id)
    
    initial_data = {
        'trade': trade.id,
        'entry': trade.price,
        **request.data
    }

    serializer = ProfitSerializer(data=initial_data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_profit(request, pk):
    profit_instance = get_object_or_404(Profit, id=pk)

    data_to_update = {}
    if 'exit_price' in request.data:
        data_to_update['exit_price'] = request.data['exit_price']
    if 'settlement_price_unbooked' in request.data:
        data_to_update['settlement_price_unbooked'] = request.data['settlement_price_unbooked']
    if 'exit_price' in request.data:
        data_to_update['exit_price'] = request.data['exit_price']
    if 'settlement_price_unbooked' in request.data:
        data_to_update['settlement_price_unbooked'] = request.data['settlement_price_unbooked']

    serializer = ProfitSerializer(profit_instance, data=data_to_update, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()

    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_exit(request):
    try:
        trade = Trade.objects.get(id=request.data.get("trade"))
    except Trade.DoesNotExist:
        return Response({"error": "Trade not found."}, status=status.HTTP_404_NOT_FOUND)

    if trade.trader != request.user:
        return Response({"error": "Not allowed to exit this trade."}, status=status.HTTP_403_FORBIDDEN)

    serializer = ExitSerializer(data=request.data)
    if serializer.is_valid():
        exit_obj = serializer.save()
        
        # Notify via WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'trade_{trade.id}',  # or just 'trades' group if global
            {
                'type': 'exit_created',
                'exit': ExitSerializer(exit_obj).data
            }
        )

        return Response(ExitSerializer(exit_obj).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_exit_requests(request):
    exits = Exit.objects.filter(user=request.user).order_by('-created_at')
    serializer = ExitSerializer(exits, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_exit_status(request, exit_id):
    try:
        exit_obj = Exit.objects.get(id=exit_id)
    except Exit.DoesNotExist:
        return Response({"error": "Exit not found."}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get("status")
    valid_statuses = ['approved', 'rejected', 'executed']

    if new_status not in valid_statuses:
        return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

    if new_status == 'approved':
        exit_obj.status = 'approved'
        exit_obj.approved_by = request.user
        exit_obj.approved_at = now()

    elif new_status == 'rejected':
        exit_obj.status = 'rejected'
        exit_obj.rejected_by = request.user
        exit_obj.rejected_at = now()
        exit_obj.rejected_reason = request.data.get("rejected_reason", "")

    elif new_status == 'executed':
        exit_obj.status = 'executed'
        exit_obj.executed_at = now()
        exit_obj.executed_price = request.data.get("executed_price")

    exit_obj.save()

    # WebSocket notify
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'trade_{exit_obj.trade.id}',  # or 'trades' if global
        {
            'type': 'exit_update',
            'exit': ExitSerializer(exit_obj).data
        }
    )

    return Response(ExitSerializer(exit_obj).data)
