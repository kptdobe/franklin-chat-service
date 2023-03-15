"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const bolt_1 = require("@slack/bolt");
const CHANNEL_ID = process.env.SLACK_DEFAULT_CHANNEL;
const app = new bolt_1.App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    const wss = new ws_1.WebSocketServer({ port: 3030 });
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
                    if (client.readyState === ws_1.WebSocket.OPEN) {
                        console.log(`sending to client: ${data}`);
                        client.send(JSON.stringify(payload));
                    }
                });
            }
        });
    });
    app.event('message', ({ event, say }) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        console.log('received message: ', event);
        if (!event.subtype) {
            const messageEvent = event;
            if (!messageEvent.text) {
                return;
            }
            let name = 'Unkown';
            if (messageEvent.user) {
                // eslint-disable-next-line no-await-in-loop
                const res = yield app.client.users.info({
                    user: messageEvent.user,
                });
                if (res) {
                    name = (_b = (_a = res.user) === null || _a === void 0 ? void 0 : _a.profile) === null || _b === void 0 ? void 0 : _b.real_name;
                    // email: res.user.profile.email,
                    // avatar: res.user.profile.image_72,
                    // source: 'slack',
                }
            }
            else if (messageEvent.user_profile && messageEvent.user_profile.real_name) {
                name = messageEvent.user_profile.real_name;
            }
            const message = {
                id: messageEvent.client_msg_id,
                name,
                text: messageEvent.text,
            };
            console.log('messageEvent.text: ', messageEvent.text);
            if (messageEvent.channel === CHANNEL_ID) {
                console.log('sending to clients');
                wss.clients.forEach(function each(client) {
                    console.log(`client.readyState: ${client.readyState}`);
                    if (client.readyState === ws_1.WebSocket.OPEN) {
                        console.log(`sending to client: ${messageEvent.text}`);
                        client.send(JSON.stringify(message));
                    }
                });
            }
        }
        else {
            console.log(event.subtype);
        }
    }));
    yield app.start();
    console.log('⚡️ Bolt app started');
}))();
//# sourceMappingURL=app.js.map