import { createHash } from 'node:crypto';

const SALT = process.env.PUBLIC_SALT || process.env.JWT_SECRET || 'my-rsi-org-default-public-salt';

export function opaqueId(internalId: string | number): string {
    return createHash('sha256').update(`${internalId}::${SALT}`).digest('hex').slice(0, 12);
}
