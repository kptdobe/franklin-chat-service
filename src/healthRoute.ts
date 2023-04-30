import express from 'express';
import {logger} from "./logger";

export function addHealthRoute(app: express.Express) {
    app.get('/health', async (req, res) => {
        logger.verbose(`Health check`);
        res.send('Franklin Chat server is running!')
    });
}
