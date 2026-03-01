import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenContainer } from '@/shared/components/ScreenContainer';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';
import { Colors } from '@/shared/theme/Colors';
import { TransactionListFilter, TransactionRepository } from '@/features/transactions/data/TransactionRepository';
import { rawToAmountUi } from '@/features/wallet/services/solanaTransfers';
import { TransactionRecord } from '@/shared/types';
import {
    formatTransactionDayLabel,
    formatTransactionTime,
    getTransactionStatusLabel,
    getTransactionStatusStyles,
    shortenAddress,
} from '@/features/transactions/services/transactionPresentation';

type ListRow =
    | {
          kind: 'header';
          id: string;
          label: string;
      }
    | {
          kind: 'tx';
          id: string;
          tx: TransactionRecord;
      };

type FilterOption = {
    value: TransactionListFilter;
    label: string;
};

const FILTER_OPTIONS: FilterOption[] = [
    { value: 'all', label: 'All' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'failed', label: 'Failed' },
    { value: 'canceled', label: 'Canceled' },
    { value: 'pending', label: 'Pending' },
];

function mapToRows(transactions: TransactionRecord[]): ListRow[] {
    const rows: ListRow[] = [];
    let currentHeader: string | null = null;

    for (const tx of transactions) {
        const header = formatTransactionDayLabel(tx.createdAt);
        if (header !== currentHeader) {
            rows.push({
                kind: 'header',
                id: `header-${header}-${tx.id}`,
                label: header,
            });
            currentHeader = header;
        }

        rows.push({
            kind: 'tx',
            id: tx.id,
            tx,
        });
    }

    return rows;
}

function parseFilterParam(value: string | string[] | undefined): TransactionListFilter {
    const resolved = Array.isArray(value) ? value[0] : value;
    const allowed: TransactionListFilter[] = ['all', 'confirmed', 'failed', 'canceled', 'pending'];
    if (resolved && allowed.includes(resolved as TransactionListFilter)) {
        return resolved as TransactionListFilter;
    }
    return 'all';
}

function getFilterEmptyMessage(filter: TransactionListFilter, hasContactFilter: boolean): string {
    if (hasContactFilter) {
        if (filter === 'all') {
            return 'No transactions for this contact yet.';
        }
        return `No ${filter} transactions for this contact.`;
    }

    if (filter === 'all') {
        return 'Completed sends will appear here.';
    }

    return `No ${filter} transactions yet.`;
}

export default function TransactionsHistoryScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        contactId?: string | string[];
        contactName?: string | string[];
        filter?: string | string[];
    }>();
    const contactId = Array.isArray(params.contactId) ? params.contactId[0] : params.contactId;
    const contactName = Array.isArray(params.contactName) ? params.contactName[0] : params.contactName;
    const [selectedFilter, setSelectedFilter] = useState<TransactionListFilter>(parseFilterParam(params.filter));
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const loadTransactions = useCallback(async () => {
        try {
            setLoading(true);
            const rows = await TransactionRepository.getTransactions({
                contactId,
                filter: selectedFilter,
                limit: 300,
            });
            setTransactions(rows);
        } catch (error) {
            console.error('Failed to load transactions:', error);
            Alert.alert('History unavailable', 'Could not load transaction history.');
        } finally {
            setLoading(false);
        }
    }, [contactId, selectedFilter]);

    useFocusEffect(
        useCallback(() => {
            loadTransactions();
        }, [loadTransactions])
    );

    const rows = useMemo(() => mapToRows(transactions), [transactions]);

    const handlePressTransaction = useCallback(
        (tx: TransactionRecord) => {
            router.push({
                pathname: '/transactions/[id]',
                params: { id: tx.id },
            });
        },
        [router]
    );

    const handleFilterChange = useCallback((nextFilter: TransactionListFilter) => {
        setSelectedFilter(nextFilter);
    }, []);

    return (
        <ScreenContainer>
            <AppHeader title="Transactions" showBack />

            {contactId ? (
                <View style={styles.filterBanner}>
                    <Text style={styles.filterText}>
                        {contactName ? `Showing: ${contactName}` : 'Showing filtered contact transactions'}
                    </Text>
                </View>
            ) : null}

            <View style={styles.chipsRow}>
                {FILTER_OPTIONS.map((option) => {
                    const active = selectedFilter === option.value;
                    return (
                        <TouchableOpacity
                            key={option.value}
                            style={[styles.chip, active && styles.chipActive]}
                            activeOpacity={0.7}
                            onPress={() => handleFilterChange(option.value)}
                        >
                            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{option.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <FlatList
                data={rows}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={42} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>No transactions yet</Text>
                            <Text style={styles.emptyHint}>
                                {getFilterEmptyMessage(selectedFilter, Boolean(contactId))}
                            </Text>
                        </View>
                    ) : null
                }
                renderItem={({ item }) => {
                    if (item.kind === 'header') {
                        return <Text style={styles.dayHeader}>{item.label}</Text>;
                    }

                    const tx = item.tx;
                    const amountUi = rawToAmountUi(BigInt(tx.amountRaw), tx.decimals);
                    const statusStyle = getTransactionStatusStyles(tx.status);

                    return (
                        <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => handlePressTransaction(tx)}>
                            <View style={styles.cardTopRow}>
                                <Text style={styles.amount}>{`${amountUi} ${tx.tokenSymbol}`}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                                    <Text style={[styles.statusLabel, { color: statusStyle.color }]}>
                                        {getTransactionStatusLabel(tx.status)}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.recipient} numberOfLines={1} ellipsizeMode="middle">
                                {`To ${tx.contactName || shortenAddress(tx.recipientAddress)}`}
                            </Text>
                            <Text style={styles.meta}>{`${formatTransactionTime(tx.createdAt)} · ${tx.network}`}</Text>
                        </TouchableOpacity>
                    );
                }}
                showsVerticalScrollIndicator={false}
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    filterBanner: {
        paddingHorizontal: Layout.spacing.md,
        paddingTop: Layout.spacing.sm,
    },
    filterText: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Layout.spacing.sm,
        paddingHorizontal: Layout.spacing.md,
        paddingTop: Layout.spacing.sm,
    },
    chip: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Layout.radius.round,
        paddingHorizontal: Layout.spacing.md,
        paddingVertical: 6,
        backgroundColor: Colors.background,
    },
    chipActive: {
        borderColor: Colors.text,
        backgroundColor: Colors.text,
    },
    chipLabel: {
        ...Typography.styles.caption,
        color: Colors.text,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
        fontSize: 11,
    },
    chipLabelActive: {
        color: Colors.background,
    },
    listContent: {
        paddingHorizontal: Layout.spacing.md,
        paddingVertical: Layout.spacing.md,
        paddingBottom: Layout.spacing.xxl,
    },
    dayHeader: {
        ...Typography.styles.caption,
        fontWeight: '700',
        color: Colors.textTertiary,
        marginTop: Layout.spacing.md,
        marginBottom: Layout.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Layout.radius.md,
        paddingHorizontal: Layout.spacing.md,
        paddingVertical: Layout.spacing.md,
        marginBottom: Layout.spacing.sm,
        backgroundColor: Colors.background,
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    amount: {
        ...Typography.styles.body,
        fontWeight: '700',
        color: Colors.text,
    },
    statusBadge: {
        borderRadius: Layout.radius.round,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusLabel: {
        ...Typography.styles.caption,
        fontWeight: '700',
        fontSize: 11,
    },
    recipient: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        marginTop: 6,
    },
    meta: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        marginTop: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 120,
        gap: Layout.spacing.sm,
    },
    emptyTitle: {
        ...Typography.styles.body,
        fontWeight: '700',
        color: Colors.text,
    },
    emptyHint: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
    },
});

