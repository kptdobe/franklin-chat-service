import express, {raw} from 'express';
import { WebSocket, WebSocketServer, RawData } from 'ws';
import { App as Slack} from '@slack/bolt';

const SERVER_PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 8081;

const SLACK_ADMIN_CHANNEL_ID = process.env.SLACK_ADMIN_CHANNEL_ID as string;
const SLACK_DEFAULT_CHANNEL_ID = process.env.SLACK_DEFAULT_CHANNEL_ID as string;

type Message = {
  id: string
  name: string
  text: string
}

async function getUserName(message: any, slack: Slack) {
  if (message.user) {
    // eslint-disable-next-line no-await-in-loop
    const res = await slack.client.users.info({
      user: message.user,
    });

    if (res) {
      return res.user?.profile?.real_name as string;
    }
  } else if (message.user_profile && message.user_profile.real_name) {
    return message.user_profile.real_name;
  }
  return 'Unknown';
}

function handleConnection(wss: WebSocketServer, slack: Slack) {
  return async function connection(ws: WebSocket) {
    console.log('client connected');
    await slack.client.chat.postMessage({
      channel: SLACK_ADMIN_CHANNEL_ID,
      text: 'New client connected'
    });
    const history = await slack.client.conversations.history({
      channel: SLACK_DEFAULT_CHANNEL_ID,
      include_all_metadata: true,
      inclusive: true,
    });

    const oldMessages = history.messages?.reverse()
      .filter(message => message.client_msg_id || message.ts)
      .map(async (message) => {
        const name = await getUserName(message, slack)
        return {
          id: message.client_msg_id || message.ts,
          name,
          text: message.text || ''
        } as Message;
    });

    if (oldMessages) {
      const messages = await Promise.all(oldMessages);
      messages.forEach(message => {
        console.log(`sending to client: ${message.text}`);
        ws.send(JSON.stringify(message));
      });
    }

    ws.on('message', handleChatMessage(wss, slack));
    ws.on('error', console.error);
    ws.on('close', () => {
      console.log('client disconnected');
    });
  }
}

function handleChatMessage(wss: WebSocketServer, slack: Slack) {
  return function (data: RawData) {
    console.log('received: %s', data);
    if (data) {
      const payload = JSON.parse(data.toString());
      console.log('text: ', payload.text);
      slack.client.chat.postMessage({
        channel: SLACK_DEFAULT_CHANNEL_ID,
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
  }
}

function handleSlackMessage(wss: WebSocketServer, slack: Slack) {
  return async function ({ event, say }: any) {
    console.log('received message: ', event);
    if (!event.subtype) {
      const messageEvent = event as any;
      if (!messageEvent.text) {
        return;
      }

      let name = 'Unkown';

      if (messageEvent.user) {
        // eslint-disable-next-line no-await-in-loop
        const res = await slack.client.users.info({
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
      if (messageEvent.channel === SLACK_DEFAULT_CHANNEL_ID) {
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
  };
}

(async () => {
  console.log(`\nAdmin channel: ${SLACK_ADMIN_CHANNEL_ID}`);
  console.log(`Default channel: ${SLACK_DEFAULT_CHANNEL_ID}\n`);

  const wss = new WebSocketServer({ noServer: true });

  const slack = new Slack({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
  });

  wss.on('connection', handleConnection(wss, slack));
  slack.event('message', handleSlackMessage(wss, slack));

  await slack.start();

  const app = express();

  app.get('/', (req, res) => {
    res.send('Franklin Chat server is running!')
  })

  const server = app.listen(SERVER_PORT, () => {
    console.log(`⚡️Franklin Chat server is running on port ${SERVER_PORT}!`);
  });

  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (websocket) => {
      wss.emit("connection", websocket, request);
    });
  });

})();
