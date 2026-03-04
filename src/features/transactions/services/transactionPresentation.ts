import { TransactionStatus } from '@/shared/types';

export function formatTransactionDayLabel(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const dayKey = date.toDateString();
    if (dayKey === today.toDateString()) {
        return 'Today';
    }
    if (dayKey === yesterday.toDateString()) {
        return 'Yesterday';
    }

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export function formatTransactionTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatTransactionDateTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function shortenAddress(address: string): string {
    if (address.length < 12) {
        return address;
    }
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function getTransactionStatusLabel(status: TransactionStatus): string {
    switch (status) {
        case 'awaiting_approval':
            return 'Awaiting Approval';
        case 'submitted':
            return 'Submitted';
        case 'confirmed':
            return 'Confirmed';
        case 'canceled':
            return 'Canceled';
        case 'failed':
            return 'Failed';
        default:
            return status;
    }
}

export function getTransactionStatusStyles(status: TransactionStatus) {
    if (status === 'confirmed') {
        return { backgroundColor: '#EAF7EF', color: '#17603A' };
    }
    if (status === 'canceled') {
        return { backgroundColor: '#F5F5F5', color: '#555555' };
    }
    if (status === 'failed') {
        return { backgroundColor: '#FDECEC', color: '#9D2020' };
    }
    return { backgroundColor: '#EFEFEF', color: '#333333' };
}

