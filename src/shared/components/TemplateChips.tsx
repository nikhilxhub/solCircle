import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PaymentTemplate, TokenBalance } from '@/shared/types';
import { Colors } from '@/shared/theme/Colors';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';
import { SOL_SENTINEL_MINT, rawToAmountUi } from '@/features/wallet/services/solanaTransfers';

interface TemplateChipsProps {
    templates: PaymentTemplate[];
    tokenMap: Record<string, TokenBalance | undefined>;
    onSelect: (template: PaymentTemplate) => void;
}

export function TemplateChips({ templates, tokenMap, onSelect }: TemplateChipsProps) {
    if (templates.length === 0) {
        return null;
    }

    return (
        <View style={styles.wrapper}>
            <Text style={styles.sectionLabel}>Quick Pay</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.container}
            >
                {templates.map((template) => {
                    const token = tokenMap[template.mintAddress];
                    const decimals = token?.decimals ?? (template.mintAddress === SOL_SENTINEL_MINT ? 9 : 0);
                    const amountLabel = rawToAmountUi(BigInt(template.amountRaw), decimals);
                    const symbol = token?.symbol || (template.mintAddress === SOL_SENTINEL_MINT ? 'SOL' : 'SPL');

                    return (
                        <TouchableOpacity
                            key={template.id}
                            style={styles.chip}
                            onPress={() => onSelect(template)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.title}>{template.label}</Text>
                            <Text style={styles.detail}>{`${amountLabel} ${symbol}`}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: Layout.spacing.md,
    },
    sectionLabel: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '700',
        marginBottom: Layout.spacing.xs,
    },
    container: {
        gap: Layout.spacing.sm,
        paddingVertical: Layout.spacing.xs,
    },
    chip: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Layout.radius.round,
        paddingHorizontal: Layout.spacing.md,
        paddingVertical: Layout.spacing.sm,
        backgroundColor: Colors.background,
    },
    title: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    detail: {
        ...Typography.styles.body,
        color: Colors.text,
        fontWeight: '600',
        marginTop: 2,
    },
});
