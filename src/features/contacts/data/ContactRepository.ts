import { getDBConnection } from '@/core/db/Database';
import { Contact } from '@/shared/types';

export class ContactRepository {

    static async addContact(contact: Contact): Promise<void> {
        const db = await getDBConnection();
        await db.runAsync(
            `INSERT INTO contacts (id, name, phoneNumber, walletAddress, skrAddress, avatarUri, notes, addedVia, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                contact.id,
                contact.name,
                contact.phoneNumber || null,
                contact.walletAddress || null,
                contact.skrAddress || null,
                contact.avatarUri || null,
                contact.notes || null,
                contact.addedVia || 'manual',
                contact.createdAt,
                contact.updatedAt
            ]
        );
    }

    static async getAllContacts(): Promise<Contact[]> {
        const db = await getDBConnection();
        const result = await db.getAllAsync<{
            id: string;
            name: string;
            phoneNumber: string | null;
            walletAddress: string | null;
            skrAddress: string | null;
            avatarUri: string | null;
            notes: string | null;
            createdAt: number;
            updatedAt: number;
        }>('SELECT * FROM contacts ORDER BY name ASC');

        return result.map(row => ({
            id: row.id,
            name: row.name,
            phoneNumber: row.phoneNumber || undefined,
            walletAddress: row.walletAddress || undefined,
            skrAddress: row.skrAddress || undefined,
            avatarUri: row.avatarUri || undefined,
            notes: row.notes || undefined,
            addedVia: (row as any).addedVia || 'manual', // Type assertion needed until db.getAllAsync generic is updated fully
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }));
    }

    // Add other methods like update, delete, getById as needed
    static async updateContact(contact: Contact): Promise<void> {
        const db = await getDBConnection();
        await db.runAsync(
            `UPDATE contacts SET name = ?, phoneNumber = ?, walletAddress = ?, skrAddress = ?, avatarUri = ?, notes = ?, updatedAt = ? WHERE id = ?`,
            [
                contact.name,
                contact.phoneNumber || null,
                contact.walletAddress || null,
                contact.skrAddress || null,
                contact.avatarUri || null,
                contact.notes || null,
                contact.updatedAt,
                contact.id
            ]
        );
    }

    static async getContactById(id: string): Promise<Contact | null> {
        const db = await getDBConnection();
        const result = await db.getFirstAsync<{
            id: string;
            name: string;
            phoneNumber: string | null;
            walletAddress: string | null;
            skrAddress: string | null;
            avatarUri: string | null;
            notes: string | null;
            addedVia: string | null;
            createdAt: number;
            updatedAt: number;
        }>('SELECT * FROM contacts WHERE id = ?', [id]);

        if (!result) return null;

        return {
            id: result.id,
            name: result.name,
            phoneNumber: result.phoneNumber || undefined,
            walletAddress: result.walletAddress || undefined,
            skrAddress: result.skrAddress || undefined,
            avatarUri: result.avatarUri || undefined,
            notes: result.notes || undefined,
            addedVia: (result.addedVia as any) || 'manual',
            createdAt: result.createdAt,
            updatedAt: result.updatedAt
        };
    }

    static async deleteContact(id: string): Promise<void> {
        const db = await getDBConnection();
        await db.runAsync('DELETE FROM contacts WHERE id = ?', [id]);
    }
}
