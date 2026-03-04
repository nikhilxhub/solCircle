import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/shared/components/ScreenContainer';
import { AppHeader } from '@/shared/components/AppHeader';
import { PrimaryButton, TextButton } from '@/shared/components/Buttons';
import { Avatar } from '@/shared/components/Avatar';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';
import { Colors } from '@/shared/theme/Colors';
import { UserProfileRepository } from '@/features/profile/data/UserProfileRepository';
import { buildContactQrPayload } from '@/features/qr/services/contactQr';

const { width } = Dimensions.get('window');

export default function QRGenerateScreen() {
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [qrData, setQrData] = useState('');
    const [displayData, setDisplayData] = useState({
        name: '',
        walletAddress: '',
        handle: '',
        phoneNumber: '',
    });

    const isSharedContact = !!params.walletAddress || !!params.name;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            if (isSharedContact) {
                const payload = buildContactQrPayload({
                    name: params.name as string,
                    phoneNumber: (params.phoneNumber as string) || (params.phone as string) || '',
                    walletAddress: (params.walletAddress as string) || (params.wallet as string) || '',
                    skrAddress: (params.skrAddress as string) || (params.skr as string) || '',
                });

                setQrData(JSON.stringify(payload));
                setDisplayData({
                    name: payload.name || '',
                    walletAddress: payload.walletAddress || '',
                    handle: payload.skrAddress ? payload.skrAddress.replace('seeker:', '') : '',
                    phoneNumber: payload.phoneNumber || '',
                });
            } else {
                const profile = await UserProfileRepository.getProfile();
                if (profile) {
                    const payload = buildContactQrPayload({
                        name: profile.name || '',
                        phoneNumber: profile.phoneNumber || '',
                        walletAddress: profile.walletAddress || '',
                        skrAddress: profile.skrAddress || '',
                    });

                    setQrData(JSON.stringify(payload));
                    setDisplayData({
                        name: payload.name || 'My Identity',
                        walletAddress: payload.walletAddress || '',
                        handle: payload.skrAddress ? payload.skrAddress.replace('seeker:', '') : '',
                        phoneNumber: payload.phoneNumber || '',
                    });
                } else {
                    const payload = buildContactQrPayload({ name: 'My Identity' });
                    setQrData(JSON.stringify(payload));
                    setDisplayData({
                        name: 'My Identity',
                        walletAddress: '',
                        handle: '',
                        phoneNumber: '',
                    });
                }
            }
        } catch (error) {
            console.error('Failed to generate QR data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (displayData.walletAddress) {
            await Clipboard.setStringAsync(displayData.walletAddress);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const handleShare = () => {
        // Native share can be added here later.
    };

    if (loading) {
        return (
            <ScreenContainer>
                <AppHeader title="Share Identity" showBack />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.text} />
                </View>
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer>
            <AppHeader title="Share Identity" showBack />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.identitySection}>
                    <Avatar name={displayData.name} size={80} />
                    <Text style={styles.name}>{displayData.name}</Text>
                    {!!displayData.handle && <Text style={styles.handle}>@{displayData.handle}</Text>}
                </View>

                <View style={styles.qrSection}>
                    <QRCode
                        value={qrData}
                        size={width * 0.65}
                        color={Colors.text}
                        backgroundColor={Colors.background}
                        quietZone={10}
                    />
                    <Text style={styles.qrHelper}>{isSharedContact ? 'Scan to add' : 'Scan to connect'}</Text>
                </View>

                <View style={styles.detailsSection}>
                    {!!displayData.walletAddress && (
                        <>
                            <Text style={styles.addressLabel}>WALLET ADDRESS</Text>
                            <Text style={styles.addressValue} numberOfLines={1} ellipsizeMode="middle">
                                {displayData.walletAddress}
                            </Text>
                        </>
                    )}
                </View>

                <View style={styles.actionSection}>
                    <PrimaryButton title="Share Contact" onPress={handleShare} style={styles.actionButton} />
                    <TextButton title="Copy Address" onPress={handleCopy} />
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
    identitySection: {
        alignItems: 'center',
        marginTop: Layout.spacing.lg,
        marginBottom: 60,
    },
    name: {
        ...Typography.styles.title,
        fontSize: 24,
        marginTop: Layout.spacing.md,
        textAlign: 'center',
    },
    handle: {
        ...Typography.styles.body,
        color: Colors.textTertiary,
        marginTop: 4,
    },
    qrSection: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Layout.spacing.xxl,
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
        alignItems: 'center',
        marginBottom: Layout.spacing.xxl,
    },
    addressLabel: {
        ...Typography.styles.caption,
        color: Colors.textTertiary,
        fontWeight: '700',
        fontSize: 10,
        marginBottom: 4,
        letterSpacing: 1,
    },
    addressValue: {
        ...Typography.styles.body,
        color: Colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        maxWidth: '80%',
    },
    actionSection: {
        width: '100%',
        gap: Layout.spacing.md,
        marginTop: 'auto',
    },
    actionButton: {
        width: '100%',
    },
});
