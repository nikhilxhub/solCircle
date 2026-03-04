import { getDBConnection } from '@/core/db/Database';
import { PaymentTemplate } from '@/shared/types';

export class PaymentTemplateRepository {
    static async addTemplate(template: PaymentTemplate): Promise<void> {
        const db = await getDBConnection();
        await db.runAsync(
            `INSERT INTO payment_templates (id, contactId, label, mintAddress, amountRaw, memo, createdAt, updatedAt, lastUsedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                template.id,
                template.contactId,
                template.label,
                template.mintAddress,
                template.amountRaw,
                template.memo || null,
                template.createdAt,
                template.updatedAt,
                template.lastUsedAt || null,
            ]
        );
    }

    static async getTemplatesByContact(contactId: string): Promise<PaymentTemplate[]> {
        const db = await getDBConnection();
        const rows = await db.getAllAsync<PaymentTemplate>(
            `SELECT id, contactId, label, mintAddress, amountRaw, memo, createdAt, updatedAt, lastUsedAt
             FROM payment_templates
             WHERE contactId = ?
             ORDER BY COALESCE(lastUsedAt, 0) DESC, updatedAt DESC`,
            [contactId]
        );

        return rows.map((row) => ({
            ...row,
            memo: row.memo || undefined,
            lastUsedAt: row.lastUsedAt || undefined,
        }));
    }

    static async touchTemplate(id: string): Promise<void> {
        const db = await getDBConnection();
        const now = Date.now();
        await db.runAsync(
            `UPDATE payment_templates
             SET lastUsedAt = ?, updatedAt = ?
             WHERE id = ?`,
            [now, now, id]
        );
    }

    static async deleteTemplate(id: string): Promise<void> {
        const db = await getDBConnection();
        await db.runAsync('DELETE FROM payment_templates WHERE id = ?', [id]);
    }
}
