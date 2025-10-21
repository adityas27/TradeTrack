from decimal import Decimal
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from django.db.models import Prefetch, Sum
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.utils import timezone

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Trade, Availability, Exit
from .serializers import (
    TradeSerializer,
    ExitSerializer,
    NestedExitSerializer,
    TradeWithExitsSerializer,
    TradeExitDetailSerializer
)


def notify_trade_update(trade: Trade):
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


def notify_exit_update(exit_obj: Exit):
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
    serializer = TradeSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        trade = serializer.save(trader=request.user, status='pending')
        notify_trade_update(trade)
        return Response(TradeSerializer(trade).data, status=status.HTTP_201_CREATED)
    print(serializer.errors)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TradePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class ManagerTradeListView(generics.ListAPIView):
    queryset = Trade.objects.all().order_by('-created_at')
    serializer_class = TradeSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = TradePagination


class UserTradeListView(generics.ListAPIView):
    serializer_class = TradeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Trade.objects.filter(trader=self.request.user).order_by('-created_at')


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_trade_status(request, trade_id):
    """
    Update trade status with proper transitions and timestamps.
    """
    trade = get_object_or_404(Trade, id=trade_id)
    new_status = request.data.get("status")

    valid_statuses = ['pending', 'approved', 'order_placed', 'fills_received', 'partial_fills_received']
    if new_status not in valid_statuses:
        return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

    # Approvals only by staff
    if new_status == 'approved' and not request.user.is_staff:
        return Response({"error": "Insufficient permissions to approve trades."}, status=status.HTTP_403_FORBIDDEN)

    # Enforce transitions
    if new_status == 'approved':
        if trade.status not in ['pending']:
            return Response({"error": "Trade can only move to approved from pending."}, status=status.HTTP_400_BAD_REQUEST)
        trade.approved_at = timezone.now()
        trade.approved_by = request.user
        trade.status = 'approved'

    elif new_status == 'order_placed':
        if trade.status not in ['approved']:
            return Response({"error": "Trade must be approved before placing order."}, status=status.HTTP_400_BAD_REQUEST)
        trade.order_placed_at = timezone.now()
        trade.status = 'order_placed'

    elif new_status in ['fills_received', 'partial_fills_received']:
        if trade.status not in ['order_placed', 'partial_fills_received']:
            return Response({"error": "Order must be placed before receiving fills."}, status=status.HTTP_400_BAD_REQUEST)
        # Accept client intention, timestamp when first time we mark fills
        if trade.fills_received_at is None:
            trade.fills_received_at = timezone.now()
        trade.status = new_status

    elif new_status == 'pending':
        # Allow reset to pending only for admins
        if not request.user.is_staff:
            return Response({"error": "Only admins can reset to pending."}, status=status.HTTP_403_FORBIDDEN)
        trade.status = 'pending'
        trade.approved_at = None
        trade.approved_by = None
        trade.order_placed_at = None
        trade.fills_received_at = None

    trade.save()
    notify_trade_update(trade)
    return Response(TradeSerializer(trade).data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_trade_fills(request, trade_id):
    """
    Replace lots_and_price entries.
    Each entry must contain: lots, price, added_at, fills_received, stop_loss.
    This triggers pre_save to recompute avg_price and total_lots.
    Also updates status to partial_fills_received or fills_received depending on totals if order placed.
    """
    trade = get_object_or_404(Trade, id=trade_id)

    if trade.status not in ['approved', 'order_placed', 'partial_fills_received']:
        return Response({"error": "Cannot update fills for this trade status."}, status=status.HTTP_400_BAD_REQUEST)

    new_entries = request.data.get("lots_and_price")
    if new_entries is None:
        return Response({"error": "lots_and_price is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Validate via serializer field validation
    s = TradeSerializer(trade, data={'lots_and_price': new_entries}, partial=True, context={'request': request})
    if not s.is_valid():
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)

    trade.lots_and_price = new_entries
    trade.save()  # triggers pre_save to compute avg_price/total_lots

    # If order placed, update status based on fills
    if trade.status in ['order_placed', 'partial_fills_received']:
        total_requested_lots = sum(
            int(entry.get('lots', 0) or 0) 
            for entry in new_entries
        )
        
        # Calculate total received lots (sum of lots from fills_received arrays)
        total_received_lots = 0
        for entry in new_entries:
            fills_received = entry.get('fills_received', [])
            if isinstance(fills_received, list):
                entry_received_lots = sum(
                    int(fill.get('lots', 0) or 0) 
                    for fill in fills_received 
                    if isinstance(fill, dict)
                )
                total_received_lots += entry_received_lots

        # Update status based on received vs requested lots
        if total_received_lots == 0:
            # Keep status as order_placed
            pass
        elif 0 < total_received_lots < total_requested_lots:
            trade.status = 'partial_fills_received'
            if trade.fills_received_at is None:
                trade.fills_received_at = timezone.now()
        elif total_received_lots >= total_requested_lots:
            trade.status = 'fills_received'
            if trade.fills_received_at is None:
                trade.fills_received_at = timezone.now()
        
        trade.save()

    notify_trade_update(trade)
    return Response(TradeSerializer(trade).data)



@api_view(['GET'])
def get_availabilities(request):
    """
    Filter available Availability objects with optional params:
    - code (commodity code, case-insensitive)
    - start_month, start_year
    - end_month, end_year
    If no params: return up to 20 results.
    If any param provided: return up to 1 result for specific match behavior (as per your original view).
    """
    start_month = request.GET.get('start_month')
    end_month = request.GET.get('end_month')
    start_year = request.GET.get('start_year')
    end_year = request.GET.get('end_year')
    code = request.GET.get('code')

    qs = Availability.objects.filter(is_available=True).select_related('commodity', 'start_month', 'end_month')

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

    if not any([start_month, end_month, start_year, end_year, code]):
        qs = qs[:20]
    else:
        qs = qs[:1]

    data = [{
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
    } for a in qs]
    return Response(data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_close(request, trade_id):
    trade = get_object_or_404(Trade, id=trade_id, trader=request.user)
    if trade.is_closed:
        return Response({"error": "Request already sent."}, status=status.HTTP_400_BAD_REQUEST)
    trade.close_requested_at = now()
    trade.is_closed = True
    trade.save()
    notify_trade_update(trade)
    return Response(TradeSerializer(trade).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_trades(request):
    trades = Trade.objects.filter(trader=request.user).order_by('-created_at')
    serializer = TradeSerializer(trades, many=True, context={'request': request})
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
    trade = get_object_or_404(Trade, id=trade_id)
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
    """
    Create multiple exits in one request.
    """
    trade_id = request.data.get("trade")
    exits = request.data.get("exits")

    if not trade_id:
        return Response({"error": "Field 'trade' is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not isinstance(exits, list) or not exits:
        return Response({"error": "Field 'exits' must be a non-empty list."}, status=status.HTTP_400_BAD_REQUEST)

    # Trade + permission
    try:
        trade = Trade.objects.get(id=trade_id)
    except Trade.DoesNotExist:
        return Response({"error": "Trade not found."}, status=status.HTTP_404_NOT_FOUND)

    if trade.trader != request.user and not request.user.is_staff:
        return Response({"error": "Not allowed to exit this trade."}, status=status.HTTP_403_FORBIDDEN)

    # Optional: enforce a simple cap (comment out if not needed)
    # available = sum(int(leg.get("fills_received", 0) or 0) for leg in (trade.lots_and_price or []))
    # if sum(int(x.get("requested_exit_lots", 0) or 0) for x in exits) > available:
    #     return Response({"error": "Requested exits exceed available lots."}, status=status.HTTP_400_BAD_REQUEST)

    created = []
    with transaction.atomic():
        for item in exits:
            payload = {
                "trade": trade.id,
                "requested_exit_lots": item.get("requested_exit_lots"),
                "exit_price": item.get("exit_price"),
                "exit_initiated_by": request.user.id,
            }
            s = ExitSerializer(data=payload, context={"request": request})
            s.is_valid(raise_exception=True)
            obj = s.save(exit_initiated_by=request.user)
            notify_exit_update(obj)
            created.append(ExitSerializer(obj).data)

    return Response({"trade": trade.id, "created": created}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_exit_requests(request):
    trades = Trade.objects.filter(
        trader=request.user,
        is_closed=False
    ).prefetch_related(
        Prefetch('exits', queryset=Exit.objects.order_by('-requested_at'))
    ).order_by('-created_at')

    serializer = TradeWithExitsSerializer(trades, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def exit_request_detail(request, id):
    trade = Trade.objects.get(id=id)
    exits = Exit.objects.filter(trade=trade)
    if trade.trader == request.user:
        serializer = TradeExitDetailSerializer(exits, many=True)
        return Response(serializer.data)
    else:
        return Response({'error':'Request is forbidden as the wrong user is requesting the resources'},status=status.HTTP_403_FORBIDDEN)


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def all_exit_requests(request):
    trades = Trade.objects.filter(
        is_closed=False, exits__isnull=False
    ).prefetch_related(
        Prefetch('exits', queryset=Exit.objects.order_by('-requested_at'))
    ).distinct().order_by('-created_at')
    
    serializer = TradeWithExitsSerializer(trades, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_exit_status(request, exit_id):
    exit_obj = get_object_or_404(Exit, pk=exit_id)

    # Permissions: owner trader or staff can update
    if exit_obj.trade.trader != request.user and not request.user.is_staff:
        return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

    new_status = request.data.get("exit_status")
    received_lots = request.data.get("recieved_lots", None)

    if new_status == 'approved':
        exit_obj.exit_status = 'approved'
        exit_obj.exit_approved_by = request.user
        exit_obj.approved_at = now()

    elif new_status == 'order_placed':
        exit_obj.exit_status = 'order_placed'
        exit_obj.order_placed_at = now()

    elif new_status in ['filled', 'partial_filled']:
        if received_lots is None:
            return Response({"error": "recieved_lots is required for fill updates."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            received_lots = int(received_lots)
        except Exception:
            return Response({"error": "recieved_lots must be integer."}, status=status.HTTP_400_BAD_REQUEST)
        if received_lots > exit_obj.requested_exit_lots:
            return Response({"error": "Received lots cannot exceed requested exit lots."}, status=status.HTTP_400_BAD_REQUEST)
        exit_obj.recieved_lots = received_lots
        exit_obj.filled_at = now()
        # status and profit_loss will be adjusted by signals; however we set an initial intent:
        exit_obj.exit_status = new_status

    elif new_status in ['rejected', 'cancelled']:
        exit_obj.exit_status = new_status

    else:
        return Response({"error": "Invalid exit_status."}, status=status.HTTP_400_BAD_REQUEST)

    exit_obj.save()
    notify_exit_update(exit_obj)
    serializer = NestedExitSerializer(exit_obj)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def add_lots_to_trade(request, trade_id):
    """
    Append a new entry to lots_and_price with fields:
      lots (int), price (number), added_at (ISO string), fills_received (int), stop_loss (number)
    Does not recompute avg/total manually; model signals handle it.
    """
    trade = get_object_or_404(Trade, id=trade_id, trader=request.user)
    payload = request.data or {}
    required = ['lots', 'price', 'added_at', 'fills_received', 'stop_loss']
    for entry in payload["lots_and_price"]:
        for key in required:
            if key not in entry:
                return Response({"error": f"{key} is required."}, status=status.HTTP_400_BAD_REQUEST)

    new_list = payload["lots_and_price"]

    s = TradeSerializer(trade, data={'lots_and_price': new_list}, partial=True, context={'request': request})
    if not s.is_valid():
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)

    trade.lots_and_price = new_list
    if trade.status == "fills_received":
        trade.status = "partial_fills_received"
    trade.save()
    notify_trade_update(trade)
    return Response(TradeSerializer(trade).data, status=status.HTTP_200_OK)
