import { WebSocket, WebSocketServer } from 'ws';
import { App } from '@slack/bolt';

const CHANNEL_ID = process.env.SLACK_DEFAULT_CHANNEL;

type Message = {
  id: string
  name: string
  text: string
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

(async () => {
  const wss = new WebSocketServer({ port: 3030 });
  wss.on('connection', function connection(ws) {

    app.client.chat.postMessage({
      channel: CHANNEL_ID,
      text: 'New client connected'
    });

    ws.on('error', console.error);
    ws.on('message', function message(data) {
      console.log('received: %s', data);
      if (data) {
        const payload = JSON.parse(data.toString());
        console.log('text: ', payload.text);
        app.client.chat.postMessage({
          channel: CHANNEL_ID,
          text: payload.text,
          username: payload.name,
        });
        wss.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
            console.log(`sending to client: ${data}`);
            client.send(JSON.stringify(payload));
          }
        });
      }
    });
  });

  app.event('message', async ({ event, say }) => {
    if (!event.subtype) {
      const messageEvent = event as any;
      if (!messageEvent.text) {
        return;
      }
      const message: Message = {
        id: messageEvent.client_msg_id,
        name: messageEvent.user_profile.real_name,
        text: messageEvent.text,
      }
      console.log('messageEvent.text: ', messageEvent.text);
      if (messageEvent.channel === CHANNEL_ID) {
        console.log('sending to clients');
        wss.clients.forEach(function each(client) {
          console.log(`client.readyState: ${client.readyState}`);
          if (client.readyState === WebSocket.OPEN) {
            console.log(`sending to client: ${messageEvent.text}`);
            client.send(JSON.stringify(message));
          }
        });
      }
    } else {
      console.log(event.subtype);
    }
  });
  await app.start();

  console.log('⚡️ Bolt app started');
})();
