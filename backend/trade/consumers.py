import json
from channels.generic.websocket import AsyncWebsocketConsumer

class TradeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("trades", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("trades", self.channel_name)

    async def send_trade(self, event):
        await self.send(text_data=json.dumps(event["trade"]))
