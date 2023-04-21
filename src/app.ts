import express from 'express';
import cors from 'cors';
import {Server, Socket} from 'socket.io';
import { App as Slack} from '@slack/bolt';
import * as http from 'http';
import {Magic} from '@magic-sdk/admin';
import {readSheet} from './readSheet';

const SERVER_PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 8081;

const MAGIC_LINK_API_KEY = process.env.MAGIC_LINK_API_KEY as string;

const SLACK_ADMIN_CHANNEL_ID = process.env.SLACK_ADMIN_CHANNEL_ID as string;
const SLACK_DEFAULT_CHANNEL_ID = process.env.SLACK_DEFAULT_CHANNEL_ID as string;

let domain2slack = new Map<string, string>();

type User = {
  name: string,
  icon?: string,
};

type Message = {
  ts: string
  user: User
  text: string
  threadId?: string
  replyCount?: number
}

async function getUser(message: any, slack: Slack): Promise<User> {
  if (message.username) {
    return {
      name: message.username,
    };
  }
  if (message.user) {
    const res = await slack.client.users.info({
      user: message.user,
    });

    if (res) {
      return {
        name: res.user?.profile?.real_name as string,
        icon: res.user?.profile?.image_48 as string
      };
    }
  } else if (message.user_profile && message.user_profile.real_name) {
    return {
      name: message.user_profile.real_name,
      icon: message.user_profile.image_48
    };
  }
  return {
    name: 'Unknown',
  };
}

async function slackToInternalMessage(slackMessage: any, slack: Slack) {
  const user = await getUser(slackMessage, slack)
  return {
    ts: slackMessage.ts,
    user,
    text: slackMessage.text || '',
    threadId: slackMessage.thread_ts,
    replyCount: slackMessage.reply_count,
  } as Message;
}

async function slackToInternalMessages(slackMessages: any[], slack: Slack) {
  const internalMessages = slackMessages.filter(message => message.ts)
    .filter(message => message.subtype !== 'channel_join')
    .map(async (message) => {
      console.log(JSON.stringify(message));
      return await slackToInternalMessage(message, slack);
    });
  if (internalMessages) {
    return await Promise.all(internalMessages);
  }
  return [];
}

async function getChannelInfo(channelId: string, slack: Slack) {
  const info = await slack.client.conversations.info({
    channel: channelId,
  });
  return info.channel?.name ?? 'unknown';
}

async function getHistory(slack: Slack, channel: string, latest?: string) {
  const history = await slack.client.conversations.history({
    channel,
    include_all_metadata: true,
    limit: 20,
    latest,
  });
  return slackToInternalMessages(history.messages ?? [], slack);
}

async function getReplies(ts: string, channel: string, slack: Slack) {
  const replies = await slack.client.conversations.replies({
    channel,
    include_all_metadata: true,
    limit: 1000, // get all replies
    ts,
  });
  return slackToInternalMessages(replies.messages ?? [], slack);
}

function handleConnection(io: Server, slack: Slack, magic: Magic) {
  return async function connection(socket: Socket) {

    if (!socket.handshake.query['token']) {
      console.error('client connected without token');
      socket.disconnect(true);
      return;
    }
    console.log('client connected', socket.handshake.query['token']);

    let email = undefined;

    try {
      console.log('validating token');
      const metadata = await magic.users.getMetadataByToken(socket.handshake.query['token'] as string);
      email = metadata.email;
    } catch (e) {
      console.error('client connected with invalid token', e);
      console.log('disconnecting client');
      socket.disconnect(true);
      return;
    }

    if (!email) {
      console.error('client connected with invalid token');
      console.log('disconnecting client');
      socket.disconnect(true);
      return;
    }

    console.log('token validated', email);

    const channelId = domain2slack.get(email.split('@')[1]) ?? SLACK_DEFAULT_CHANNEL_ID;
    console.log(`channelId: ${channelId}`);

    await slack.client.chat.postMessage({
      channel: SLACK_ADMIN_CHANNEL_ID,
      text: `Client ${email} connected ⚡️`
    });

    socket.on('history', async (data, callback) => {
      console.log(`history requested by ${data.latest}`);
      const messages = await getHistory(slack, channelId, data.latest);
      console.log(`sending ${messages.length} messages to client`);
      callback(messages);
    });

    socket.on('replies', async (data, callback) => {
      console.log(`replies requested by ${data.ts}`);
      const replies = await getReplies(data.ts, channelId, slack);
      console.log(`sending ${replies.length} replies to client`);
      callback(replies);
    });

    socket.on('message', handleChatMessage(io, channelId, slack));

    socket.on('disconnect', async () => {
      console.log('client disconnected');
      await slack.client.chat.postMessage({
        channel: SLACK_ADMIN_CHANNEL_ID,
        text: `Client ${socket.data.email} disconnected 🖐`
      });
    });

    socket.data = {
      email,
      channelId,
    }

    socket.emit('ready', {
      email,
      channelId: channelId,
      channelName: await getChannelInfo(channelId, slack),
    });
  }
}

function handleChatMessage(io: Server, channelId: string, slack: Slack) {
  return async function (data: any) {
    try {
      console.log('received: %s', data);
      if (data) {
        const payload = data as Message;
        const slackMessage = await slack.client.chat.postMessage({
          channel: channelId,
          thread_ts: payload.threadId,
          text: payload.text,
          username: payload.user.name,
          icon_url: payload.user.icon,
        });
        console.log(`message sent to slack`, slackMessage.message);
        const internalMessage = await slackToInternalMessage(slackMessage.message, slack);
        io.sockets.sockets.forEach((client: Socket) => {
          if (client.connected) {
            console.log(`sending to client`, internalMessage);
            client.emit('message', internalMessage);
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
}

function handleSlackMessage(io: Server, slack: Slack) {
  return async function ({ event, say }: any) {
    console.log('received message: ', event.text);
    if (!event.subtype) {
      const messageEvent = event as any;
      if (!messageEvent.text) {
        return;
      }

      const message: Message = await slackToInternalMessage(messageEvent, slack);
      console.log('messageEvent: ', JSON.stringify(messageEvent));
      console.log('sending to clients');
      io.sockets.sockets.forEach(function (client: Socket) {
        console.log(`client.connected: ${client.connected}`);
        console.log(`client.data.channelId: ${client.data.channelId}`);
        console.log(`messageEvent.channelId: ${messageEvent.channel}`)
        if (client.connected && client.data.channelId === messageEvent.channel) {
          console.log(`sending to client: ${messageEvent.text}`);
          client.emit('message', message);
        }
      });
    } else {
      console.log(event.subtype);
    }
  };
}

(async () => {
  console.log(`\nAdmin channel: ${SLACK_ADMIN_CHANNEL_ID}`);
  console.log(`Default channel: ${SLACK_DEFAULT_CHANNEL_ID}\n`);

  console.log(`Magic Link API Key: ${MAGIC_LINK_API_KEY}\n`);

  console.log(`Updating channel map...`);
  domain2slack = await readSheet();

  const magic = new Magic(MAGIC_LINK_API_KEY);

  const slack = new Slack({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
    developerMode: false,
  });

  await slack.start();

  const app = express();
  app.use(cors({
    origin: '*'
  }));

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
    }
  });

  app.get('/health', (req, res) => {
    res.send('Franklin Chat server is running!')
  })

  app.get('/update', async (req, res) => {
    console.log(`Updating channel map...`);
    domain2slack = await readSheet();
    res.send(`Updated channel map! Received ${domain2slack.size} domains.<br/>` + JSON.stringify(Object.fromEntries(domain2slack)));
  })

  io.on('connection', handleConnection(io, slack, magic));
  slack.event('message', handleSlackMessage(io, slack));

  server.listen(SERVER_PORT, () => {
    console.log(`⚡️Franklin Chat server is running on port ${SERVER_PORT}!`);
  });

})().catch(console.error);
