import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/shared/components/ScreenContainer';
import { AppHeader } from '@/shared/components/AppHeader';
import { Layout } from '@/shared/theme/Layout';
import { InputField } from '@/shared/components/InputField';
import { PrimaryButton, TextButton } from '@/shared/components/Buttons';
import { ContactRepository } from '@/features/contacts/data/ContactRepository';
import { Contact } from '@/shared/types';
import { Colors } from '@/shared/theme/Colors';

export default function EditContactScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [wallet, setWallet] = useState('');
    const [skr, setSkr] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [originalContact, setOriginalContact] = useState<Contact | null>(null);

    useEffect(() => {
        if (id) {
            loadContact(id as string);
        }
    }, [id]);

    const loadContact = async (contactId: string) => {
        try {
            setLoading(true);
            const data = await ContactRepository.getContactById(contactId);
            if (data) {
                setOriginalContact(data);
                setName(data.name);
                setPhone(data.phoneNumber || '');
                setWallet(data.walletAddress || '');
                setSkr(data.skrAddress || '');
                setNotes(data.notes || '');
            } else {
                Alert.alert('Error', 'Contact not found');
                router.back();
            }
        } catch (error) {
            console.error('Failed to load contact:', error);
            Alert.alert('Error', 'Failed to load contact details');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!originalContact) return;
        if (!name.trim()) {
            Alert.alert('Validation', 'Name is required');
            return;
        }

        try {
            const updatedContact: Contact = {
                ...originalContact,
                name,
                phoneNumber: phone,
                walletAddress: wallet,
                skrAddress: skr,
                notes,
                updatedAt: Date.now(),
            };

            await ContactRepository.updateContact(updatedContact);
            router.back();
        } catch (error) {
            console.error('Failed to update contact:', error);
            Alert.alert('Error', 'Failed to save changes');
        }
    };

    if (loading) {
        return (
            <ScreenContainer>
                <AppHeader title="Edit Contact" showBack />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.text} />
                </View>
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer>
            <AppHeader title="Edit Contact" showBack />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <InputField
                    label="Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter name"
                />
                <InputField
                    label="Phone"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="+1 234 567 8900"
                />
                <InputField
                    label="Wallet Address"
                    value={wallet}
                    onChangeText={setWallet}
                    placeholder="Solana wallet address"
                />
                <InputField
                    label=".skr Address"
                    value={skr}
                    onChangeText={setSkr}
                    autoCapitalize="none"
                    placeholder="username.skr"
                />
                <InputField
                    label="Notes"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    style={{ height: 80, textAlignVertical: 'top' }}
                    placeholder="Add notes..."
                />

                <View style={styles.actions}>
                    <PrimaryButton title="Save Changes" onPress={handleSave} />
                    <TextButton
                        title="Cancel"
                        onPress={() => router.back()}
                        style={styles.cancelButton}
                    />
                </View>
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: Layout.spacing.lg,
    },
    actions: {
        marginTop: Layout.spacing.xl,
        gap: Layout.spacing.md,
    },
    cancelButton: {
        marginTop: Layout.spacing.xs,
    },
});
