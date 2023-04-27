import winston from 'winston';
import LokiTransport from 'winston-loki';

const GRAFANA_HOST = process.env.GRAFANA_HOST as string;
const GRAFANA_APP_NAME = process.env.GRAFANA_APP_NAME as string;

const GRAFANA_USER_ID = process.env.GRAFANA_USER_ID as string;
const GRAFANA_PASSWORD = process.env.GRAFANA_PASSWORD as string;

console.log('\nGrafana Logger');
console.log(`Grafana Host: ${GRAFANA_HOST}`);
console.log(`Grafana App Name: ${GRAFANA_APP_NAME}`);
console.log(`Grafana User ID: ${GRAFANA_USER_ID}\n`);

export const logger = winston.createLogger({
    level: 'debug',
    transports: [
        new LokiTransport({
            host: GRAFANA_HOST,
            labels: { app: GRAFANA_APP_NAME },
            json: true,
            basicAuth: GRAFANA_USER_ID + ":" + GRAFANA_PASSWORD,
            format: winston.format.json(),
            replaceTimestamp: true,
            onConnectionError: (err) => console.error(err)
        }),
        new winston.transports.Console({}),
    ],
});

logger.info(`Logger Started`);
