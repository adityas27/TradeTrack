from rest_framework import generics, permissions
from .models import Trade
from .serializers import TradeSerializer
from rest_framework.response import Response
from rest_framework import status
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from rest_framework.decorators import api_view, permission_classes
from django.utils.timezone import now


class CreateTradeView(generics.CreateAPIView):
    serializer_class = TradeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        print(request.data)  # Debugging line to see incoming data
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
            'trades',
            {
                'type': 'send_trade',
                'trade': TradeSerializer(trade).data
            }
        )

class ManagerTradeListView(generics.ListAPIView):
    serializer_class = TradeSerializer
    permission_classes = [permissions.IsAdminUser]  # or custom permission for managers

    def get_queryset(self):
        return Trade.objects.all().order_by('-created_at')

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

    # Set timestamps
    if new_status == 'approved':
        trade.approved_at = now()
        trade.approved_by = request.user
    elif new_status == 'order_placed':
        trade.order_placed_at = now()
    elif new_status == 'fills_received':
        trade.fills_received_at = now()

    trade.status = new_status
    trade.save()

    # Notify the trader via WebSocket
    channel_layer = get_channel_layer()
    group_name = f"user_{trade.trader.id}"

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            'type': 'send_trade_update',
            'trade': TradeSerializer(trade).data,
        }
    )

    return Response(TradeSerializer(trade).data)