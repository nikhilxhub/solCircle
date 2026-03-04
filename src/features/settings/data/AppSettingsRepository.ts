import { NetworkType } from '@/shared/types';
import { getDBConnection } from '@/core/db/Database';

const NETWORK_KEY = 'network';
const DEFAULT_NETWORK: NetworkType = 'devnet';

export class AppSettingsRepository {
    static async getNetwork(): Promise<NetworkType> {
        const db = await getDBConnection();
        const row = await db.getFirstAsync<{ value: string }>(
            'SELECT value FROM app_settings WHERE key = ?',
            [NETWORK_KEY]
        );

        if (!row?.value) {
            return DEFAULT_NETWORK;
        }

        return row.value === 'mainnet-beta' ? 'mainnet-beta' : 'devnet';
    }

    static async setNetwork(network: NetworkType): Promise<void> {
        const db = await getDBConnection();
        const updatedAt = Date.now();

        await db.runAsync(
            `INSERT INTO app_settings (key, value, updatedAt)
             VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`,
            [NETWORK_KEY, network, updatedAt]
        );
    }
}
