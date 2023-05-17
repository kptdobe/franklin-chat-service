import {logger} from "./logger";

const CHANNEL_MAPPING_URL = process.env.CHANNEL_MAPPING_URL as string;

let channelMapping = new Map<string, string>();

async function fetchChannelMapping() {
  logger.info('Reading Channel Mapping from URL');
  logger.info(`Channels Mapping URL: ${CHANNEL_MAPPING_URL}`);

  const response = await fetch(CHANNEL_MAPPING_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch channels mapping. Status: ${response.status} ${response.statusText}`);
  }

  const json = await response.json() as any;

  const rows = json.data;
  if (rows && rows.length) {
    return new Map<string, string>(rows.map((row: any) => {
      return [row['Email domain'], row['Slack channel ID']]
    }));
  }
  logger.warn('No data found.');
  return new Map<string, string>();
}

export function getChannelMapping() {
  return channelMapping;
}

export async function updateChannelMapping() {
  channelMapping = await fetchChannelMapping();
}
