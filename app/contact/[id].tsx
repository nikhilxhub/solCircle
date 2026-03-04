import { View, Text, StyleSheet, ScrollView, Linking, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/shared/components/ScreenContainer';
import { AppHeader } from '@/shared/components/AppHeader';
import { Avatar } from '@/shared/components/Avatar';
import { TextButton, IconActionButton } from '@/shared/components/Buttons';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';
import { Colors } from '@/shared/theme/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback, useMemo } from 'react';
import { ContactRepository } from '@/features/contacts/data/ContactRepository';
import { PaymentTemplateRepository } from '@/features/payments/data/PaymentTemplateRepository';
import { TransactionRepository, createTransactionId } from '@/features/transactions/data/TransactionRepository';
import { Contact, PaymentTemplate, TokenBalance, TransactionRecord } from '@/shared/types';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { SendSheet } from '@/shared/components/SendSheet';
import { TemplateChips } from '@/shared/components/TemplateChips';
import { useAppNetwork } from '@/features/settings/context/AppNetworkContext';
import {
    SOL_SENTINEL_MINT,
    amountToRaw,
    fetchTokenBalances,
    isValidPublicKey,
    rawToAmountUi,
    sendSolTransfer,
    sendSplTransfer,
} from '@/features/wallet/services/solanaTransfers';
import { PublicKey } from '@solana/web3.js';
import { getExplorerTxUrl, getWalletChain } from '@/features/wallet/services/network';
import { useWallet } from '@/features/wallet/hooks/useWallet';
import {
    getWalletErrorCode,
    getWalletErrorMessage,
    getWalletSendMessage,
    isWalletUserDeclinedError,
} from '@/features/wallet/services/walletErrors';
import {
    formatTransactionTime,
    getTransactionStatusLabel,
    getTransactionStatusStyles,
} from '@/features/transactions/services/transactionPresentation';

export default function ContactDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { network, networkLabel } = useAppNetwork();

    const [contact, setContact] = useState<Contact | null>(null);
    const [loading, setLoading] = useState(true);

    const [templates, setTemplates] = useState<PaymentTemplate[]>([]);
    const [contactTransactions, setContactTransactions] = useState<TransactionRecord[]>([]);
    const [loadingContactTransactions, setLoadingContactTransactions] = useState(false);
    const [sendVisible, setSendVisible] = useState(false);
    const [tokens, setTokens] = useState<TokenBalance[]>([]);
    const [selectedToken, setSelectedToken] = useState<TokenBalance | undefined>();
    const [loadingTokens, setLoadingTokens] = useState(false);
    const [sending, setSending] = useState(false);

    const [amount, setAmount] = useState('');
    const [memo, setMemo] = useState('');
    const [templateLabel, setTemplateLabel] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    const wallet = useWallet();
    const accountPublicKey: PublicKey | undefined = wallet.publicKey;
    const connectedWalletAddress = wallet.walletAddress;

    useFocusEffect(
        useCallback(() => {
            if (id) {
                loadContact(id as string);
                loadTemplates(id as string);
                loadContactTransactions(id as string);
            }
        }, [id])
    );

    const tokenMap = useMemo(() => {
        const map: Record<string, TokenBalance | undefined> = {};
        for (const token of tokens) {
            map[token.mintAddress] = token;
        }
        return map;
    }, [tokens]);

    const loadContact = async (contactId: string) => {
        try {
            setLoading(true);
            const data = await ContactRepository.getContactById(contactId);
            setContact(data);
        } catch (error) {
            console.error('Failed to load contact:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTemplates = async (contactId: string) => {
        try {
            const items = await PaymentTemplateRepository.getTemplatesByContact(contactId);
            setTemplates(items);
        } catch (error) {
            console.error('Failed to load payment templates:', error);
        }
    };

    const loadContactTransactions = async (contactId: string) => {
        try {
            setLoadingContactTransactions(true);
            const items = await TransactionRepository.getTransactions({ contactId, limit: 5 });
            setContactTransactions(items);
        } catch (error) {
            console.error('Failed to load contact transactions:', error);
        } finally {
            setLoadingContactTransactions(false);
        }
    };

    const refreshTokens = async (ownerOverride?: PublicKey) => {
        const owner = ownerOverride || accountPublicKey;
        if (!owner) {
            setTokens([]);
            setSelectedToken(undefined);
            return;
        }

        try {
            setLoadingTokens(true);
            const fetched = await fetchTokenBalances(wallet.connection, owner);
            setTokens(fetched);

            setSelectedToken((previous) => {
                if (!previous) {
                    return fetched[0];
                }
                return (
                    fetched.find(
                        (token) =>
                            token.mintAddress === previous.mintAddress &&
                            token.tokenAccountAddress === previous.tokenAccountAddress
                    ) || fetched[0]
                );
            });
        } catch (error) {
            console.error('Failed to fetch token balances:', error);
            Alert.alert('Balances unavailable', 'Could not load wallet balances. Please try again.');
        } finally {
            setLoadingTokens(false);
        }
    };

    const resetSendDraft = () => {
        setAmount('');
        setMemo('');
        setTemplateLabel('');
        setSelectedTemplateId(null);
    };

    const handleEdit = () => {
        router.push(`/contact/edit/${id}`);
    };

    const handleShare = () => {
        if (!contact) {
            return;
        }

        router.push({
            pathname: '/qr/generate',
            params: {
                name: contact.name,
                phoneNumber: contact.phoneNumber || '',
                walletAddress: contact.walletAddress || '',
                skrAddress: contact.skrAddress || '',
            },
        });
    };

    const handleCall = async () => {
        if (!contact?.phoneNumber) {
            Alert.alert('Error', 'No phone number available');
            return;
        }

        const normalizedNumber = contact.phoneNumber.trim().replace(/[^\d+]/g, '');
        if (!normalizedNumber) {
            Alert.alert('Error', 'Invalid phone number');
            return;
        }

        try {
            await Linking.openURL(`tel:${normalizedNumber}`);
        } catch (error) {
            console.error('Dialer open failed:', error);
            Alert.alert('Error', 'Phone dialer not available');
        }
    };

    const handleConnectWallet = async () => {
        if (wallet.connecting) {
            return;
        }

        try {
            const connectedPublicKey = await wallet.connect();
            await refreshTokens(connectedPublicKey);
        } catch (error) {
            console.error('Wallet connection failed:', error);
            Alert.alert('Wallet connection failed', wallet.getConnectErrorAlertMessage(error));
        }
    };

    const handleDisconnectWallet = async () => {
        try {
            await wallet.disconnect();
            setTokens([]);
            setSelectedToken(undefined);
        } catch (error) {
            console.error('Wallet disconnect failed:', error);
            Alert.alert('Wallet disconnect failed', wallet.getDisconnectErrorAlertMessage(error));
        }
    };

    const handleOpenSend = async () => {
        if (!contact?.walletAddress || !isValidPublicKey(contact.walletAddress)) {
            Alert.alert('Missing wallet', 'This contact does not have a valid Solana wallet address.');
            return;
        }

        setSendVisible(true);
        if (accountPublicKey) {
            await refreshTokens();
        }
    };

    const handleOpenTransactionDetail = (transactionId: string) => {
        router.push({
            pathname: '/transactions/[id]',
            params: { id: transactionId },
        });
    };

    const handleViewAllTransactions = () => {
        if (!contact) {
            return;
        }

        router.push({
            pathname: '/transactions',
            params: {
                contactId: contact.id,
                contactName: contact.name,
            },
        });
    };

    const handleTemplateSelect = (template: PaymentTemplate) => {
        const tokenFromWallet = tokens.find((item) => item.mintAddress === template.mintAddress);
        const decimals = tokenFromWallet?.decimals ?? (template.mintAddress === SOL_SENTINEL_MINT ? 9 : 0);

        const fallbackToken: TokenBalance = {
            mintAddress: template.mintAddress,
            symbol: template.mintAddress === SOL_SENTINEL_MINT ? 'SOL' : 'SPL',
            amountRaw: '0',
            amountUi: '0',
            decimals,
            isNative: template.mintAddress === SOL_SENTINEL_MINT,
        };

        setSelectedToken(tokenFromWallet || fallbackToken);
        setAmount(rawToAmountUi(BigInt(template.amountRaw), decimals));
        setMemo(template.memo || '');
        setTemplateLabel(template.label);
        setSelectedTemplateId(template.id);
        setSendVisible(true);
    };

    const handleSaveTemplate = async () => {
        if (!contact || !selectedToken) {
            return;
        }

        if (!templateLabel.trim()) {
            Alert.alert('Template label required', 'Enter a label before saving this template.');
            return;
        }

        try {
            const amountRaw = amountToRaw(amount, selectedToken.decimals);
            if (amountRaw <= 0n) {
                Alert.alert('Invalid amount', 'Template amount must be greater than zero.');
                return;
            }

            const now = Date.now();
            const template: PaymentTemplate = {
                id: `${now}-${Math.random().toString(36).slice(2, 10)}`,
                contactId: contact.id,
                label: templateLabel.trim(),
                mintAddress: selectedToken.mintAddress,
                amountRaw: amountRaw.toString(),
                memo: memo.trim() || undefined,
                createdAt: now,
                updatedAt: now,
                lastUsedAt: now,
            };

            await PaymentTemplateRepository.addTemplate(template);
            await loadTemplates(contact.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Template saved', 'This payment template is now available for quick sends.');
        } catch (error) {
            console.error('Failed to save payment template:', error);
            Alert.alert('Save failed', 'Could not save the payment template.');
        }
    };

    const handleSendNow = async () => {
        if (!contact?.walletAddress || !selectedToken) {
            return;
        }

        if (!isValidPublicKey(contact.walletAddress)) {
            Alert.alert('Invalid recipient', 'Recipient wallet address is not valid.');
            return;
        }

        if (!amount.trim()) {
            Alert.alert('Amount required', 'Enter an amount to send.');
            return;
        }

        const expectedWalletChain = getWalletChain(network);
        if (wallet.walletChain !== expectedWalletChain) {
            Alert.alert(
                'Wallet network mismatch',
                `Expected ${expectedWalletChain} but wallet is configured for ${wallet.walletChain}. Reconnect wallet and try again.`
            );
            return;
        }

        if (!wallet.connection?.rpcEndpoint) {
            Alert.alert('Wallet unavailable', 'Wallet RPC endpoint is unavailable. Reconnect wallet and try again.');
            return;
        }

        let sender: PublicKey;
        try {
            // Ensures wallet authorization is active before building the transaction.
            sender = await wallet.ensureConnected();
            if (!accountPublicKey || accountPublicKey.toBase58() !== sender.toBase58()) {
                await refreshTokens(sender);
            }
        } catch (error) {
            if (!isWalletUserDeclinedError(error)) {
                console.error('Wallet connection failed before send:', error);
            }
            Alert.alert('Wallet connection failed', wallet.getConnectErrorAlertMessage(error));
            return;
        }

        if (!sender) {
            Alert.alert('Wallet unavailable', 'No wallet account is available for sending.');
            return;
        }

        const transactionId = createTransactionId();
        const senderAddress = sender.toBase58();
        const recipientAddress = contact.walletAddress;
        let rawAmount: bigint = 0n;
        let transactionAttemptStored = false;

        try {
            rawAmount = amountToRaw(amount, selectedToken.decimals);
            if (rawAmount <= 0n) {
                Alert.alert('Invalid amount', 'Amount must be greater than zero.');
                return;
            }

            if (rawAmount > BigInt(selectedToken.amountRaw)) {
                Alert.alert('Insufficient balance', `Available ${selectedToken.symbol}: ${selectedToken.amountUi}`);
                return;
            }

            try {
                await TransactionRepository.createAttempt({
                    id: transactionId,
                    contactId: contact.id,
                    senderAddress,
                    recipientAddress,
                    mintAddress: selectedToken.mintAddress,
                    tokenSymbol: selectedToken.symbol,
                    decimals: selectedToken.decimals,
                    amountRaw: rawAmount.toString(),
                    memo: memo.trim() || undefined,
                    network,
                });
                transactionAttemptStored = true;
            } catch (historyError) {
                console.error('Failed to create transaction history record:', historyError);
            }

            setSending(true);
            const recipient = new PublicKey(contact.walletAddress);

            let signature: string;
            if (selectedToken.isNative) {
                signature = await sendSolTransfer({
                    connection: wallet.connection,
                    signTransaction: wallet.signTransaction,
                    signAndSendTransaction: wallet.signAndSendTransaction,
                    from: sender,
                    to: recipient,
                    amountUi: amount,
                    memo,
                });
            } else {
                if (!selectedToken.tokenAccountAddress) {
                    Alert.alert('Token account missing', 'Unable to resolve source token account for this asset.');
                    return;
                }

                signature = await sendSplTransfer({
                    connection: wallet.connection,
                    signTransaction: wallet.signTransaction,
                    signAndSendTransaction: wallet.signAndSendTransaction,
                    owner: sender,
                    destinationOwner: recipient,
                    mintAddress: selectedToken.mintAddress,
                    sourceTokenAccountAddress: selectedToken.tokenAccountAddress,
                    amountUi: amount,
                    decimals: selectedToken.decimals,
                    memo,
                });
            }

            try {
                if (!transactionAttemptStored) {
                    await TransactionRepository.createAttempt({
                        id: transactionId,
                        contactId: contact.id,
                        senderAddress,
                        recipientAddress,
                        mintAddress: selectedToken.mintAddress,
                        tokenSymbol: selectedToken.symbol,
                        decimals: selectedToken.decimals,
                        amountRaw: rawAmount.toString(),
                        memo: memo.trim() || undefined,
                        network,
                        status: 'submitted',
                    });
                    transactionAttemptStored = true;
                }
                await TransactionRepository.markSubmitted(transactionId, signature);
                await TransactionRepository.markConfirmed(transactionId, signature);
            } catch (historyError) {
                console.error('Failed to update transaction history after success:', historyError);
            }

            if (selectedTemplateId) {
                await PaymentTemplateRepository.touchTemplate(selectedTemplateId);
                await loadTemplates(contact.id);
            }

            await refreshTokens(sender);
            await loadContactTransactions(contact.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            Alert.alert('Transfer confirmed', 'Transaction sent successfully.', [
                {
                    text: 'Copy Signature',
                    onPress: () => Clipboard.setStringAsync(signature),
                },
                {
                    text: 'View Explorer',
                    onPress: () => Linking.openURL(getExplorerTxUrl(signature, network)),
                },
                {
                    text: 'Done',
                    style: 'default',
                    onPress: () => {
                        setSendVisible(false);
                        resetSendDraft();
                    },
                },
            ]);
        } catch (error: unknown) {
            const sendMessage = getWalletSendMessage(error);
            const errorCode = getWalletErrorCode(error);
            const errorMessage = getWalletErrorMessage(error);
            const status = isWalletUserDeclinedError(error) ? 'canceled' : 'failed';

            try {
                if (!transactionAttemptStored) {
                    await TransactionRepository.createAttempt({
                        id: transactionId,
                        contactId: contact.id,
                        senderAddress,
                        recipientAddress,
                        mintAddress: selectedToken.mintAddress,
                        tokenSymbol: selectedToken.symbol,
                        decimals: selectedToken.decimals,
                        amountRaw: rawAmount > 0n ? rawAmount.toString() : '0',
                        memo: memo.trim() || undefined,
                        network,
                        status: 'awaiting_approval',
                    });
                    transactionAttemptStored = true;
                }

                if (status === 'canceled') {
                    await TransactionRepository.markCanceled(transactionId, errorCode, errorMessage || sendMessage);
                } else {
                    await TransactionRepository.markFailed(transactionId, errorCode, errorMessage || sendMessage);
                }
            } catch (historyError) {
                console.error('Failed to update transaction history after error:', historyError);
            }

            await loadContactTransactions(contact.id);

            if (isWalletUserDeclinedError(error)) {
                Alert.alert('Transfer canceled', `${sendMessage}\n\n${wallet.getDisconnectErrorAlertMessage(error)}`);
                return;
            }

            console.error('Send failed:', error);
            Alert.alert('Transfer failed', `${sendMessage}\n\n${wallet.getDisconnectErrorAlertMessage(error)}`);
        } finally {
            setSending(false);
        }
    };

    const handleDelete = () => {
        if (!contact) {
            return;
        }

        Alert.alert('Delete Contact', `Are you sure you want to delete ${contact.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await ContactRepository.deleteContact(id as string);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        router.replace('/home');
                    } catch (error) {
                        console.error('Failed to delete contact:', error);
                        Alert.alert('Error', 'Failed to delete contact. Please try again.');
                    }
                },
            },
        ]);
    };

    const handleCopy = async (text: string) => {
        await Clipboard.setStringAsync(text);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    if (loading || !contact) {
        return (
            <ScreenContainer>
                <AppHeader title="" showBack />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text>{loading ? 'Loading...' : 'Contact not found'}</Text>
                </View>
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer>
            <AppHeader title="" showBack rightAction={<TextButton title="Edit" onPress={handleEdit} />} />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.identitySection}>
                    <Avatar name={contact.name} size={100} />
                    <Text style={styles.name}>{contact.name}</Text>
                    {contact.skrAddress && (
                        <Text style={styles.handle}>@{contact.skrAddress.replace('seeker:', '')}</Text>
                    )}
                </View>

                <TemplateChips templates={templates} tokenMap={tokenMap} onSelect={handleTemplateSelect} />

                <View style={styles.heroActions}>
                    <IconActionButton
                        icon={<Ionicons name="call" size={28} color={Colors.background} />}
                        label="Call"
                        onPress={handleCall}
                        style={styles.heroButtonPrimary}
                        labelStyle={styles.heroLabel}
                    />
                    <IconActionButton
                        icon={<Ionicons name="paper-plane" size={28} color={Colors.text} />}
                        label="Pay"
                        onPress={handleOpenSend}
                        style={styles.heroButtonSecondary}
                        labelStyle={styles.heroLabelSecondary}
                    />
                </View>

                <View style={styles.historySection}>
                    <View style={styles.historyHeaderRow}>
                        <Text style={styles.sectionTitle}>Recent Transactions</Text>
                        <TextButton title="View all" onPress={handleViewAllTransactions} />
                    </View>

                    {loadingContactTransactions ? (
                        <View style={styles.historyLoadingRow}>
                            <ActivityIndicator size="small" color={Colors.text} />
                            <Text style={styles.historyEmptyText}>Loading transactions...</Text>
                        </View>
                    ) : contactTransactions.length === 0 ? (
                        <Text style={styles.historyEmptyText}>No transactions with this contact yet.</Text>
                    ) : (
                        contactTransactions.map((transaction) => {
                            const amountUi = rawToAmountUi(BigInt(transaction.amountRaw), transaction.decimals);
                            const statusStyle = getTransactionStatusStyles(transaction.status);

                            return (
                                <TouchableOpacity
                                    key={transaction.id}
                                    style={styles.historyItem}
                                    activeOpacity={0.7}
                                    onPress={() => handleOpenTransactionDetail(transaction.id)}
                                >
                                    <View style={styles.historyItemTopRow}>
                                        <Text style={styles.historyAmount}>{`${amountUi} ${transaction.tokenSymbol}`}</Text>
                                        <View
                                            style={[
                                                styles.historyStatusBadge,
                                                { backgroundColor: statusStyle.backgroundColor },
                                            ]}
                                        >
                                            <Text style={[styles.historyStatusText, { color: statusStyle.color }]}>
                                                {getTransactionStatusLabel(transaction.status)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.historyMeta}>{`${formatTransactionTime(transaction.createdAt)} · ${transaction.network}`}</Text>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                <View style={styles.detailsSection}>
                    {contact.phoneNumber && (
                        <TouchableOpacity
                            style={styles.infoRow}
                            onPress={() => handleCopy(contact.phoneNumber!)}
                            activeOpacity={0.6}
                        >
                            <Text style={styles.infoLabel}>MOBILE</Text>
                            <Text style={styles.infoValue}>{contact.phoneNumber}</Text>
                        </TouchableOpacity>
                    )}
                    {contact.walletAddress && (
                        <TouchableOpacity
                            style={styles.infoRow}
                            onPress={() => handleCopy(contact.walletAddress!)}
                            activeOpacity={0.6}
                        >
                            <Text style={styles.infoLabel}>WALLET</Text>
                            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
                                {contact.walletAddress}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {contact.notes && (
                        <View style={styles.notesContainer}>
                            <Text style={styles.infoLabel}>NOTES</Text>
                            <Text style={styles.notesValue}>{contact.notes}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.footerActions}>
                    <TextButton title="Share Contact" onPress={handleShare} style={styles.footerButton} />
                    <TextButton
                        title="Delete"
                        onPress={handleDelete}
                        style={styles.footerButton}
                        labelStyle={{ color: Colors.error || '#FF3B30' }}
                    />
                </View>
            </ScrollView>

            <SendSheet
                visible={sendVisible}
                recipientName={contact.name}
                recipientAddress={contact.walletAddress || ''}
                networkLabel={networkLabel}
                walletAddress={connectedWalletAddress}
                tokens={tokens}
                selectedToken={selectedToken}
                loadingTokens={loadingTokens}
                connectingWallet={wallet.connecting}
                sending={sending}
                amount={amount}
                memo={memo}
                templateLabel={templateLabel}
                onClose={() => {
                    setSendVisible(false);
                    resetSendDraft();
                }}
                onConnect={handleConnectWallet}
                onDisconnect={handleDisconnectWallet}
                onRefreshTokens={refreshTokens}
                onSelectToken={(token) => {
                    setSelectedToken(token);
                    setSelectedTemplateId(null);
                }}
                onAmountChange={(value) => {
                    setAmount(value);
                    setSelectedTemplateId(null);
                }}
                onMemoChange={(value) => {
                    setMemo(value);
                    setSelectedTemplateId(null);
                }}
                onTemplateLabelChange={setTemplateLabel}
                onSend={handleSendNow}
                onSaveTemplate={handleSaveTemplate}
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        paddingHorizontal: Layout.spacing.xl,
        paddingBottom: Layout.spacing.xxl,
    },
    identitySection: {
        alignItems: 'center',
        marginTop: Layout.spacing.lg,
        marginBottom: Layout.spacing.lg,
    },
    name: {
        ...Typography.styles.title,
        fontSize: 32,
        marginTop: Layout.spacing.md,
        fontWeight: '700',
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    handle: {
        ...Typography.styles.body,
        color: Colors.textTertiary,
        marginTop: 4,
        fontSize: 16,
    },
    heroActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Layout.spacing.xl,
        marginBottom: Layout.spacing.xxl,
        marginTop: Layout.spacing.md,
    },
    heroButtonPrimary: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.text,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 6,
    },
    heroButtonSecondary: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    heroLabel: {
        marginTop: 8,
        fontWeight: '600',
        color: Colors.text,
    },
    heroLabelSecondary: {
        marginTop: 8,
        fontWeight: '600',
        color: Colors.text,
    },
    historySection: {
        marginBottom: Layout.spacing.xl,
    },
    historyHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Layout.spacing.sm,
    },
    sectionTitle: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '700',
    },
    historyLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Layout.spacing.sm,
        paddingVertical: Layout.spacing.sm,
    },
    historyEmptyText: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
    },
    historyItem: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Layout.radius.md,
        paddingHorizontal: Layout.spacing.md,
        paddingVertical: Layout.spacing.sm,
        marginBottom: Layout.spacing.sm,
    },
    historyItemTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    historyAmount: {
        ...Typography.styles.body,
        fontWeight: '700',
        color: Colors.text,
    },
    historyStatusBadge: {
        borderRadius: Layout.radius.round,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    historyStatusText: {
        ...Typography.styles.caption,
        fontWeight: '700',
        fontSize: 11,
    },
    historyMeta: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        marginTop: 4,
    },
    detailsSection: {
        marginBottom: Layout.spacing.xxl,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Layout.spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
    },
    infoLabel: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        fontWeight: '700',
        letterSpacing: 1,
        fontSize: 11,
    },
    infoValue: {
        ...Typography.styles.body,
        fontWeight: '500',
        color: Colors.text,
        textAlign: 'right',
        maxWidth: '70%',
    },
    notesContainer: {
        marginTop: Layout.spacing.lg,
    },
    notesValue: {
        ...Typography.styles.body,
        color: Colors.textSecondary,
        marginTop: Layout.spacing.sm,
        lineHeight: 22,
    },
    footerActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 'auto',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: Colors.border,
        paddingTop: Layout.spacing.lg,
    },
    footerButton: {
        paddingHorizontal: Layout.spacing.lg,
    },
});
