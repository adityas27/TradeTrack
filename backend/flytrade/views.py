
from decimal import Decimal
from django.db import transaction
from django.db.models import Prefetch, Sum, Q
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Leg, Spreads, SpreadsExit, Availability
from .serializers import (
    LegSerializer, SpreadsSerializer, SpreadsExitSerializer, 
    SpreadsWithExitsSerializer
)

# WebSocket notification functions
def notify_spread_update(spread: Spreads):
    """Notify about spread updates via WebSocket"""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'spreads',
            {
                'type': 'spread_update',
                'spread': SpreadsSerializer(spread).data
            }
        )
    except Exception as e:
        print(f"WebSocket notification failed for spread {spread.id}: {e}")

def notify_spread_exit_update(exit_obj: SpreadsExit):
    """Notify about spread exit updates via WebSocket"""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'spread_{exit_obj.spread.id}',
            {
                'type': 'spread_exit_update',
                'exit': SpreadsExitSerializer(exit_obj).data
            }
        )
    except Exception as e:
        print(f"WebSocket notification failed for spread exit {exit_obj.id}: {e}")

class SpreadsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

# LEG VIEWS
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_leg(request):
    """Create a new leg for spread trading"""
    serializer = LegSerializer(data=request.data)
    if serializer.is_valid():
        leg = serializer.save(trader=request.user)
        return Response(LegSerializer(leg).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def add_lots_to_leg(request, leg_id):
    """Add lots to existing leg"""
    leg = get_object_or_404(Leg, id=leg_id, trader=request.user)

    new_entries = request.data.get("lots_and_price", [])
    if not isinstance(new_entries, list):
        return Response({"error": "lots_and_price must be a list."}, status=status.HTTP_400_BAD_REQUEST)

    # Validate new entries
    serializer = LegSerializer(leg, data={'lots_and_price': new_entries}, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    leg.lots_and_price = new_entries
    leg.save()

    return Response(LegSerializer(leg).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_legs(request):
    """Get user's legs"""
    legs = Leg.objects.filter(trader=request.user).order_by('-created_on')
    serializer = LegSerializer(legs, many=True)
    return Response(serializer.data)

# SPREADS VIEWS
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_spread(request):
    """Create a new spread (fly or custom)"""
    serializer = SpreadsSerializer(data=request.data)
    if serializer.is_valid():
        spread = serializer.save(trader=request.user, status='pending')
        notify_spread_update(spread)
        return Response(SpreadsSerializer(spread).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ManagerSpreadListView(generics.ListAPIView):
    """Manager view to list all spreads"""
    serializer_class = SpreadsSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = SpreadsPagination

    def get_queryset(self):
        return Spreads.objects.select_related('trader', 'approved_by').prefetch_related('legs').order_by('-created_at')

class UserSpreadListView(generics.ListAPIView):
    """User view to list their own spreads"""
    serializer_class = SpreadsSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = SpreadsPagination

    def get_queryset(self):
        return Spreads.objects.filter(trader=self.request.user).select_related('approved_by').prefetch_related('legs').order_by('-created_at')

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_spread_status(request, spread_id):
    """Update spread status with proper transitions and timestamps"""
    spread = get_object_or_404(Spreads, id=spread_id)
    new_status = request.data.get("status")

    valid_statuses = ['pending', 'approved', 'order_placed', 'fills_received', 'partial_fills_received']
    if new_status not in valid_statuses:
        return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

    # Approvals only by staff
    if new_status == 'approved' and not request.user.is_staff:
        return Response({"error": "Insufficient permissions to approve spreads."}, status=status.HTTP_403_FORBIDDEN)

    # Enforce transitions
    if new_status == 'approved':
        if spread.status not in ['pending']:
            return Response({"error": "Spread can only move to approved from pending."}, status=status.HTTP_400_BAD_REQUEST)
        spread.approved_at = now()
        spread.approved_by = request.user
        spread.status = 'approved'
    elif new_status == 'order_placed':
        if spread.status not in ['approved']:
            return Response({"error": "Spread must be approved before placing order."}, status=status.HTTP_400_BAD_REQUEST)
        spread.order_placed_at = now()
        spread.status = 'order_placed'
    elif new_status in ['fills_received', 'partial_fills_received']:
        if spread.status not in ['order_placed', 'partial_fills_received']:
            return Response({"error": "Order must be placed before receiving fills."}, status=status.HTTP_400_BAD_REQUEST)
        if spread.fills_received_at is None:
            spread.fills_received_at = now()
        spread.status = new_status
    elif new_status == 'pending':
        # Allow reset to pending only for admins
        if not request.user.is_staff:
            return Response({"error": "Only admins can reset to pending."}, status=status.HTTP_403_FORBIDDEN)
        spread.status = 'pending'
        spread.approved_at = None
        spread.approved_by = None
        spread.order_placed_at = None
        spread.fills_received_at = None

    spread.save()
    notify_spread_update(spread)

    return Response(SpreadsSerializer(spread).data)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_spread_fills(request, spread_id):
    """Update fills for spread legs"""
    spread = get_object_or_404(Spreads, id=spread_id)

    if spread.status not in ['approved', 'order_placed', 'partial_fills_received']:
        return Response({"error": "Cannot update fills for this spread status."}, status=status.HTTP_400_BAD_REQUEST)

    leg_id = request.data.get("leg_id")
    new_entries = request.data.get("lots_and_price")

    if not leg_id or not new_entries:
        return Response({"error": "leg_id and lots_and_price are required."}, status=status.HTTP_400_BAD_REQUEST)

    # Get the leg and validate it belongs to this spread
    leg = get_object_or_404(Leg, id=leg_id, trader=spread.trader)
    if leg not in spread.legs.all():
        return Response({"error": "Leg does not belong to this spread."}, status=status.HTTP_400_BAD_REQUEST)

    # Validate via serializer
    leg_serializer = LegSerializer(leg, data={'lots_and_price': new_entries}, partial=True)
    if not leg_serializer.is_valid():
        return Response(leg_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    leg.lots_and_price = new_entries
    leg.save()

    # Recalculate spread totals
    total_lots = 0
    total_weighted_price = 0

    for spread_leg in spread.legs.all():
        for entry in spread_leg.lots_and_price:
            fills = entry.get('fills_received', 0)
            if fills > 0:
                total_lots += fills
                total_weighted_price += fills * entry.get('price', 0)

    spread.total_lots = total_lots
    spread.avg_price = total_weighted_price / total_lots if total_lots > 0 else 0

    # Update status based on fills
    if spread.status in ['order_placed', 'partial_fills_received']:
        # Determine if we have partial or complete fills
        total_requested_lots = sum(
            sum(entry.get('lots', 0) for entry in leg.lots_and_price)
            for leg in spread.legs.all()
        )

        if 0 < total_lots < total_requested_lots:
            spread.status = 'partial_fills_received'
            if spread.fills_received_at is None:
                spread.fills_received_at = now()
        elif total_lots >= total_requested_lots:
            spread.status = 'fills_received'
            if spread.fills_received_at is None:
                spread.fills_received_at = now()

    spread.save()
    notify_spread_update(spread)

    return Response(SpreadsSerializer(spread).data)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_spread_close(request, spread_id):
    """Request to close a spread"""
    spread = get_object_or_404(Spreads, id=spread_id, trader=request.user)

    if spread.is_closed:
        return Response({"error": "Close request already sent."}, status=status.HTTP_400_BAD_REQUEST)

    spread.close_requested_at = now()
    spread.is_closed = True
    spread.save()

    notify_spread_update(spread)
    return Response(SpreadsSerializer(spread).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_spreads(request):
    """Get user's spreads with legs"""
    spreads = Spreads.objects.filter(trader=request.user).prefetch_related('legs').order_by('-created_at')
    serializer = SpreadsSerializer(spreads, many=True)
    return Response(serializer.data)

# SPREADS EXIT VIEWS
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_spread_exit(request):
    """Create multiple spread exits in one request"""
    spread_id = request.data.get("spread")
    exits = request.data.get("exits")

    if not spread_id:
        return Response({"error": "Field 'spread' is required."}, status=status.HTTP_400_BAD_REQUEST)

    if not isinstance(exits, list) or not exits:
        return Response({"error": "Field 'exits' must be a non-empty list."}, status=status.HTTP_400_BAD_REQUEST)

    # Get spread and validate permission
    try:
        spread = Spreads.objects.get(id=spread_id)
    except Spreads.DoesNotExist:
        return Response({"error": "Spread not found."}, status=status.HTTP_404_NOT_FOUND)

    if spread.trader != request.user and not request.user.is_staff:
        return Response({"error": "Not allowed to exit this spread."}, status=status.HTTP_403_FORBIDDEN)

    created = []
    with transaction.atomic():
        for item in exits:
            payload = {
                "spread": spread.id,
                "requested_exit_lots": item.get("requested_exit_lots"),
                "exit_price": item.get("exit_price"),
            }

            serializer = SpreadsExitSerializer(data=payload)
            serializer.is_valid(raise_exception=True)
            obj = serializer.save(exit_initiated_by=request.user)
            notify_spread_exit_update(obj)
            created.append(SpreadsExitSerializer(obj).data)

    return Response({"spread": spread.id, "created": created}, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_spread_exit_requests(request):
    """Get user's spread exit requests"""
    spreads = Spreads.objects.filter(
        trader=request.user,
        is_closed=False
    ).prefetch_related(
        Prefetch('exit_events', queryset=SpreadsExit.objects.order_by('-requested_at'))
    ).order_by('-created_at')

    serializer = SpreadsWithExitsSerializer(spreads, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def all_spread_exit_requests(request):
    """Get all spread exit requests for managers"""
    spreads = Spreads.objects.filter(
        is_closed=False
    ).prefetch_related(
        Prefetch('exit_events', queryset=SpreadsExit.objects.order_by('-requested_at'))
    ).order_by('-created_at')

    serializer = SpreadsWithExitsSerializer(spreads, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_spread_exit_status(request, exit_id):
    """Update spread exit status"""
    exit_obj = get_object_or_404(SpreadsExit, pk=exit_id)

    # Permissions: owner trader or staff can update
    if exit_obj.spread.trader != request.user and not request.user.is_staff:
        return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

    new_status = request.data.get("exit_status")
    received_lots = request.data.get("received_lots", None)

    if new_status == 'approved':
        exit_obj.exit_status = 'approved'
        exit_obj.exit_approved_by = request.user
        exit_obj.approved_at = now()
    elif new_status == 'order_placed':
        exit_obj.exit_status = 'order_placed'
        exit_obj.order_placed_at = now()
    elif new_status in ['filled', 'partial_filled']:
        if received_lots is None:
            return Response({"error": "received_lots is required for fill updates."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            received_lots = int(received_lots)
        except (ValueError, TypeError):
            return Response({"error": "received_lots must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        if received_lots > exit_obj.requested_exit_lots:
            return Response({"error": "Received lots cannot exceed requested exit lots."}, status=status.HTTP_400_BAD_REQUEST)

        exit_obj.received_lots = received_lots
        exit_obj.filled_at = now()
        exit_obj.exit_status = new_status
    elif new_status in ['rejected', 'cancelled']:
        exit_obj.exit_status = new_status
    else:
        return Response({"error": "Invalid exit_status."}, status=status.HTTP_400_BAD_REQUEST)

    exit_obj.save()
    notify_spread_exit_update(exit_obj)

    return Response(SpreadsExitSerializer(exit_obj).data)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def pending_spread_close_requests(request):
    """Get pending spread close requests for managers"""
    spreads = Spreads.objects.filter(is_closed=True, close_accepted=False).order_by('-close_requested_at')
    serializer = SpreadsSerializer(spreads, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([permissions.IsAdminUser])
def accept_spread_close(request, spread_id):
    """Accept spread close request"""
    spread = get_object_or_404(Spreads, id=spread_id)

    if not spread.is_closed or spread.close_accepted:
        return Response({"error": "Invalid close request."}, status=status.HTTP_400_BAD_REQUEST)

    spread.close_accepted = True
    spread.save()

    notify_spread_update(spread)
    return Response(SpreadsSerializer(spread).data)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def closed_spreads(request):
    """Get closed and accepted spreads"""
    spreads = Spreads.objects.filter(is_closed=True, close_accepted=True).order_by('-fills_received_at')
    serializer = SpreadsSerializer(spreads, many=True)
    return Response(serializer.data)
