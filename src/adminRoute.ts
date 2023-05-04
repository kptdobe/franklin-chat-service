import express from "express";
import {Server} from 'socket.io';
import {getChannelMapping, updateChannelMapping} from "./channelMapping";
import {logger} from "./logger";
import {readFileSync} from "node:fs";

const ROUTE_PATH = '/admin';

function getAppVersion() {
    return JSON.parse(readFileSync('package.json', 'utf8')).version;
}

function renderConnections(io: Server) {
    const connectedClients = Array.from(io.sockets.sockets.entries()).map(([, socket]) => {
        return {
            id: socket.id,
            connected: socket.connected,
            data: JSON.stringify(socket.data)
        }
    });

    const tableRows = connectedClients.map((client) => {
        return `
          <tr>
            <td>${client.id}</td>
            <td>${client.connected}</td>
            <td>${client.data}</td>
          </tr>
        `;
    }).join('');

    return `
        <h3>Connections</h3>
        <table>
          <thead>
            <tr>
              <th>Client ID</th>
              <th>Connected</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
    `;
}

function renderChannelMapping() {
    const tableRows = Array.from(getChannelMapping().entries()).map(([email, slackChannel]) => {
        return `
              <tr>
                <td>${email}</td>
                <td>${slackChannel}</td>
              </tr>
            `;
    }).join('');
    return `
        <h3>Channel Mapping</h3>
        <table>
            <thead>
                <tr>
                    <th>Email</th>
                    <th>Slack Channel</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
        <a class="button" href="${ROUTE_PATH}?command=updateChannelMapping">Update Mapping</a>
    `;
}

async function handleCommands(command: string, req: express.Request, res: express.Response) {
    logger.info(`Processing command: ${command}`);
    switch (command) {
        case 'updateChannelMapping':
            logger.info('Update Channel Mapping requested');
            await updateChannelMapping();
            break;
        default:
            logger.info(`Unknown command: ${command}`);
    }
    res.redirect(ROUTE_PATH);
}

function renderDashboard(io: Server) {
    return `
            <html>
                <head>
                    <title>Admin</title>
                    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,300italic,700,700italic">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.css">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/milligram/1.4.1/milligram.css">
                </head>
                <body style='padding: 25px'>
                <h1>Admin Dashboard (${getAppVersion()})</h1>
                ${renderConnections(io)}
                ${renderChannelMapping()}
                </body>
            </html>
        `;
}

export function addAdminRoute(app: express.Express, io: Server) {
    app.get(ROUTE_PATH, async (req, res) => {
        const command = req.query.command as string;
        if (command) {
            await handleCommands(command, req, res);
            return;
        }
        res.send(renderDashboard(io));
    });
}
