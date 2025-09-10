import json
from channels.generic.websocket import AsyncWebsocketConsumer

class SpreadsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Join the 'spreads' group to receive all spread updates
        await self.channel_layer.group_add("spreads", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("spreads", self.channel_name)

    async def spread_update(self, event):
        await self.send(text_data=json.dumps({
            'type': event['type'],
            'spread': event['spread']
        }))

    async def spreads_exit_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'spreads_exit_update',
            'exit': event['exit']
        }))