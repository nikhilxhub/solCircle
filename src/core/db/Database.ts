import * as SQLite from 'expo-sqlite';

export const DATABASE_NAME = 'contacts.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDBConnection() {
    if (!dbInstance) {
        dbInstance = await SQLite.openDatabaseAsync(DATABASE_NAME, { useNewConnection: true });
    }
    return dbInstance;
}

export async function createTable() {
    const db = await getDBConnection();
    await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            phoneNumber TEXT,
            walletAddress TEXT,
            skrAddress TEXT,
            avatarUri TEXT,
            notes TEXT,
            addedVia TEXT,
            createdAt INTEGER,
            updatedAt INTEGER
        );

        CREATE TABLE IF NOT EXISTS user_profile (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT,
            phoneNumber TEXT,
            walletAddress TEXT,
            skrAddress TEXT,
            avatarUri TEXT,
            updatedAt INTEGER
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL,
            updatedAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS payment_templates (
            id TEXT PRIMARY KEY NOT NULL,
            contactId TEXT NOT NULL,
            label TEXT NOT NULL,
            mintAddress TEXT NOT NULL,
            amountRaw TEXT NOT NULL,
            memo TEXT,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            lastUsedAt INTEGER,
            FOREIGN KEY(contactId) REFERENCES contacts(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_payment_templates_contact
            ON payment_templates(contactId);

        CREATE INDEX IF NOT EXISTS idx_payment_templates_last_used
            ON payment_templates(contactId, lastUsedAt DESC, updatedAt DESC);

        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY NOT NULL,
            signature TEXT,
            contactId TEXT,
            senderAddress TEXT NOT NULL,
            recipientAddress TEXT NOT NULL,
            mintAddress TEXT NOT NULL,
            tokenSymbol TEXT NOT NULL,
            decimals INTEGER NOT NULL,
            amountRaw TEXT NOT NULL,
            memo TEXT,
            network TEXT NOT NULL,
            status TEXT NOT NULL,
            errorCode TEXT,
            errorMessage TEXT,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            confirmedAt INTEGER,
            FOREIGN KEY(contactId) REFERENCES contacts(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_created_at
            ON transactions(createdAt DESC);

        CREATE INDEX IF NOT EXISTS idx_transactions_contact_created
            ON transactions(contactId, createdAt DESC);

        CREATE INDEX IF NOT EXISTS idx_transactions_signature
            ON transactions(signature);
    `);

    const addColumn = async (tableName: string, columnDefinition: string) => {
        try {
            await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
        } catch (e: any) {
            if (!String(e?.message || '').includes('duplicate column name')) {
                console.log(`Migration validation: ${e?.message}`);
            }
        }
    };

    await addColumn('contacts', 'phoneNumber TEXT');
    await addColumn('contacts', 'walletAddress TEXT');
    await addColumn('contacts', 'skrAddress TEXT');
    await addColumn('contacts', 'avatarUri TEXT');
    await addColumn('contacts', 'notes TEXT');
    await addColumn('payment_templates', 'lastUsedAt INTEGER');
    await addColumn('transactions', 'status TEXT');
    await addColumn('transactions', 'errorCode TEXT');
    await addColumn('transactions', 'errorMessage TEXT');
    await addColumn('transactions', 'confirmedAt INTEGER');
}
