import { WebSocket, WebSocketServer } from 'ws';
import { App } from '@slack/bolt';

const CHANNEL_ID = process.env.SLACK_DEFAULT_CHANNEL as string;

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
    console.log('received message: ', event);
    if (!event.subtype) {
      const messageEvent = event as any;
      if (!messageEvent.text) {
        return;
      }

      let name = 'Unkown';

      if (messageEvent.user) {
        // eslint-disable-next-line no-await-in-loop
        const res = await app.client.users.info({
          user: messageEvent.user,
        });

        if (res) {
          name = res.user?.profile?.real_name as string;
            // email: res.user.profile.email,
            // avatar: res.user.profile.image_72,
            // source: 'slack',
        }
      } else if (messageEvent.user_profile && messageEvent.user_profile.real_name) {
        name = messageEvent.user_profile.real_name;
      }

      const message: Message = {
        id: messageEvent.client_msg_id,
        name,
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
