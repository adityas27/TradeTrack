import json # Not directly used here, but good to have if you debug with json.dumps
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.utils.timezone import now
from rest_framework.pagination import PageNumberPagination
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from decimal import Decimal

from .models import Trade, Availability, Exit, Commodity, Settlement
from django.db.models import Q
from .serializers import TradeSerializer, ExitSerializer, NestedExitSerializer, TradeWithExitsSerializer
from django.db.models import Prefetch
from django.utils import timezone
from django.shortcuts import get_object_or_404

def notify_trade_update(trade):
    """Helper function to send trade updates via WebSocket"""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'trades',
            {
                'type': 'trade_update',
                'trade': TradeSerializer(trade).data
            }
        )
    except Exception as e:
        print(f"WebSocket notification failed for trade {trade.id}: {e}")

def notify_exit_update(exit_obj):
    """Helper function to send exit updates via WebSocket"""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'trade_{exit_obj.trade.id}',
            {
                'type': 'exit_update',
                'exit': ExitSerializer(exit_obj).data
            }
        )
    except Exception as e:
        print(f"WebSocket notification failed for exit {exit_obj.id}: {e}")
        
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_trade(request):
    """
    Function-based view to create a new Trade.
    """
    serializer = TradeSerializer(data=request.data)
    if serializer.is_valid():
        # Explicitly set status to 'pending' for new trades
        trade = serializer.save(trader=request.user, status='pending')
        notify_trade_update(trade)
        return Response(TradeSerializer(trade).data, status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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

    if new_status not in ['approved', 'order_placed']:
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

    trade.save()
    notify_trade_update(trade)

    return Response(TradeSerializer(trade).data)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_fills_received(request, trade_id):
    """Update fills received for a trade - status will be updated by signals"""
    try:
        trade = Trade.objects.get(id=trade_id)
    except Trade.DoesNotExist:
        return Response({"error": "Trade not found."}, status=status.HTTP_404_NOT_FOUND)

    fills_received_for = int(request.data.get("fills_received_for"))
    fills_received_of = request.data.get("fills_received_of")

    if trade.fills_recivied_for + fills_received_for > trade.lots:
        return Response({"error": "Cannot exceed total lots."}, status=status.HTTP_400_BAD_REQUEST)

    trade.fills_recivied_for = trade.fills_recivied_for + fills_received_for
    trade.fills_received_of = fills_received_of
    trade.fills_received_at = now()
    
    # Status will be automatically updated by signals based on fills_recivied_for
    trade.save()
    notify_trade_update(trade)

    return Response(TradeSerializer(trade).data)

@api_view(['GET'])
def get_availabilities(request):
    # Get the 5 parameters from query string
    start_month = request.GET.get('start_month')
    end_month = request.GET.get('end_month')
    start_year = request.GET.get('start_year')
    end_year = request.GET.get('end_year')
    code = request.GET.get('code')
    
    # Start with base queryset
    qs = Availability.objects.filter(is_available=True).select_related(
        'commodity', 'start_month', 'end_month'
    )
    
    # Apply filters based on provided parameters
    if code:
        qs = qs.filter(commodity__code__iexact=code)
    
    if start_month and start_year:
        try:
            qs = qs.filter(start_month__month__iexact=start_month, start_month__year=int(start_year))
        except ValueError:
            return Response({"error": "Invalid start year format"}, status=status.HTTP_400_BAD_REQUEST)
    
    if end_month and end_year:
        try:
            qs = qs.filter(end_month__month__iexact=end_month, end_month__year=int(end_year))
        except ValueError:
            return Response({"error": "Invalid end year format"}, status=status.HTTP_400_BAD_REQUEST)
    
    # If no parameters provided, return all available availabilities
    if not any([start_month, end_month, start_year, end_year, code]):
        qs = qs[:20]  # limit to 20 results for speed
    else:
        # If specific parameters provided, get exact match (single availability)
        qs = qs[:1]  # limit to 1 result for exact match
    
    data = [
        {
            "id": a.id,
            "commodity_name": a.commodity.name,
            "commodity_code": a.commodity.code,
            "start_month": a.start_month.month if a.start_month else "N/A",
            "start_year": a.start_month.year if a.start_month else "N/A",
            "end_month": a.end_month.month if a.end_month else "N/A",
            "end_year": a.end_month.year if a.end_month else "N/A",
            "period_display": f"{a.start_month.month}{a.start_month.year} to {a.end_month.month}{a.end_month.year}" if a.start_month and a.end_month else "N/A",
            "settlement_price": a.settlement_price,
            "is_available": a.is_available,
        }
        for a in qs
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
    notify_trade_update(trade)

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
    notify_trade_update(trade)

    return Response(TradeSerializer(trade).data)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def closed_trades(request):
    trades = Trade.objects.filter(is_closed=True, close_accepted=True).order_by('-fills_received_at')
    serializer = TradeSerializer(trades, many=True)
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
    data = request.data.copy()
    data['exit_initiated_by'] = request.user.id
    serializer = ExitSerializer(data=data)
    if serializer.is_valid():
        exit_obj = serializer.save(exit_initiated_by=request.user)
        notify_exit_update(exit_obj)
        return Response(ExitSerializer(exit_obj).data, status=status.HTTP_201_CREATED)
    print(serializer.errors)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_exit_requests(request):
    # Prefetch all exit events for the user's trades to reduce database queries
    trades = Trade.objects.filter(
        trader=request.user,
        is_closed=False
    ).prefetch_related(
        Prefetch('exit_events', queryset=Exit.objects.order_by('-requested_at'))
    ).order_by('-created_at')

    # Use the new serializer that groups exits by trade
    serializer = TradeWithExitsSerializer(trades, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def all_exit_requests(request):
    # Prefetch all exit events for all trades
    trades = Trade.objects.filter(
        is_closed=False
    ).prefetch_related(
        Prefetch('exit_events', queryset=Exit.objects.order_by('-requested_at'))
    ).order_by('-created_at')

    # Use the new serializer that groups exits by trade
    serializer = TradeWithExitsSerializer(trades, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_exit_status(request, exit_id):
    exit_obj = get_object_or_404(Exit, pk=exit_id)

    new_status = request.data.get("exit_status")
    received_lots = request.data.get("recieved_lots", 0)
    
    if new_status == 'approved':
        exit_obj.exit_status = 'approved'
        exit_obj.exit_approved_by = request.user
        exit_obj.approved_at = now()
    elif new_status == 'order_placed':
        exit_obj.exit_status = 'order_placed'
        exit_obj.order_placed_at = now()
    elif new_status in ['filled', 'partial_filled']:
        if received_lots > exit_obj.requested_exit_lots:
            return Response({"error": "Received lots cannot exceed requested exit lots."}, status=status.HTTP_400_BAD_REQUEST)
          
        exit_obj.recieved_lots = int(received_lots)
        exit_obj.filled_at = now()
        # Status, is_closed, and profit_loss will be calculated by signals
    elif new_status in ['rejected', 'cancelled']:
        exit_obj.exit_status = new_status

    exit_obj.save()
    notify_exit_update(exit_obj)

    # Serialize the updated single exit object with the nested serializer
    # This assumes the frontend can handle an individual exit update
    serializer = NestedExitSerializer(exit_obj)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def add_lots_to_trade(request, trade_id):
    """
    Trader can add new lots at any price.
    The new lots are added to the existing lots and price is averaged.
    Formula: ((new_lots * new_price) + (old_lots * old_price)) / total_lots
    """
    try:
        trade = Trade.objects.get(id=trade_id, trader=request.user)
    except Trade.DoesNotExist:
        return Response({"error": "Trade not found or not allowed."}, status=status.HTTP_404_NOT_FOUND)

    new_lots = request.data.get("new_lots")
    new_price = request.data.get("new_price")

    if not new_lots or not new_price:
        return Response({"error": "new_lots and new_price are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        new_lots = int(new_lots)
        new_price = Decimal(str(new_price))
    except Exception:
        return Response({"error": "Invalid lots or price."}, status=status.HTTP_400_BAD_REQUEST)

    if new_lots <= 0:
        return Response({"error": "new_lots must be positive."}, status=status.HTTP_400_BAD_REQUEST)

    old_lots = trade.lots
    old_price = trade.price

    total_lots = old_lots + new_lots
    avg_price = ((new_lots * new_price) + (old_lots * old_price)) / total_lots

    trade.lots = total_lots
    trade.price = avg_price
    trade.save()
    notify_trade_update(trade)

    return Response(TradeSerializer(trade).data, status=status.HTTP_200_OK)
