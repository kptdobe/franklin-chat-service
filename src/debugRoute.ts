import express from "express";
import {Server} from 'socket.io';

export function addDebugRoute(app: express.Express, io: Server) {
    app.get('/debug', (req, res) => {
        const connectedClients = Array.from(io.sockets.sockets.entries()).map(([id, socket]) => {
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

        const table = `
            <table border="1">
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

        res.send(table);
    });
}
