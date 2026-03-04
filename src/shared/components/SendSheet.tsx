import React, { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/shared/theme/Colors';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';
import { TokenBalance } from '@/shared/types';
import { InputField } from './InputField';
import { PrimaryButton, TextButton } from './Buttons';
import { TokenSelector } from './TokenSelector';

interface SendSheetProps {
    visible: boolean;
    recipientName: string;
    recipientAddress: string;
    networkLabel: string;
    walletAddress?: string;
    tokens: TokenBalance[];
    selectedToken?: TokenBalance;
    loadingTokens: boolean;
    connectingWallet: boolean;
    sending: boolean;
    amount: string;
    memo: string;
    templateLabel: string;
    onClose: () => void;
    onConnect: () => Promise<void>;
    onDisconnect: () => Promise<void>;
    onRefreshTokens: () => Promise<void>;
    onSelectToken: (token: TokenBalance) => void;
    onAmountChange: (value: string) => void;
    onMemoChange: (value: string) => void;
    onTemplateLabelChange: (value: string) => void;
    onSend: () => Promise<void>;
    onSaveTemplate: () => Promise<void>;
}

export function SendSheet({
    visible,
    recipientName,
    recipientAddress,
    networkLabel,
    walletAddress,
    tokens,
    selectedToken,
    loadingTokens,
    connectingWallet,
    sending,
    amount,
    memo,
    templateLabel,
    onClose,
    onConnect,
    onDisconnect,
    onRefreshTokens,
    onSelectToken,
    onAmountChange,
    onMemoChange,
    onTemplateLabelChange,
    onSend,
    onSaveTemplate,
}: SendSheetProps) {
    const [tokenSelectorOpen, setTokenSelectorOpen] = useState(false);

    return (
        <>
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <View style={styles.overlay}>
                    <View style={styles.sheet}>
                        <View style={styles.handle} />

                        <View style={styles.headerRow}>
                            <Text style={styles.title}>Send</Text>
                            <View style={styles.networkBadge}>
                                <Text style={styles.networkLabel}>{networkLabel}</Text>
                            </View>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                            <View style={styles.identityBlock}>
                                <Text style={styles.sectionLabel}>To</Text>
                                <Text style={styles.toName}>{recipientName}</Text>
                                <Text style={styles.toAddress} numberOfLines={1} ellipsizeMode="middle">
                                    {recipientAddress}
                                </Text>
                            </View>

                            {!walletAddress ? (
                                <View style={styles.walletBlock}>
                                    <Text style={styles.warningText}>Connect wallet to continue.</Text>
                                    <PrimaryButton
                                        title="Connect Wallet"
                                        onPress={onConnect}
                                        loading={connectingWallet}
                                        disabled={connectingWallet}
                                        style={styles.connectButton}
                                    />
                                </View>
                            ) : (
                                <View style={styles.walletBlock}>
                                    <Text style={styles.sectionLabel}>From</Text>
                                    <View style={styles.walletRow}>
                                        <Text style={styles.walletText} numberOfLines={1} ellipsizeMode="middle">
                                            {walletAddress}
                                        </Text>
                                        <TextButton title="Disconnect" onPress={onDisconnect} />
                                    </View>
                                </View>
                            )}

                            {walletAddress && (
                                <>
                                    <TouchableOpacity
                                        style={styles.assetPicker}
                                        onPress={() => setTokenSelectorOpen(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.sectionLabel}>Asset</Text>
                                        <Text style={styles.assetValue}>
                                            {selectedToken ? `${selectedToken.symbol} · ${selectedToken.amountUi}` : 'Select asset'}
                                        </Text>
                                    </TouchableOpacity>

                                    <InputField
                                        label="Amount"
                                        value={amount}
                                        onChangeText={onAmountChange}
                                        placeholder="0.0"
                                        keyboardType="decimal-pad"
                                    />
                                    <InputField
                                        label="Memo (Optional)"
                                        value={memo}
                                        onChangeText={onMemoChange}
                                        placeholder="Payment note"
                                    />
                                    <InputField
                                        label="Template Label (Optional)"
                                        value={templateLabel}
                                        onChangeText={onTemplateLabelChange}
                                        placeholder="Rent, Lunch, Weekly payout"
                                    />

                                    <View style={styles.inlineActions}>
                                        <TextButton title="Refresh Balances" onPress={onRefreshTokens} />
                                        {loadingTokens && <ActivityIndicator size="small" color={Colors.text} />}
                                    </View>

                                    <View style={styles.actionStack}>
                                        <PrimaryButton
                                            title="Send"
                                            onPress={onSend}
                                            loading={sending}
                                            disabled={!selectedToken || !amount.trim()}
                                            style={styles.actionButton}
                                        />
                                        <PrimaryButton
                                            title="Save Template"
                                            onPress={onSaveTemplate}
                                            variant="outline"
                                            disabled={!templateLabel.trim() || !selectedToken || !amount.trim()}
                                            style={styles.actionButton}
                                        />
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        <TextButton title="Close" onPress={onClose} style={styles.closeButton} />
                    </View>
                </View>
            </Modal>

            <TokenSelector
                visible={tokenSelectorOpen}
                tokens={tokens}
                selectedMint={selectedToken?.mintAddress}
                onClose={() => setTokenSelectorOpen(false)}
                onSelect={onSelectToken}
            />
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.28)',
    },
    sheet: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: Layout.spacing.lg,
        paddingTop: Layout.spacing.sm,
        paddingBottom: Layout.spacing.lg,
        maxHeight: '90%',
    },
    handle: {
        alignSelf: 'center',
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.border,
        marginBottom: Layout.spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Layout.spacing.sm,
    },
    title: {
        ...Typography.styles.title,
        fontSize: 28,
        letterSpacing: -0.7,
    },
    networkBadge: {
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Layout.spacing.sm,
        paddingVertical: 6,
        borderRadius: Layout.radius.round,
        backgroundColor: Colors.background,
    },
    networkLabel: {
        ...Typography.styles.caption,
        color: Colors.text,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scrollContent: {
        paddingBottom: Layout.spacing.sm,
    },
    identityBlock: {
        marginTop: Layout.spacing.md,
        marginBottom: Layout.spacing.xl,
    },
    sectionLabel: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '700',
    },
    toName: {
        ...Typography.styles.title,
        fontSize: 24,
        marginTop: Layout.spacing.xs,
    },
    toAddress: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    walletBlock: {
        marginBottom: Layout.spacing.lg,
    },
    warningText: {
        ...Typography.styles.body,
        color: Colors.textSecondary,
        marginBottom: Layout.spacing.md,
    },
    connectButton: {
        marginTop: Layout.spacing.xs,
    },
    walletRow: {
        marginTop: Layout.spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
        paddingBottom: Layout.spacing.xs,
    },
    walletText: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        maxWidth: '72%',
    },
    assetPicker: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingBottom: Layout.spacing.sm,
        marginBottom: Layout.spacing.sm,
    },
    assetValue: {
        ...Typography.styles.body,
        color: Colors.text,
        fontWeight: '700',
        marginTop: 4,
    },
    inlineActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Layout.spacing.sm,
        marginTop: Layout.spacing.sm,
        marginBottom: Layout.spacing.md,
    },
    actionStack: {
        gap: Layout.spacing.sm,
        marginTop: Layout.spacing.xs,
    },
    actionButton: {
        width: '100%',
    },
    closeButton: {
        marginTop: Layout.spacing.xs,
    },
});
