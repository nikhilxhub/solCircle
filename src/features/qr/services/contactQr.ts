import { isValidPublicKey } from '@/features/wallet/services/solanaTransfers';

export interface ContactQrPayload {
    type: 'contact_card';
    version: 1;
    name?: string;
    phoneNumber?: string;
    walletAddress?: string;
    skrAddress?: string;
}

function cleanString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

export function buildContactQrPayload(input: {
    name?: string;
    phoneNumber?: string;
    walletAddress?: string;
    skrAddress?: string;
}): ContactQrPayload {
    return {
        type: 'contact_card',
        version: 1,
        name: cleanString(input.name),
        phoneNumber: cleanString(input.phoneNumber),
        walletAddress: cleanString(input.walletAddress),
        skrAddress: cleanString(input.skrAddress),
    };
}

export function parseContactQrData(raw: string): {
    name?: string;
    phoneNumber?: string;
    walletAddress?: string;
    skrAddress?: string;
} | null {
    const text = cleanString(raw);
    if (!text) {
        return null;
    }

    try {
        const parsed = JSON.parse(text) as Record<string, unknown>;

        const walletCandidate = cleanString(parsed.walletAddress) || cleanString(parsed.wallet);

        const result = {
            name: cleanString(parsed.name),
            phoneNumber: cleanString(parsed.phoneNumber) || cleanString(parsed.phone),
            walletAddress: walletCandidate,
            skrAddress: cleanString(parsed.skrAddress) || cleanString(parsed.skr),
        };

        const hasAnyField = Object.values(result).some(Boolean);
        return hasAnyField ? result : null;
    } catch {
        if (isValidPublicKey(text)) {
            return { walletAddress: text };
        }

        return null;
    }
}
