import express from "express";
import {Server} from 'socket.io';

export function addDebugRoute(app: express.Express, io: Server) {
    app.get('/debug', (req, res) => {
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

        const table = `
            <table style="border-collapse: collapse; width: 100%;">
              <thead>
                <tr style="background-color: #f5f5f5; font-weight: bold; text-align: left;">
                  <th style="border: 1px solid #ddd; padding: 8px; width: 30%;">Client ID</th>
                  <th style="border: 1px solid #ddd; padding: 8px; width: 15%;">Connected</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Data</th>
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
