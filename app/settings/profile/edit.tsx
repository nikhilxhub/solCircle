import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/shared/components/ScreenContainer';
import { AppHeader } from '@/shared/components/AppHeader';
import { InputField } from '@/shared/components/InputField';
import { PrimaryButton } from '@/shared/components/Buttons';
import { Layout } from '@/shared/theme/Layout';
import { UserProfileRepository } from '@/features/profile/data/UserProfileRepository';

export default function EditProfileScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [skrAddress, setSkrAddress] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const profile = await UserProfileRepository.getProfile();
            if (profile) {
                setName(profile.name || '');
                setPhoneNumber(profile.phoneNumber || '');
                setWalletAddress(profile.walletAddress || '');
                setSkrAddress(profile.skrAddress || '');
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
            Alert.alert('Error', 'Failed to load profile');
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            await UserProfileRepository.saveProfile({
                name,
                phoneNumber,
                walletAddress,
                skrAddress,
            });
            Alert.alert('Success', 'Profile saved successfully');
            router.back();
        } catch (error) {
            console.error('Failed to save profile:', error);
            Alert.alert('Error', 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenContainer>
            <AppHeader title="Edit Profile" showBack />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.form}>
                        <InputField
                            label="Name"
                            value={name}
                            onChangeText={setName}
                            placeholder="Your Name"
                            autoComplete="name"
                        />
                        <InputField
                            label="Mobile Number"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            placeholder="+1234567890"
                            keyboardType="phone-pad"
                            autoComplete="tel"
                        />
                        <InputField
                            label="Wallet Address"
                            value={walletAddress}
                            onChangeText={setWalletAddress}
                            placeholder="0x..."
                            autoCapitalize="none"
                        />
                        <InputField
                            label="Seeker Address"
                            value={skrAddress}
                            onChangeText={setSkrAddress}
                            placeholder="seeker:..."
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.footer}>
                        <PrimaryButton
                            title="Save Changes"
                            onPress={handleSave}
                            loading={loading}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: Layout.spacing.lg,
        flexGrow: 1,
    },
    form: {
        flex: 1,
    },
    footer: {
        marginTop: Layout.spacing.xxl,
        marginBottom: Layout.spacing.xl,
    },
});
