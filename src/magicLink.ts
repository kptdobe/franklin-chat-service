import {Magic} from '@magic-sdk/admin';
import {logger} from "./logger";

const MAGIC_LINK_API_KEY = process.env.MAGIC_LINK_API_KEY as string;

logger.info(`Magic Link API Key: ${MAGIC_LINK_API_KEY}`);

const magic = new Magic(MAGIC_LINK_API_KEY);

export async function getMetadataByToken(token: string) {
    return await magic.users.getMetadataByToken(token);
}
