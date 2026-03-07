import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
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
    savingTemplate: boolean;
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
    savingTemplate,
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
    const translateY = useRef(new Animated.Value(0)).current;
    const scrollOffsetY = useRef(0);

    const resetSheetPosition = useCallback(() => {
        Animated.spring(translateY, {
            toValue: 0,
            damping: 22,
            stiffness: 220,
            mass: 0.7,
            useNativeDriver: true,
        }).start();
    }, [translateY]);

    const dismissWithSlide = useCallback(() => {
        Animated.timing(translateY, {
            toValue: 420,
            duration: 180,
            useNativeDriver: true,
        }).start(() => {
            translateY.setValue(0);
            onClose();
        });
    }, [onClose, translateY]);

    useEffect(() => {
        if (visible) {
            translateY.setValue(0);
        }
    }, [translateY, visible]);

    const dragResponder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                    const isDownwardVerticalSwipe =
                        gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);

                    if (!isDownwardVerticalSwipe) {
                        return false;
                    }

                    // Only start sheet drag when the inner content is already at the top.
                    return scrollOffsetY.current <= 0;
                },
                onPanResponderMove: (_, gestureState) => {
                    if (gestureState.dy > 0) {
                        translateY.setValue(gestureState.dy);
                    }
                },
                onPanResponderRelease: (_, gestureState) => {
                    if (gestureState.dy > 120 || gestureState.vy > 1.1) {
                        dismissWithSlide();
                        return;
                    }
                    resetSheetPosition();
                },
                onPanResponderTerminate: () => {
                    resetSheetPosition();
                },
            }),
        [dismissWithSlide, resetSheetPosition, translateY]
    );

    return (
        <>
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <View style={styles.overlay}>
                    <TouchableOpacity style={styles.backdropTapArea} activeOpacity={1} onPress={dismissWithSlide} />
                    <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} {...dragResponder.panHandlers}>
                        <View style={styles.handleTouchArea}>
                            <View style={styles.handle} />
                        </View>

                        <View style={styles.headerRow}>
                            <Text style={styles.title}>Send</Text>
                            <View style={styles.networkBadge}>
                                <Text style={styles.networkLabel}>{networkLabel}</Text>
                            </View>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                            scrollEventThrottle={16}
                            onScroll={(event) => {
                                scrollOffsetY.current = event.nativeEvent.contentOffset.y;
                            }}
                        >
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
                                        label="Template Label"
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
                                            loading={savingTemplate}
                                            disabled={
                                                savingTemplate ||
                                                !templateLabel.trim() ||
                                                !selectedToken ||
                                                !amount.trim()
                                            }
                                            style={styles.actionButton}
                                        />
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        <TextButton title="Close" onPress={dismissWithSlide} style={styles.closeButton} />
                    </Animated.View>
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
    backdropTapArea: {
        ...StyleSheet.absoluteFillObject,
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
    handleTouchArea: {
        alignSelf: 'center',
        paddingVertical: Layout.spacing.sm,
        paddingHorizontal: Layout.spacing.lg,
        marginBottom: Layout.spacing.xs,
    },
    handle: {
        alignSelf: 'center',
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.border,
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
