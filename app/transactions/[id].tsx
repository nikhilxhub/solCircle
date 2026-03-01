import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenContainer } from '@/shared/components/ScreenContainer';
import { Colors } from '@/shared/theme/Colors';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';
import { rawToAmountUi } from '@/features/wallet/services/solanaTransfers';
import { getExplorerTxUrl } from '@/features/wallet/services/network';
import { TransactionRepository } from '@/features/transactions/data/TransactionRepository';
import { TransactionRecord } from '@/shared/types';
import {
    formatTransactionDateTime,
    getTransactionStatusLabel,
    getTransactionStatusStyles,
    shortenAddress,
} from '@/features/transactions/services/transactionPresentation';

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
        </View>
    );
}

export default function TransactionDetailScreen() {
    const params = useLocalSearchParams<{ id?: string | string[] }>();
    const transactionId = Array.isArray(params.id) ? params.id[0] : params.id;

    const [transaction, setTransaction] = useState<TransactionRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadTransaction = useCallback(async () => {
        if (!transactionId) {
            setTransaction(null);
            setLoading(false);
            return;
        }

        try {
            const tx = await TransactionRepository.getTransactionById(transactionId);
            setTransaction(tx);
        } catch (error) {
            console.error('Failed to load transaction detail:', error);
            Alert.alert('Transaction unavailable', 'Could not load transaction details.');
        } finally {
            setLoading(false);
        }
    }, [transactionId]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            void loadTransaction();
        }, [loadTransaction])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadTransaction();
        setRefreshing(false);
    }, [loadTransaction]);

    const summary = useMemo(() => {
        if (!transaction) {
            return null;
        }

        return {
            amountUi: rawToAmountUi(BigInt(transaction.amountRaw), transaction.decimals),
            statusLabel: getTransactionStatusLabel(transaction.status),
            statusStyle: getTransactionStatusStyles(transaction.status),
            createdAtLabel: formatTransactionDateTime(transaction.createdAt),
            confirmedAtLabel: transaction.confirmedAt ? formatTransactionDateTime(transaction.confirmedAt) : undefined,
        };
    }, [transaction]);

    const handleCopy = useCallback(async (value: string, label: string) => {
        await Clipboard.setStringAsync(value);
        Alert.alert('Copied', `${label} copied to clipboard.`);
    }, []);

    const handleViewExplorer = useCallback(async () => {
        if (!transaction?.signature) {
            return;
        }
        await Linking.openURL(getExplorerTxUrl(transaction.signature, transaction.network));
    }, [transaction]);

    if (loading) {
        return (
            <ScreenContainer>
                <AppHeader title="Transaction" showBack />
                <View style={styles.centerState}>
                    <Text style={styles.centerStateText}>Loading transaction...</Text>
                </View>
            </ScreenContainer>
        );
    }

    if (!transaction || !summary) {
        return (
            <ScreenContainer>
                <AppHeader title="Transaction" showBack />
                <View style={styles.centerState}>
                    <Ionicons name="alert-circle-outline" size={40} color={Colors.textTertiary} />
                    <Text style={styles.centerStateText}>Transaction not found.</Text>
                </View>
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer>
            <AppHeader title="Transaction" showBack />
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.text} />}
            >
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryAmount}>{`${summary.amountUi} ${transaction.tokenSymbol}`}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: summary.statusStyle.backgroundColor }]}>
                        <Text style={[styles.statusLabel, { color: summary.statusStyle.color }]}>
                            {summary.statusLabel}
                        </Text>
                    </View>
                    <Text style={styles.summaryTime}>{summary.createdAtLabel}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Transfer</Text>
                    <DetailRow
                        label="To"
                        value={
                            transaction.contactName
                                ? `${transaction.contactName} (${shortenAddress(transaction.recipientAddress)})`
                                : shortenAddress(transaction.recipientAddress)
                        }
                    />
                    <DetailRow label="From" value={shortenAddress(transaction.senderAddress)} />
                    <DetailRow label="Network" value={transaction.network} />
                    <DetailRow label="Token Mint" value={shortenAddress(transaction.mintAddress)} />
                    {summary.confirmedAtLabel ? <DetailRow label="Confirmed At" value={summary.confirmedAtLabel} /> : null}
                    {transaction.memo ? <DetailRow label="Memo" value={transaction.memo} /> : null}
                </View>

                {transaction.signature ? (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Signature</Text>
                        <Text style={styles.signatureText} numberOfLines={2} ellipsizeMode="middle">
                            {transaction.signature}
                        </Text>
                        <TouchableOpacity
                            style={styles.inlineAction}
                            onPress={() => handleCopy(transaction.signature!, 'Signature')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="copy-outline" size={16} color={Colors.text} />
                            <Text style={styles.inlineActionText}>Copy Signature</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {(transaction.errorCode || transaction.errorMessage) && (
                    <View style={styles.errorCard}>
                        <Text style={styles.errorTitle}>Error Details</Text>
                        {transaction.errorCode ? <DetailRow label="Code" value={transaction.errorCode} /> : null}
                        {transaction.errorMessage ? <DetailRow label="Message" value={transaction.errorMessage} /> : null}
                    </View>
                )}

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionButton, !transaction.signature && styles.actionButtonDisabled]}
                        onPress={handleViewExplorer}
                        activeOpacity={0.7}
                        disabled={!transaction.signature}
                    >
                        <Text style={[styles.actionLabel, !transaction.signature && styles.actionLabelDisabled]}>
                            View Explorer
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleCopy(transaction.recipientAddress, 'Recipient address')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.actionLabel}>Copy Recipient</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleCopy(transaction.senderAddress, 'Sender address')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.actionLabel}>Copy Sender</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: Layout.spacing.md,
        paddingTop: Layout.spacing.md,
        paddingBottom: Layout.spacing.xxl,
        gap: Layout.spacing.md,
    },
    centerState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Layout.spacing.sm,
    },
    centerStateText: {
        ...Typography.styles.body,
        color: Colors.textSecondary,
    },
    summaryCard: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Layout.radius.md,
        padding: Layout.spacing.md,
        backgroundColor: Colors.background,
        gap: Layout.spacing.sm,
    },
    summaryAmount: {
        ...Typography.styles.title,
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
    },
    summaryTime: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
    },
    statusBadge: {
        borderRadius: Layout.radius.round,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
    },
    statusLabel: {
        ...Typography.styles.caption,
        fontWeight: '700',
        fontSize: 11,
    },
    card: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Layout.radius.md,
        paddingHorizontal: Layout.spacing.md,
        paddingVertical: Layout.spacing.md,
        backgroundColor: Colors.background,
    },
    errorCard: {
        borderWidth: 1,
        borderColor: '#F2CACA',
        borderRadius: Layout.radius.md,
        paddingHorizontal: Layout.spacing.md,
        paddingVertical: Layout.spacing.md,
        backgroundColor: '#FFF8F8',
    },
    sectionTitle: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Layout.spacing.sm,
    },
    errorTitle: {
        ...Typography.styles.caption,
        color: '#9D2020',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Layout.spacing.sm,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
    },
    rowLabel: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        flex: 0.45,
    },
    rowValue: {
        ...Typography.styles.caption,
        color: Colors.text,
        textAlign: 'right',
        flex: 0.55,
    },
    signatureText: {
        ...Typography.styles.caption,
        color: Colors.text,
        marginBottom: Layout.spacing.sm,
    },
    inlineAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Layout.spacing.xs,
        alignSelf: 'flex-start',
    },
    inlineActionText: {
        ...Typography.styles.caption,
        color: Colors.text,
        fontWeight: '600',
    },
    actions: {
        gap: Layout.spacing.sm,
    },
    actionButton: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Layout.radius.md,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.background,
    },
    actionButtonDisabled: {
        backgroundColor: '#F6F6F6',
    },
    actionLabel: {
        ...Typography.styles.body,
        fontWeight: '600',
        color: Colors.text,
    },
    actionLabelDisabled: {
        color: Colors.textTertiary,
    },
});

