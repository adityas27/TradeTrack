import json
from channels.generic.websocket import AsyncWebsocketConsumer

class TradeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Join the 'trades' group to receive all trade updates
        await self.channel_layer.group_add("trades", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("trades", self.channel_name)

    # This method will handle messages with 'type': 'trade_update'
    async def trade_update(self, event):
        # Send the received 'trade' data to the WebSocket
        # The 'event' dictionary from channel_layer.group_send contains 'type' and 'trade'
        await self.send(text_data=json.dumps({
            'type': event['type'], # This will be 'trade_update'
            'trade': event['trade'] # This is the serialized trade object
        }))