import { getDBConnection } from '@/core/db/Database';

export interface UserProfile {
    id: string; // "me"
    name?: string;
    phoneNumber?: string;
    walletAddress?: string;
    skrAddress?: string;
    avatarUri?: string;
    updatedAt?: number;
}

const PROFILE_ID = 'me';

export const UserProfileRepository = {
    async getProfile(): Promise<UserProfile | null> {
        try {
            const db = await getDBConnection();
            const result = await db.getAllAsync(`SELECT * FROM user_profile WHERE id = ?`, [PROFILE_ID]);
            if (result && result.length > 0) {
                return result[0] as UserProfile;
            }
            return null;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    },

    async saveProfile(profile: Omit<UserProfile, 'id' | 'updatedAt'>): Promise<void> {
        try {
            const db = await getDBConnection();
            const timestamp = Date.now();

            // Upsert
            await db.runAsync(
                `INSERT OR REPLACE INTO user_profile (id, name, phoneNumber, walletAddress, skrAddress, avatarUri, updatedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    PROFILE_ID,
                    profile.name || null,
                    profile.phoneNumber || null,
                    profile.walletAddress || null,
                    profile.skrAddress || null,
                    profile.avatarUri || null,
                    timestamp
                ]
            );
        } catch (error) {
            console.error('Error saving user profile:', error);
            throw error;
        }
    }
};
