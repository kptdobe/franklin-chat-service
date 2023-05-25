# Franklin Chat Service
- Slack app:
  - https://api.slack.com/apps/AA4TSRLKV (AEM Engineering)
  - https://api.slack.com/apps/A056A7R316Z (Adobe Enterprise Support)
- Passwordless login: [MagicLink](https://dashboard.magic.link/app?cid=pDpB8lFitWJs6e-dh2Q5EJ3-nqRinvpEFWnh2dO4leU=)
- E-mail to channel mapping: [Google Spreadsheet](https://drive.google.com/drive/u/2/folders/1MlfI4ghY9RdHUYf9xrX_7S_qdBEDEoaC) 

## Running locally
- add the following properties to `.env`
  - SERVER_PORT
  - MAGIC_LINK_API_KEY=...
  - CHANNEL_MAPPING_URL=...
  - SLACK_BOT_TOKEN  (OAuth & Permissions > Bot User OAuth Token)
  - SLACK_APP_TOKEN (Basic Information > App-Level Tokens > "App Token")
  - SLACK_DEFAULT_CHANNEL_ID (Slack channel id where the messages are sent by default - note: slack app above needs to be invited to the channel)
  - SLACK_ADMIN_CHANNEL_ID (Slack channel id where the admin messages are sent to - note: slack app above needs to be invited to the channel)
  - LOG_LEVEL={debug|info|warn|error}
  - GRAFANA_ENABLED=...
  - GRAFANA_HOST=...
  - GRAFANA_USER_ID=...
  - GRAFANA_PASSWORD=...
  - GRAFANA_APP_NAME=...
- `npm start`

## Deploying to Ethos
- add the following properties to `.env`
  - DOCKER_IMAGE_NAME
  - DOCKER_REGISTRY_URL
  - DOCKER_USERNAME
  - DOCKER_PASSWORD
  - DEPLOYMENT_NAME
  - CLUSTER_NAME
  - NAMESPACE
- `npm run build:docker`
- `npm run deploy`

## Rest API
- Heath check: [/health](https://franklin-chat-service-ns-team-sites-xp-outbound-marketing-stage.ethos09-prod-va7.ethos.adobe.net/health)
- Metrics: [/metrics](https://franklin-chat-service-ns-team-sites-xp-outbound-marketing-stage.ethos09-prod-va7.ethos.adobe.net/metrics)
- Admin panel: [/admin](https://franklin-chat-service-ns-team-sites-xp-outbound-marketing-stage.ethos09-prod-va7.ethos.adobe.net/admin)

## Troubleshooting
The logs are sent to Grafana Cloud and can be inspected [here](https://tsaplin.grafana.net/goto/mPw31Ys4R?orgId=1)

## Development
You can use `npm run dev` to run the service in dev mode: watch for changes in TS files and open the inspect port.
To override the production environment variables, create a `.env.local` file and add the variables you want to override.
