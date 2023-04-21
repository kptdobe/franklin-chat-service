# Franklin Chat Service
- Slack app: https://api.slack.com/apps/AA4TSRLKV
- Passwordless login: https://dashboard.magic.link/app?cid=pDpB8lFitWJs6e-dh2Q5EJ3-nqRinvpEFWnh2dO4leU=
- E-mail to channel mapping: [Google Spreadsheet](https://docs.google.com/spreadsheets/d/1ODgfW1hBKvVM1yBfMX06EBUpL_kPfUNMkctCuiNRoWw/edit?usp=sharing) 

## Running locally
- add the following properties to `.env`
  - SERVER_PORT
  - MAGIC_LINK_API_KEY=...
  - GOOGLE_SHEET_ID=...
  - GOOGLE_SERVICE_ACCOUNT_EMAIL=...
  - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=...
  - SLACK_BOT_TOKEN  (OAuth & Permissions > Bot User OAuth Token)
  - SLACK_APP_TOKEN (Basic Information > App-Level Tokens > "App Token")
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

## Rest API
- Heath check: `GET https://franklin-chat-service-ns-team-sites-xp-outbound-marketing-stage.ethos09-prod-va7.ethos.adobe.net/health`
- To update channel mapping: `GET https://franklin-chat-service-ns-team-sites-xp-outbound-marketing-stage.ethos09-prod-va7.ethos.adobe.net/update`

## Development
You can use `npm run dev` to run the service in dev mode: watch for changes in TS files and open the inspect port.
