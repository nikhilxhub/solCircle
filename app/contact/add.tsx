import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/shared/components/ScreenContainer';
import { AppHeader } from '@/shared/components/AppHeader';
import { Layout } from '@/shared/theme/Layout';
import { InputField } from '@/shared/components/InputField';
import { Colors } from '@/shared/theme/Colors';
import { ContactRepository } from '@/features/contacts/data/ContactRepository';
import { Contact } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function AddContactScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [wallet, setWallet] = useState('');
    const [skr, setSkr] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    React.useEffect(() => {
        if (params.walletAddress) setWallet(params.walletAddress as string);
        if (params.name) setName(params.name as string);
        if (params.phone) setPhone(params.phone as string);
        if (params.skrAddress) setSkr(params.skrAddress as string);
    }, [params]);

    const handleSave = async () => {
        if (!name.trim()) {
            alert('Name is required');
            return;
        }

        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsSubmitting(true);
            const newContact: Contact = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                name: name.trim(),
                phoneNumber: phone.trim(),
                walletAddress: wallet.trim(),
                skrAddress: skr.trim(),
                notes: notes.trim(),
                addedVia: 'manual',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            await ContactRepository.addContact(newContact);
            router.back();
        } catch (error) {
            console.error('Failed to save contact:', error);
            alert('Failed to save contact');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScreenContainer>
            <AppHeader title="" showBack />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.formStack}>
                        <InputField
                            label="Name"
                            placeholder="Required"
                            autoFocus
                            value={name}
                            onChangeText={setName}
                            style={styles.minimalInput}
                        />
                        <InputField
                            label="Phone"
                            placeholder="+1 234 567 8900"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                            style={styles.minimalInput}
                        />
                        <InputField
                            label="Wallet Address"
                            placeholder="0x..."
                            value={wallet}
                            onChangeText={setWallet}
                            style={styles.minimalInput}
                        />
                        <InputField
                            label=".skr Address"
                            placeholder="username.skr"
                            autoCapitalize="none"
                            value={skr}
                            onChangeText={setSkr}
                            style={styles.minimalInput}
                        />
                        <InputField
                            label="Notes"
                            placeholder="Type here..."
                            multiline
                            style={[styles.minimalInput, { height: 80, textAlignVertical: 'top' }]}
                            value={notes}
                            onChangeText={setNotes}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Floating Action Button for Save */}
            <TouchableOpacity
                style={[styles.fab, isSubmitting && styles.fabDisabled]}
                onPress={handleSave}
                disabled={isSubmitting}
                activeOpacity={0.8}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Ionicons name="checkmark" size={32} color="white" />
                )}
            </TouchableOpacity>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: Layout.spacing.xl,
        paddingBottom: 100, // Space for FAB
    },
    formStack: {
        gap: Layout.spacing.xl, // Spacious gaps (24px+)
    },
    minimalInput: {
        borderBottomWidth: 1, // Keep it minimal
        borderBottomColor: Colors.border,
        fontSize: 18, // Slightly larger text
        paddingVertical: Layout.spacing.md,
    },
    fab: {
        position: 'absolute',
        bottom: Layout.spacing.xl,
        right: Layout.spacing.xl,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.text, // Black
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    fabDisabled: {
        backgroundColor: Colors.textTertiary,
    }
});
