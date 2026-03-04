export type NetworkType = 'devnet' | 'mainnet-beta';

export interface Contact {
    id: string;
    name: string;
    phoneNumber?: string;
    walletAddress?: string;
    skrAddress?: string;
    resolvedWallet?: string;
    avatarUri?: string;
    notes?: string;
    addedVia?: 'manual' | 'qr';
    createdAt: number;
    updatedAt: number;
}

export interface TokenBalance {
    mintAddress: string;
    symbol: string;
    amountRaw: string;
    amountUi: string;
    decimals: number;
    isNative: boolean;
    tokenAccountAddress?: string;
}

export interface SendDraft {
    contactId: string;
    recipientAddress: string;
    mintAddress: string;
    amount: string;
    memo?: string;
    network: NetworkType;
}

export interface PaymentTemplate {
    id: string;
    contactId: string;
    label: string;
    mintAddress: string;
    amountRaw: string;
    memo?: string;
    createdAt: number;
    updatedAt: number;
    lastUsedAt?: number;
}

export type TransactionStatus = 'awaiting_approval' | 'submitted' | 'confirmed' | 'canceled' | 'failed';

export interface TransactionRecord {
    id: string;
    signature?: string;
    contactId?: string;
    contactName?: string;
    senderAddress: string;
    recipientAddress: string;
    mintAddress: string;
    tokenSymbol: string;
    decimals: number;
    amountRaw: string;
    memo?: string;
    network: NetworkType;
    status: TransactionStatus;
    errorCode?: string;
    errorMessage?: string;
    createdAt: number;
    updatedAt: number;
    confirmedAt?: number;
}
