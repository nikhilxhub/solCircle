import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TokenBalance } from '@/shared/types';
import { Colors } from '@/shared/theme/Colors';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';

interface TokenSelectorProps {
    visible: boolean;
    tokens: TokenBalance[];
    selectedMint?: string;
    onClose: () => void;
    onSelect: (token: TokenBalance) => void;
}

export function TokenSelector({ visible, tokens, selectedMint, onClose, onSelect }: TokenSelectorProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <Text style={styles.title}>Select Asset</Text>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {tokens.map((token) => {
                            const isSelected = token.mintAddress === selectedMint;
                            return (
                                <TouchableOpacity
                                    key={`${token.mintAddress}-${token.tokenAccountAddress || 'native'}`}
                                    style={styles.row}
                                    onPress={() => {
                                        onSelect(token);
                                        onClose();
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.leftContent}>
                                        <Text style={styles.symbol}>{token.symbol}</Text>
                                        <Text style={styles.mint} numberOfLines={1}>
                                            {token.isNative ? 'Native SOL' : token.mintAddress}
                                        </Text>
                                    </View>
                                    <View style={styles.rightContent}>
                                        <Text style={styles.balance}>{token.amountUi}</Text>
                                        {isSelected && <Text style={styles.selected}>Selected</Text>}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonLabel}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.28)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: Layout.spacing.lg,
        paddingTop: Layout.spacing.sm,
        paddingBottom: Layout.spacing.lg,
        maxHeight: '78%',
    },
    handle: {
        alignSelf: 'center',
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.border,
        marginBottom: Layout.spacing.md,
    },
    title: {
        ...Typography.styles.title,
        fontSize: 24,
        marginBottom: Layout.spacing.md,
    },
    list: {
        marginBottom: Layout.spacing.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Layout.spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
    },
    leftContent: {
        flex: 1,
        paddingRight: Layout.spacing.md,
    },
    rightContent: {
        alignItems: 'flex-end',
    },
    symbol: {
        ...Typography.styles.body,
        fontWeight: '700',
        color: Colors.text,
    },
    mint: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    balance: {
        ...Typography.styles.body,
        color: Colors.text,
        fontWeight: '600',
    },
    selected: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
        fontSize: 10,
    },
    closeButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Layout.spacing.sm,
    },
    closeButtonLabel: {
        ...Typography.styles.body,
        fontWeight: '600',
    },
});
