import { getDBConnection } from '@/core/db/Database';
import { NetworkType, TransactionRecord, TransactionStatus } from '@/shared/types';

export type TransactionListFilter = 'all' | 'confirmed' | 'failed' | 'canceled' | 'pending';

type TransactionRow = {
    id: string;
    signature: string | null;
    contactId: string | null;
    contactName: string | null;
    senderAddress: string;
    recipientAddress: string;
    mintAddress: string;
    tokenSymbol: string;
    decimals: number;
    amountRaw: string;
    memo: string | null;
    network: NetworkType;
    status: TransactionStatus;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: number;
    updatedAt: number;
    confirmedAt: number | null;
};

function toTransactionRecord(row: TransactionRow): TransactionRecord {
    return {
        id: row.id,
        signature: row.signature || undefined,
        contactId: row.contactId || undefined,
        contactName: row.contactName || undefined,
        senderAddress: row.senderAddress,
        recipientAddress: row.recipientAddress,
        mintAddress: row.mintAddress,
        tokenSymbol: row.tokenSymbol,
        decimals: row.decimals,
        amountRaw: row.amountRaw,
        memo: row.memo || undefined,
        network: row.network,
        status: row.status,
        errorCode: row.errorCode || undefined,
        errorMessage: row.errorMessage || undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        confirmedAt: row.confirmedAt || undefined,
    };
}

export function createTransactionId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class TransactionRepository {
    static async createAttempt(input: {
        id: string;
        contactId?: string;
        senderAddress: string;
        recipientAddress: string;
        mintAddress: string;
        tokenSymbol: string;
        decimals: number;
        amountRaw: string;
        memo?: string;
        network: NetworkType;
        status?: TransactionStatus;
    }): Promise<void> {
        const db = await getDBConnection();
        const now = Date.now();

        await db.runAsync(
            `INSERT INTO transactions (
                id,
                signature,
                contactId,
                senderAddress,
                recipientAddress,
                mintAddress,
                tokenSymbol,
                decimals,
                amountRaw,
                memo,
                network,
                status,
                errorCode,
                errorMessage,
                createdAt,
                updatedAt,
                confirmedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                input.id,
                null,
                input.contactId || null,
                input.senderAddress,
                input.recipientAddress,
                input.mintAddress,
                input.tokenSymbol,
                input.decimals,
                input.amountRaw,
                input.memo?.trim() || null,
                input.network,
                input.status || 'awaiting_approval',
                null,
                null,
                now,
                now,
                null,
            ]
        );
    }

    static async markStatusById(
        id: string,
        status: TransactionStatus,
        details?: { errorCode?: string; errorMessage?: string; signature?: string; confirmedAt?: number }
    ): Promise<void> {
        const db = await getDBConnection();
        const now = Date.now();
        await db.runAsync(
            `UPDATE transactions
             SET status = ?,
                 signature = COALESCE(?, signature),
                 errorCode = ?,
                 errorMessage = ?,
                 confirmedAt = COALESCE(?, confirmedAt),
                 updatedAt = ?
             WHERE id = ?`,
            [
                status,
                details?.signature || null,
                details?.errorCode || null,
                details?.errorMessage || null,
                details?.confirmedAt || null,
                now,
                id,
            ]
        );
    }

    static async markSubmitted(id: string, signature: string): Promise<void> {
        await this.markStatusById(id, 'submitted', { signature });
    }

    static async markConfirmed(id: string, signature: string, confirmedAt = Date.now()): Promise<void> {
        await this.markStatusById(id, 'confirmed', { signature, confirmedAt });
    }

    static async markCanceled(id: string, errorCode?: string, errorMessage?: string): Promise<void> {
        await this.markStatusById(id, 'canceled', { errorCode, errorMessage });
    }

    static async markFailed(id: string, errorCode?: string, errorMessage?: string): Promise<void> {
        await this.markStatusById(id, 'failed', { errorCode, errorMessage });
    }

    static async getTransactionById(id: string): Promise<TransactionRecord | null> {
        const db = await getDBConnection();
        const row = await db.getFirstAsync<TransactionRow>(
            `SELECT
                tx.id,
                tx.signature,
                tx.contactId,
                c.name as contactName,
                tx.senderAddress,
                tx.recipientAddress,
                tx.mintAddress,
                tx.tokenSymbol,
                tx.decimals,
                tx.amountRaw,
                tx.memo,
                tx.network,
                tx.status,
                tx.errorCode,
                tx.errorMessage,
                tx.createdAt,
                tx.updatedAt,
                tx.confirmedAt
             FROM transactions tx
             LEFT JOIN contacts c ON c.id = tx.contactId
             WHERE tx.id = ?`,
            [id]
        );

        return row ? toTransactionRecord(row) : null;
    }

    static async getTransactions(params?: {
        contactId?: string;
        filter?: TransactionListFilter;
        limit?: number;
        offset?: number;
    }): Promise<TransactionRecord[]> {
        const db = await getDBConnection();
        const limit = params?.limit ?? 200;
        const offset = params?.offset ?? 0;
        const contactId = params?.contactId;
        const filter = params?.filter ?? 'all';

        const whereParts: string[] = [];
        const queryParams: (string | number)[] = [];

        if (contactId) {
            whereParts.push('tx.contactId = ?');
            queryParams.push(contactId);
        }

        if (filter === 'confirmed') {
            whereParts.push("tx.status = 'confirmed'");
        } else if (filter === 'failed') {
            whereParts.push("tx.status = 'failed'");
        } else if (filter === 'canceled') {
            whereParts.push("tx.status = 'canceled'");
        } else if (filter === 'pending') {
            whereParts.push("tx.status IN ('awaiting_approval', 'submitted')");
        }

        const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
        queryParams.push(limit, offset);

        const rows = await db.getAllAsync<TransactionRow>(
            `SELECT
                tx.id,
                tx.signature,
                tx.contactId,
                c.name as contactName,
                tx.senderAddress,
                tx.recipientAddress,
                tx.mintAddress,
                tx.tokenSymbol,
                tx.decimals,
                tx.amountRaw,
                tx.memo,
                tx.network,
                tx.status,
                tx.errorCode,
                tx.errorMessage,
                tx.createdAt,
                tx.updatedAt,
                tx.confirmedAt
             FROM transactions tx
             LEFT JOIN contacts c ON c.id = tx.contactId
             ${where}
             ORDER BY tx.createdAt DESC
             LIMIT ? OFFSET ?`,
            queryParams
        );

        return rows.map(toTransactionRecord);
    }
}
