# Franklin Chat Service

Slack app: https://api.slack.com/apps/AA4TSRLKV

## Running locally
- add the following properties to `.env`
  - SLACK_BOT_TOKEN  (OAuth & Permissions > Bot User OAuth Token)
  - SLACK_APP_TOKEN (Basic Information > App-Level Tokens > "App Token")
  - SERVER_PORT
  - SLACK_DEFAULT_CHANNEL_ID (Slack channel id where the messages are sent by default - note: slack app above needs to be invited to the channel)
  - SLACK_ADMIN_CHANNEL_ID (Slack channel id where the admin messages are sent to - note: slack app above needs to be invited to the channel)
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

## Development

You can use `npm run dev` to run the service in dev mode: watch for changes in TS files and open the inspect port.