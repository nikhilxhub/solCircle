import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenContainer } from '@/shared/components/ScreenContainer';
import { Colors } from '@/shared/theme/Colors';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';
import { Contact, PaymentTemplate } from '@/shared/types';
import { ContactRepository } from '@/features/contacts/data/ContactRepository';
import { PaymentTemplateRepository } from '@/features/payments/data/PaymentTemplateRepository';
import { SOL_SENTINEL_MINT, rawToAmountUi } from '@/features/wallet/services/solanaTransfers';

type TemplateListItem = PaymentTemplate & {
    contactName?: string;
};

function formatAmountLabel(template: PaymentTemplate): string {
    if (template.mintAddress === SOL_SENTINEL_MINT) {
        return `${rawToAmountUi(BigInt(template.amountRaw), 9)} SOL`;
    }
    return `${template.amountRaw} units`;
}

export default function SavedTemplatesScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<TemplateListItem[]>([]);
    const [contactsById, setContactsById] = useState<Record<string, Contact>>({});
    const [pendingDeleteTemplate, setPendingDeleteTemplate] = useState<TemplateListItem | null>(null);
    const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [allTemplates, contacts] = await Promise.all([
                PaymentTemplateRepository.getAllTemplates(),
                ContactRepository.getAllContacts(),
            ]);

            const byId = contacts.reduce<Record<string, Contact>>((acc, contact) => {
                acc[contact.id] = contact;
                return acc;
            }, {});

            setContactsById(byId);
            setTemplates(
                allTemplates.map((template) => ({
                    ...template,
                    contactName: byId[template.contactId]?.name,
                }))
            );
        } catch (error) {
            console.error('Failed to load saved templates:', error);
            Alert.alert('Templates unavailable', 'Could not load saved templates.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            void loadData();
        }, [loadData])
    );

    const templateCountLabel = useMemo(() => {
        return `${templates.length} ${templates.length === 1 ? 'template' : 'templates'}`;
    }, [templates.length]);

    const handleOpenContact = useCallback(
        (template: TemplateListItem) => {
            const contact = contactsById[template.contactId];
            if (!contact) {
                Alert.alert('Contact missing', 'This template is linked to a contact that no longer exists.');
                return;
            }
            router.push(`/contact/${contact.id}`);
        },
        [contactsById, router]
    );

    const handleDeleteTemplate = useCallback((template: TemplateListItem) => {
        setPendingDeleteTemplate(template);
    }, []);

    const handleConfirmDeleteTemplate = useCallback(async () => {
        if (!pendingDeleteTemplate) {
            return;
        }

        try {
            setDeletingTemplateId(pendingDeleteTemplate.id);
            await PaymentTemplateRepository.deleteTemplate(pendingDeleteTemplate.id);
            setTemplates((current) => current.filter((item) => item.id !== pendingDeleteTemplate.id));
            setPendingDeleteTemplate(null);
        } catch (error) {
            console.error('Failed to delete template:', error);
            Alert.alert('Delete failed', 'Could not delete this template.');
        } finally {
            setDeletingTemplateId(null);
        }
    }, [pendingDeleteTemplate]);

    return (
        <ScreenContainer>
            <AppHeader title="Saved Templates" showBack />
            <View style={styles.content}>
                <View style={styles.metaRow}>
                    <Text style={styles.metaTitle}>Quick Pay Library</Text>
                    <Text style={styles.metaValue}>{templateCountLabel}</Text>
                </View>

                <FlatList
                    data={templates}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        loading ? (
                            <View style={styles.loadingState}>
                                <ActivityIndicator size="small" color={Colors.text} />
                                <Text style={styles.helperText}>Loading templates...</Text>
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="bookmark-outline" size={42} color={Colors.textTertiary} />
                                <Text style={styles.emptyTitle}>No saved templates yet</Text>
                                <Text style={styles.helperText}>
                                    Save a template from any contact payment flow to reuse it quickly.
                                </Text>
                            </View>
                        )
                    }
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardTopRow}>
                                <TouchableOpacity
                                    style={styles.cardTextColumn}
                                    activeOpacity={0.82}
                                    onPress={() => handleOpenContact(item)}
                                >
                                    <Text style={styles.cardTitle}>{item.label}</Text>
                                    <Text style={styles.cardSubtitle}>
                                        {item.contactName || 'Missing contact'}
                                    </Text>
                                    <Text style={styles.amountText}>{formatAmountLabel(item)}</Text>
                                    <Text style={styles.mintText} numberOfLines={1} ellipsizeMode="middle">
                                        {item.mintAddress === SOL_SENTINEL_MINT ? 'Native SOL' : item.mintAddress}
                                    </Text>
                                    {item.memo ? (
                                        <Text style={styles.memoText} numberOfLines={2}>
                                            {`Memo: ${item.memo}`}
                                        </Text>
                                    ) : null}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => handleDeleteTemplate(item)}
                                    style={styles.deleteButton}
                                    hitSlop={Layout.hitSlop}
                                >
                                    <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            </View>

            <Modal
                visible={Boolean(pendingDeleteTemplate)}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    if (!deletingTemplateId) {
                        setPendingDeleteTemplate(null);
                    }
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Delete template?</Text>
                        <Text style={styles.modalMessage}>
                            {pendingDeleteTemplate
                                ? `Do you want to delete "${pendingDeleteTemplate.label}"?`
                                : ''}
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalActionButton}
                                onPress={() => setPendingDeleteTemplate(null)}
                                disabled={Boolean(deletingTemplateId)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.modalCancelLabel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalActionButton}
                                onPress={handleConfirmDeleteTemplate}
                                disabled={Boolean(deletingTemplateId)}
                                activeOpacity={0.7}
                            >
                                {deletingTemplateId ? (
                                    <ActivityIndicator size="small" color={Colors.text} />
                                ) : (
                                    <Text style={styles.modalDeleteLabel}>Delete</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingHorizontal: Layout.spacing.lg,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingVertical: Layout.spacing.md,
    },
    metaTitle: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '700',
    },
    metaValue: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        fontWeight: '700',
    },
    listContent: {
        paddingBottom: Layout.spacing.xxl,
    },
    card: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Layout.radius.md,
        backgroundColor: Colors.background,
        paddingHorizontal: Layout.spacing.md,
        paddingVertical: Layout.spacing.sm,
        marginBottom: Layout.spacing.sm,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: Layout.spacing.sm,
    },
    cardTextColumn: {
        flex: 1,
    },
    cardTitle: {
        ...Typography.styles.body,
        color: Colors.text,
        fontWeight: '700',
    },
    cardSubtitle: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    deleteButton: {
        padding: 2,
    },
    amountText: {
        ...Typography.styles.body,
        color: Colors.text,
        fontWeight: '600',
        marginTop: Layout.spacing.sm,
    },
    mintText: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        marginTop: 2,
    },
    memoText: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        marginTop: Layout.spacing.xs,
    },
    emptyState: {
        alignItems: 'center',
        gap: Layout.spacing.xs,
        paddingTop: Layout.spacing.xxl,
    },
    loadingState: {
        alignItems: 'center',
        gap: Layout.spacing.xs,
        paddingTop: Layout.spacing.xxl,
    },
    emptyTitle: {
        ...Typography.styles.body,
        color: Colors.text,
        fontWeight: '700',
    },
    helperText: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Layout.spacing.lg,
    },
    modalCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: Layout.radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.background,
        paddingHorizontal: Layout.spacing.lg,
        paddingVertical: Layout.spacing.lg,
    },
    modalTitle: {
        ...Typography.styles.body,
        color: Colors.text,
        fontWeight: '700',
    },
    modalMessage: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        marginTop: Layout.spacing.xs,
    },
    modalActions: {
        marginTop: Layout.spacing.lg,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Layout.spacing.md,
    },
    modalActionButton: {
        minWidth: 68,
        minHeight: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelLabel: {
        ...Typography.styles.body,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    modalDeleteLabel: {
        ...Typography.styles.body,
        color: Colors.error,
        fontWeight: '700',
    },
});
