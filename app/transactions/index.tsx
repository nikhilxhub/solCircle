import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenContainer } from '@/shared/components/ScreenContainer';
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

type Rhythm = {
    compact: boolean;
    xxs: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    radius: number;
    chipHeight: number;
    maxWidth: number;
};

const FILTER_OPTIONS: FilterOption[] = [
    { value: 'all', label: 'All' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'failed', label: 'Failed' },
    { value: 'canceled', label: 'Canceled' },
    { value: 'pending', label: 'Pending' },
];
const TRANSACTION_PAGE_SIZE = 100;

function createRhythm(width: number): Rhythm {
    const phi = 1.618;
    const compact = width < 360;
    const base = compact ? 7 : width > 420 ? 9 : 8;
    const xxs = Math.round(base);
    const xs = Math.round(xxs * phi);
    const sm = Math.round(xs * phi);
    const md = Math.round(sm * phi);
    const lg = Math.round(md * phi);

    return {
        compact,
        xxs,
        xs,
        sm,
        md,
        lg,
        xl: Math.round(lg * 1.1),
        radius: compact ? 13 : 16,
        chipHeight: compact ? 32 : 34,
        maxWidth: compact ? 680 : 760,
    };
}

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

function createStyles(r: Rhythm) {
    return StyleSheet.create({
        screen: {
            backgroundColor: '#F6F6F4',
        },
        viewport: {
            flex: 1,
            width: '100%',
            maxWidth: r.maxWidth,
            alignSelf: 'center',
        },
        listContent: {
            paddingHorizontal: r.sm,
            paddingBottom: r.xl,
        },
        listHeader: {
            paddingTop: r.xs,
            paddingBottom: r.sm,
            gap: r.sm,
        },
        scopeCard: {
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: r.radius,
            backgroundColor: Colors.background,
            paddingHorizontal: r.sm,
            paddingVertical: r.xs,
        },
        scopeLabel: {
            ...Typography.styles.caption,
            color: Colors.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            fontWeight: '700',
        },
        scopeValue: {
            ...Typography.styles.body,
            color: Colors.text,
            fontWeight: '600',
            marginTop: 4,
        },
        chipsWrap: {
            marginHorizontal: -r.sm,
            paddingHorizontal: r.sm,
        },
        chipsContent: {
            alignItems: 'center',
            paddingRight: r.sm,
            gap: r.xs,
        },
        chip: {
            minHeight: r.chipHeight,
            minWidth: r.compact ? 70 : 76,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 999,
            paddingHorizontal: r.sm,
            justifyContent: 'center',
            alignItems: 'center',
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
            letterSpacing: 0.8,
            fontSize: r.compact ? 10 : 11,
        },
        chipLabelActive: {
            color: Colors.background,
        },
        sectionRow: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: r.xs,
        },
        sectionTitle: {
            ...Typography.styles.body,
            color: Colors.text,
            fontWeight: '700',
            fontSize: r.compact ? 19 : 21,
            lineHeight: r.compact ? 24 : 26,
            letterSpacing: -0.3,
        },
        sectionMeta: {
            ...Typography.styles.caption,
            color: Colors.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            fontWeight: '700',
        },
        dayHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: r.sm,
            marginBottom: r.xs,
            gap: r.xs,
        },
        dayHeaderText: {
            ...Typography.styles.caption,
            fontWeight: '700',
            color: Colors.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: 1,
        },
        dayHeaderRule: {
            flex: 1,
            height: StyleSheet.hairlineWidth,
            backgroundColor: Colors.border,
        },
        card: {
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: r.radius,
            paddingHorizontal: r.sm,
            paddingVertical: r.sm,
            marginBottom: r.xs,
            backgroundColor: Colors.background,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
        },
        cardMainRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: r.xs,
        },
        cardPrimaryCol: {
            flex: 0.62,
            minWidth: 0,
        },
        cardSecondaryCol: {
            flex: 0.38,
            alignItems: 'flex-end',
            minWidth: 0,
            gap: 6,
        },
        amount: {
            ...Typography.styles.body,
            fontWeight: '700',
            fontSize: r.compact ? 21 : 23,
            lineHeight: r.compact ? 26 : 29,
            color: Colors.text,
            letterSpacing: -0.4,
        },
        recipient: {
            ...Typography.styles.caption,
            color: Colors.textSecondary,
            marginTop: 4,
        },
        statusBadge: {
            borderRadius: 999,
            paddingHorizontal: r.xs,
            paddingVertical: 4,
        },
        statusLabel: {
            ...Typography.styles.caption,
            fontWeight: '700',
            fontSize: 11,
        },
        timeText: {
            ...Typography.styles.caption,
            color: Colors.textSecondary,
        },
        cardFooterRow: {
            marginTop: r.xs,
            paddingTop: r.xs,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: Colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: r.xs,
        },
        networkMeta: {
            ...Typography.styles.caption,
            color: Colors.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            fontWeight: '700',
        },
        footerHint: {
            ...Typography.styles.caption,
            color: Colors.textSecondary,
            fontWeight: '600',
        },
        loadingState: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: r.md,
            gap: r.xs,
        },
        loadingMoreState: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: r.sm,
            gap: r.xs,
        },
        loadingText: {
            ...Typography.styles.caption,
            color: Colors.textSecondary,
        },
        emptyState: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: r.md,
            gap: r.xs,
        },
        emptyTitle: {
            ...Typography.styles.body,
            fontWeight: '700',
            color: Colors.text,
        },
        emptyHint: {
            ...Typography.styles.caption,
            color: Colors.textSecondary,
            textAlign: 'center',
        },
    });
}

export default function TransactionsHistoryScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const rhythm = useMemo(() => createRhythm(width), [width]);
    const styles = useMemo(() => createStyles(rhythm), [rhythm]);

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
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [nextOffset, setNextOffset] = useState(0);
    const loadingMoreRef = useRef(false);

    const loadInitialTransactions = useCallback(async () => {
        try {
            setLoading(true);
            setLoadingMore(false);
            loadingMoreRef.current = false;
            setHasMore(true);
            setNextOffset(0);
            const rows = await TransactionRepository.getTransactions({
                contactId,
                filter: selectedFilter,
                limit: TRANSACTION_PAGE_SIZE,
                offset: 0,
            });
            setTransactions(rows);
            setNextOffset(rows.length);
            setHasMore(rows.length === TRANSACTION_PAGE_SIZE);
        } catch (error) {
            console.error('Failed to load transactions:', error);
            Alert.alert('History unavailable', 'Could not load transaction history.');
        } finally {
            setLoading(false);
        }
    }, [contactId, selectedFilter]);

    const loadMoreTransactions = useCallback(async () => {
        if (loading || loadingMoreRef.current || !hasMore) {
            return;
        }

        const currentOffset = nextOffset;
        try {
            loadingMoreRef.current = true;
            setLoadingMore(true);
            const rows = await TransactionRepository.getTransactions({
                contactId,
                filter: selectedFilter,
                limit: TRANSACTION_PAGE_SIZE,
                offset: currentOffset,
            });
            setTransactions((prev) => [...prev, ...rows]);
            setNextOffset(currentOffset + rows.length);
            setHasMore(rows.length === TRANSACTION_PAGE_SIZE);
        } catch (error) {
            console.error('Failed to load more transactions:', error);
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    }, [contactId, hasMore, loading, nextOffset, selectedFilter]);

    const handleEndReached = useCallback(() => {
        void loadMoreTransactions();
    }, [loadMoreTransactions]);

    useFocusEffect(
        useCallback(() => {
            void loadInitialTransactions();
        }, [loadInitialTransactions])
    );

    const rows = useMemo(() => mapToRows(transactions), [transactions]);
    const activeFilterLabel = useMemo(() => {
        return FILTER_OPTIONS.find((option) => option.value === selectedFilter)?.label ?? 'All';
    }, [selectedFilter]);
    const sectionMeta = useMemo(() => {
        const countLabel = `${transactions.length} ${transactions.length === 1 ? 'transaction' : 'transactions'}`;
        if (selectedFilter === 'all') {
            return countLabel;
        }
        return `${activeFilterLabel} | ${countLabel}`;
    }, [activeFilterLabel, selectedFilter, transactions.length]);

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
        <ScreenContainer style={styles.screen}>
            <AppHeader title="Transactions" showBack />
            <View style={styles.viewport}>
                <FlatList
                    data={rows}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={
                        <View style={styles.listHeader}>
                            {contactId ? (
                                <View style={styles.scopeCard}>
                                    <Text style={styles.scopeLabel}>Scope</Text>
                                    <Text style={styles.scopeValue} numberOfLines={1}>
                                        {contactName || 'Filtered contact transactions'}
                                    </Text>
                                </View>
                            ) : null}

                            <ScrollView
                                horizontal
                                style={styles.chipsWrap}
                                contentContainerStyle={styles.chipsContent}
                                showsHorizontalScrollIndicator={false}
                            >
                                {FILTER_OPTIONS.map((option) => {
                                    const active = selectedFilter === option.value;
                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[styles.chip, active && styles.chipActive]}
                                            activeOpacity={0.8}
                                            onPress={() => handleFilterChange(option.value)}
                                        >
                                            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <View style={styles.sectionRow}>
                                <Text style={styles.sectionTitle}>Activity</Text>
                                <Text style={styles.sectionMeta}>{sectionMeta}</Text>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        loading ? (
                            <View style={styles.loadingState}>
                                <ActivityIndicator size="small" color={Colors.text} />
                                <Text style={styles.loadingText}>Loading transactions...</Text>
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="receipt-outline" size={42} color={Colors.textTertiary} />
                                <Text style={styles.emptyTitle}>No transactions yet</Text>
                                <Text style={styles.emptyHint}>
                                    {getFilterEmptyMessage(selectedFilter, Boolean(contactId))}
                                </Text>
                            </View>
                        )
                    }
                    renderItem={({ item, index }) => {
                        if (item.kind === 'header') {
                            return (
                                <View style={[styles.dayHeaderRow, index === 0 && { marginTop: 0 }]}>
                                    <Text style={styles.dayHeaderText}>{item.label}</Text>
                                    <View style={styles.dayHeaderRule} />
                                </View>
                            );
                        }

                        const tx = item.tx;
                        const amountUi = rawToAmountUi(BigInt(tx.amountRaw), tx.decimals);
                        const statusStyle = getTransactionStatusStyles(tx.status);

                        return (
                            <TouchableOpacity
                                style={styles.card}
                                activeOpacity={0.85}
                                onPress={() => handlePressTransaction(tx)}
                            >
                                <View style={styles.cardMainRow}>
                                    <View style={styles.cardPrimaryCol}>
                                        <Text style={styles.amount}>{`${amountUi} ${tx.tokenSymbol}`}</Text>
                                        <Text style={styles.recipient} numberOfLines={1} ellipsizeMode="middle">
                                            {`To ${tx.contactName || shortenAddress(tx.recipientAddress)}`}
                                        </Text>
                                    </View>

                                    <View style={styles.cardSecondaryCol}>
                                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                                            <Text style={[styles.statusLabel, { color: statusStyle.color }]}>
                                                {getTransactionStatusLabel(tx.status)}
                                            </Text>
                                        </View>
                                        <Text style={styles.timeText}>{formatTransactionTime(tx.createdAt)}</Text>
                                    </View>
                                </View>
                                <View style={styles.cardFooterRow}>
                                    <Text style={styles.networkMeta}>{tx.network}</Text>
                                    <Text style={styles.footerHint}>Details</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    onEndReachedThreshold={0.4}
                    onEndReached={handleEndReached}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={styles.loadingMoreState}>
                                <ActivityIndicator size="small" color={Colors.text} />
                                <Text style={styles.loadingText}>Loading more transactions...</Text>
                            </View>
                        ) : null
                    }
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </ScreenContainer>
    );
}
