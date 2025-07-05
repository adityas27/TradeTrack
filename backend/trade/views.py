from rest_framework import generics, permissions
from .models import Trade
from .serializers import TradeSerializer
from rest_framework.response import Response
from rest_framework import status
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

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
