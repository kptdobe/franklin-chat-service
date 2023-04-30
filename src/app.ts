import express from 'express';
import cors from 'cors';
import {Server, Socket} from 'socket.io';
import { App as Slack} from '@slack/bolt';
import * as http from 'http';
import {getChannelMapping, updateChannelMapping} from './channelMapping';
import {addDebugRoute} from "./debugRoute";
import {logger} from "./logger";
import {addMetricsRoute} from "./metricsRoute";
import {getMetadataByToken} from "./magicLink";

const SERVER_PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 8081;

const SLACK_ADMIN_CHANNEL_ID = process.env.SLACK_ADMIN_CHANNEL_ID as string;
const SLACK_DEFAULT_CHANNEL_ID = process.env.SLACK_DEFAULT_CHANNEL_ID as string;

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
  files?: Attachment[]
}

type Attachment = {
  id: string
  name: string
  url: string
  thumbUrl: string
}

export type SearchUser = {
  id: string
  name: string
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

function getFiles(slackMessage: any) {
  if (slackMessage.files) {
    return slackMessage.files.map((file: any) => {
      return {
        id: file.id,
        name: file.name,
        url: file.url_private_download,
        thumbUrl: file.thumb_64,
      };
    });
  }
  return [];
}

async function replaceUserIdsWithNamesInSlackMessage(message: string, slack: Slack): Promise<string> {
  const slackUserMentionRegex = /<@(.+?)>/g;

  const promises = [];
  let match;
  while ((match = slackUserMentionRegex.exec(message))) {
    const userId = match[1];
    const promise = getUser({user: userId}, slack)
      .then(({name: userName}) => `<@${userId}|${userName}>`)
      .catch(() => `<@${userId}>`);
    promises.push(promise);
  }

  const resolvedNames = await Promise.all(promises);
  return message.replace(slackUserMentionRegex, () => {
    const resolvedName = resolvedNames.shift();
    return resolvedName ?? ''; // return empty string if resolvedName is undefined or null
  });
}

async function slackToInternalMessage(slackMessage: any, slack: Slack) {
  const user = await getUser(slackMessage, slack)
  return {
    ts: slackMessage.ts,
    user,
    text: await replaceUserIdsWithNamesInSlackMessage(slackMessage.text || '', slack),
    threadId: slackMessage.thread_ts,
    replyCount: slackMessage.reply_count,
    files: getFiles(slackMessage),
  } as Message;
}

async function slackToInternalMessages(slackMessages: any[], slack: Slack) {
  const internalMessages = slackMessages.filter(message => message.ts)
    .filter(message => message.subtype !== 'channel_join')
    .map(async (message) => {
      logger.debug(JSON.stringify(message));
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
  return {
    teamId: info.channel?.context_team_id ?? 'unknown',
    channelName: info.channel?.name ?? 'unknown',
  };
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

function handleConnection(io: Server, slack: Slack) {
  return async function connection(socket: Socket) {

    if (!socket.handshake.query['token']) {
      logger.error('client connected without token');
      socket.disconnect(true);
      return;
    }
    logger.info('client connected', socket.handshake.query['token']);

    let email = undefined;

    try {
      logger.debug('validating token');
      const metadata = await getMetadataByToken(socket.handshake.query['token'] as string);
      email = metadata.email;
    } catch (e) {
      logger.error('client connected with invalid token', e);
      logger.info('disconnecting client');
      socket.disconnect(true);
      return;
    }

    if (!email) {
      logger.error('client connected with invalid token');
      logger.info('disconnecting client');
      socket.disconnect(true);
      return;
    }

    logger.log('token validated', email);

    const channelId = getChannelMapping().get(email.split('@')[1])
        ?? getChannelMapping().get('*')
        ?? SLACK_DEFAULT_CHANNEL_ID;
    logger.debug(`channelId: ${channelId}`);

    await slack.client.chat.postMessage({
      channel: SLACK_ADMIN_CHANNEL_ID,
      text: `Client ${email} connected ⚡️`
    });

    socket.on('history', async (data, callback) => {
      logger.debug(`history requested by ${data.latest}`);
      const messages = await getHistory(slack, channelId, data.latest);
      logger.debug(`sending ${messages.length} messages to client`);
      callback(messages);
    });

    socket.on('replies', async (data, callback) => {
      logger.debug(`replies requested by ${data.ts}`);
      const replies = await getReplies(data.ts, channelId, slack);
      logger.debug(`sending ${replies.length} replies to client`);
      callback(replies);
    });

    socket.on('users', async (data, callback) => {
        logger.debug(`users requested`);
        const users = await slack.client.users.list({
            limit: 100,
            team_id: data.teamId,
        });
        logger.debug(JSON.stringify(users));
        callback([]);
    });

    socket.on('message', handleChatMessage(io, channelId, slack));

    socket.on('disconnect', async () => {
      logger.info('client disconnected');
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
      ...(await getChannelInfo(channelId, slack)),
    });
  }
}

function handleChatMessage(io: Server, channelId: string, slack: Slack) {
  return async function (data: any) {
    try {
      logger.debug(`received: ${data}`);
      if (data) {
        const payload = data as Message;
        const slackMessage = await slack.client.chat.postMessage({
          channel: channelId,
          thread_ts: payload.threadId,
          text: payload.text,
          username: payload.user.name,
          icon_url: payload.user.icon,
        });
        logger.debug(`message sent to slack`, slackMessage.message);
        const internalMessage = await slackToInternalMessage(slackMessage.message, slack);
        io.sockets.sockets.forEach((client: Socket) => {
          if (client.connected) {
            logger.debug(`sending to client`, internalMessage);
            client.emit('message', internalMessage);
          }
        });
      }
    } catch (e) {
      logger.error(e);
    }
  }
}

function handleSlackMessage(io: Server, slack: Slack) {
  return async function ({ event }: any) {
    logger.debug('received message: ', event.text);
    if (!event.subtype) {
      const messageEvent = event as any;
      if (!messageEvent.text) {
        return;
      }

      const message: Message = await slackToInternalMessage(messageEvent, slack);
      logger.debug('messageEvent: ', JSON.stringify(messageEvent));
      logger.debug('sending to clients');
      io.sockets.sockets.forEach(function (client: Socket) {
        logger.debug(`client.connected: ${client.connected}`);
        logger.debug(`client.data.channelId: ${client.data.channelId}`);
        logger.debug(`messageEvent.channelId: ${messageEvent.channel}`)
        if (client.connected && client.data.channelId === messageEvent.channel) {
          logger.debug(`sending to client: ${messageEvent.text}`);
          client.emit('message', message);
        }
      });
    } else {
      logger.debug(event.subtype);
    }
  };
}

(async () => {
  logger.info(`Admin channel: ${SLACK_ADMIN_CHANNEL_ID}`);
  logger.info(`Default channel: ${SLACK_DEFAULT_CHANNEL_ID}`);

  logger.info(`Updating channel map...`);
  await updateChannelMapping()

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
    logger.verbose(`Health check`);
    res.send('Franklin Chat server is running!')
  })

  app.get('/update', async (req, res) => {
    logger.info(`Updating channel map...`);
    await updateChannelMapping();
    const channelMapping = getChannelMapping();
    res.send(`Updated channel map! Received ${channelMapping.size} domains.<br/>` + JSON.stringify(Object.fromEntries(channelMapping)));
  })

  addMetricsRoute(app);
  addDebugRoute(app, io);

  io.on('connection', handleConnection(io, slack));
  slack.event('message', handleSlackMessage(io, slack));

  server.listen(SERVER_PORT, () => {
    logger.info(`⚡️Franklin Chat server is running on port ${SERVER_PORT}!`);
  });

})().catch(logger.error);
