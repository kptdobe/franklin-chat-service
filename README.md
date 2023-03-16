# Franklin Chat Service

Slack app: https://api.slack.com/apps/AA4TSRLKV

## Running locally
- add the following properties to `.env`
  - SLACK_BOT_TOKEN  (OAuth & Permissions > Bot User OAuth Token)
  - SLACK_APP_TOKEN (Basic Information > App-Level Tokens > "App Token")
  - SERVER_PORT
  - SLACK_DEFAULT_CHANNEL
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
