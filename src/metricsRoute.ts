import {collectDefaultMetrics, Registry} from 'prom-client';
import express from 'express';
import {logger} from "./logger";

const register = new Registry();

collectDefaultMetrics({
    register: register
});

export function addMetricsRoute(app: express.Express) {
    app.get('/metrics', async (req, res) => {
        logger.debug(`Metrics requested`);
        res.setHeader('Content-Type', register.contentType);
        res.send(await register.metrics());
        logger.debug(`Metrics sent`);
    });
}
