from decimal import Decimal
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Spreads, SpreadsExit
from .serializers import (
    SpreadsSerializer,
    SpreadsExitSerializer,
    SpreadsWithExitsSerializer
)

def notify_spreads_update(spread: Spreads):
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

def notify_spreads_exit_update(exit_obj: SpreadsExit):
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'spread_{exit_obj.spread.id}',
            {
                'type': 'spreads_exit_update',
                'exit': SpreadsExitSerializer(exit_obj).data
            }
        )
    except Exception as e:
        print(f"WebSocket notification failed for exit {exit_obj.id}: {e}")

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_spread(request):
    serializer = SpreadsSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        spread = serializer.save(trader=request.user, status='pending')
        notify_spreads_update(spread)
        return Response(SpreadsSerializer(spread).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_spreads_exit(request):
    """
    Create an exit request for a given spread.
    """
    spread_id = request.data.get("spread")
    if not spread_id:
        return Response({"error": "Field 'spread' is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        spread = Spreads.objects.get(id=spread_id)
    except Spreads.DoesNotExist:
        return Response({"error": "Spread not found."}, status=status.HTTP_404_NOT_FOUND)
    
    # Permission check: either trader owns the spread or a manager.
    if spread.trader != request.user and not request.user.is_staff:
        return Response({"error": "Not allowed to exit this spread."}, status=status.HTTP_403_FORBIDDEN)
    
    payload = {
        "spread": spread.id,
        "requested_exit_lots": request.data.get("requested_exit_lots"),
        "exit_price": request.data.get("exit_price"),
        "exit_initiated_by": request.user.id,
    }
    serializer = SpreadsExitSerializer(data=payload, context={"request": request})
    if serializer.is_valid():
        exit_obj = serializer.save(exit_initiated_by=request.user)
        notify_spreads_exit_update(exit_obj)
        return Response(SpreadsExitSerializer(exit_obj).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ManagerSpreadsListView(generics.ListAPIView):
    queryset = Spreads.objects.all().order_by('-created_at')
    serializer_class = SpreadsSerializer
    permission_classes = [permissions.IsAdminUser]

class UserSpreadsListView(generics.ListAPIView):
    serializer_class = SpreadsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Spreads.objects.filter(trader=self.request.user).order_by('-created_at')

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def spreads_with_exits(request):
    """
    Return spreads with their applied exit events.
    """
    if request.user.is_staff:
        spreads = Spreads.objects.all().order_by('-created_at')
    else:
        spreads = Spreads.objects.filter(trader=request.user).order_by('-created_at')
    serializer = SpreadsWithExitsSerializer(spreads, many=True)
    return Response(serializer.data)
