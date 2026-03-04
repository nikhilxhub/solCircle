import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text, ActivityIndicator, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/shared/components/ScreenContainer';
import { AppHeader } from '@/shared/components/AppHeader';
import { PrimaryButton, TextButton } from '@/shared/components/Buttons';
import { Avatar } from '@/shared/components/Avatar';
import { ListItem } from '@/shared/components/ListItem';
import { Layout } from '@/shared/theme/Layout';
import { Colors } from '@/shared/theme/Colors';
import { Typography } from '@/shared/theme/Typography';
import { UserProfileRepository, UserProfile } from '@/features/profile/data/UserProfileRepository';

const { width } = Dimensions.get('window');

export default function ViewProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [])
    );

    const loadProfile = async () => {
        try {
            setLoading(true);
            const data = await UserProfileRepository.getProfile();
            setProfile(data);
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        router.push('/settings/profile/edit');
    };

    const handleCreate = () => {
        router.push('/settings/profile/edit');
    };

    const handleCopy = async (text: string, label: string) => {
        await Clipboard.setStringAsync(text);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // In a real app, use a Toast here. For now, we'll rely on Haptics or a quick console log, 
        // as Alert is too intrusive for a copy action.
        // Alert.alert('Copied', `${label} copied to clipboard`); 
    };

    if (loading) {
        return (
            <ScreenContainer>
                <AppHeader title="" showBack />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.text} />
                </View>
            </ScreenContainer>
        );
    }

    if (!profile || (!profile.name && !profile.phoneNumber && !profile.walletAddress && !profile.skrAddress)) {
        return (
            <ScreenContainer>
                <AppHeader title="" showBack />
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>No Profile Found</Text>
                    <Text style={styles.emptyText}>Create your digital card to start sharing.</Text>
                    <PrimaryButton
                        title="Create Profile"
                        onPress={handleCreate}
                        style={styles.createButton}
                    />
                </View>
            </ScreenContainer>
        );
    }

    const profileData = JSON.stringify({
        name: profile.name || '',
        phoneNumber: profile.phoneNumber || '',
        walletAddress: profile.walletAddress || '',
        skrAddress: profile.skrAddress || '',
        type: 'contact_card'
    });



    return (
        <ScreenContainer>
            <AppHeader
                title=""
                showBack
                rightAction={<TextButton title="Edit" onPress={handleEdit} />}
            />
            <ScrollView contentContainerStyle={styles.content}>

                {/* Identity Section - Top */}
                <View style={styles.identitySection}>
                    <Avatar name={profile.name} size={90} />
                    <Text style={styles.name}>{profile.name || 'Anonymous'}</Text>
                    {profile.skrAddress && (
                        <Text style={styles.handle}>@{profile.skrAddress.replace('seeker:', '')}</Text>
                    )}
                </View>

                {/* QR Section - Optical Center / Golden Ratio approx */}
                <View style={styles.qrSection}>
                    <QRCode
                        value={profileData}
                        size={width * 0.7} // Increased size slightly
                        color={Colors.text}
                        backgroundColor={Colors.background}
                        quietZone={10}
                        ecl="L" // Low error correction for less density (easier to scan)
                    />
                    <Text style={styles.qrHelper}>Scan to connect</Text>
                </View>

                {/* Details Section - Bottom, Minimal */}
                <View style={styles.detailsSection}>
                    {profile.phoneNumber && (
                        <TouchableOpacity
                            style={styles.infoRow}
                            onPress={() => handleCopy(profile.phoneNumber!, 'Phone Number')}
                            activeOpacity={0.6}
                        >
                            <Text style={styles.infoLabel}>MOBILE</Text>
                            <Text style={styles.infoValue}>{profile.phoneNumber}</Text>
                        </TouchableOpacity>
                    )}
                    {profile.walletAddress && (
                        <TouchableOpacity
                            style={styles.infoRow}
                            onPress={() => handleCopy(profile.walletAddress!, 'Wallet Address')}
                            activeOpacity={0.6}
                        >
                            <Text style={styles.infoLabel}>WALLET</Text>
                            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
                                {profile.walletAddress}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        paddingHorizontal: Layout.spacing.xl,
        paddingBottom: Layout.spacing.xxl,
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Layout.spacing.xl,
    },
    emptyTitle: {
        ...Typography.styles.title,
        marginBottom: Layout.spacing.md,
    },
    emptyText: {
        ...Typography.styles.body,
        textAlign: 'center',
        color: Colors.textSecondary,
        marginBottom: Layout.spacing.xl,
    },
    createButton: {
        width: '100%',
        maxWidth: 200,
    },

    // Design Implementation
    identitySection: {
        alignItems: 'center',
        marginTop: Layout.spacing.xl,
        marginBottom: 60, // Increased spacing to prevent OCR interference
    },
    name: {
        ...Typography.styles.title,
        fontSize: 28, // Larger for impact
        marginTop: Layout.spacing.md,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    handle: {
        ...Typography.styles.body,
        color: Colors.textTertiary,
        marginTop: 4,
        fontSize: 16,
    },

    qrSection: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: Layout.spacing.xl,
        // No background, no shadow - pure minimal
    },
    qrHelper: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        marginTop: Layout.spacing.lg,
        textTransform: 'uppercase',
        letterSpacing: 2,
        fontSize: 10,
    },

    detailsSection: {
        width: '100%',
        marginTop: 'auto', // Push to bottom area if space permits
        paddingTop: Layout.spacing.xl,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Layout.spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
    },
    infoLabel: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        fontWeight: '600',
        letterSpacing: 1,
        fontSize: 11,
    },
    infoValue: {
        ...Typography.styles.body,
        color: Colors.text,
        fontWeight: '500',
        textAlign: 'right',
        maxWidth: '70%',
    },
});
