import winston from 'winston';
import LokiTransport from 'winston-loki';
import TransportStream from "winston-transport";

const LOG_LEVEL = process.env.LOG_LEVEL as string ?? 'info';

const GRAFANA_ENABLED = JSON.parse(process.env.GRAFANA_ENABLED as string ?? false);
const GRAFANA_HOST = process.env.GRAFANA_HOST as string;
const GRAFANA_APP_NAME = process.env.GRAFANA_APP_NAME as string;
const GRAFANA_USER_ID = process.env.GRAFANA_USER_ID as string;
const GRAFANA_PASSWORD = process.env.GRAFANA_PASSWORD as string;

const transports: TransportStream[] = [new winston.transports.Console({})];

if (GRAFANA_ENABLED) {
    transports.push(new LokiTransport({
        host: GRAFANA_HOST,
        labels: { app: GRAFANA_APP_NAME },
        basicAuth: GRAFANA_USER_ID + ":" + GRAFANA_PASSWORD,
        replaceTimestamp: true,
        onConnectionError: (err) => console.error(err)
    }));
}

export const logger = winston.createLogger({
    level: LOG_LEVEL,
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'HH:mm:ss'
        }),
        winston.format.printf(info => `[${info.level.toUpperCase()}] ${info.timestamp} ${info.message}`)
    ),
    transports
});

logger.info(`Logger Level: ${LOG_LEVEL}`);

if (GRAFANA_ENABLED) {
    logger.info(`Grafana Host: ${GRAFANA_HOST}`);
    logger.info(`Grafana App Name: ${GRAFANA_APP_NAME}`);
    logger.info(`Grafana User ID: ${GRAFANA_USER_ID}`);
}
