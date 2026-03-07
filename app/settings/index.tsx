import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/shared/components/ScreenContainer';
import { AppHeader } from '@/shared/components/AppHeader';
import { ListItem } from '@/shared/components/ListItem';
import { SectionDivider } from '@/shared/components/SectionDivider';
import { PrimaryButton, TextButton } from '@/shared/components/Buttons';
import { Layout } from '@/shared/theme/Layout';
import { Colors } from '@/shared/theme/Colors';
import { Typography } from '@/shared/theme/Typography';
import { useAppNetwork } from '@/features/settings/context/AppNetworkContext';
import { NetworkType } from '@/shared/types';
import { useWallet } from '@/features/wallet/hooks/useWallet';

export default function SettingsScreen() {
    const router = useRouter();
    const { network, networkLabel, setNetwork } = useAppNetwork();
    const wallet = useWallet();

    const [updatingNetwork, setUpdatingNetwork] = useState(false);
    const walletAddress = wallet.walletAddress;

    const handleNetworkChange = async (nextNetwork: NetworkType) => {
        if (nextNetwork === network) {
            return;
        }

        try {
            setUpdatingNetwork(true);
            await setNetwork(nextNetwork);
        } catch (error) {
            console.error('Failed to update network:', error);
        } finally {
            setUpdatingNetwork(false);
        }
    };

    const handleConnectWallet = async () => {
        if (wallet.connecting) {
            return;
        }

        try {
            await wallet.connect();
        } catch (error) {
            console.error('Wallet connection failed:', error);
            Alert.alert('Wallet connection failed', wallet.getConnectErrorAlertMessage(error));
        }
    };

    const handleDisconnectWallet = async () => {
        if (wallet.disconnecting) {
            return;
        }

        try {
            await wallet.disconnect();
        } catch (error) {
            console.error('Wallet disconnect failed:', error);
            Alert.alert('Wallet disconnect failed', wallet.getDisconnectErrorAlertMessage(error));
        }
    };

    return (
        <ScreenContainer>
            <AppHeader title="Settings" showBack />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <ListItem label="My Profile" showChevron onPress={() => router.push('/settings/profile')} />
                    <ListItem label="Transaction History" showChevron onPress={() => router.push('/transactions')} />
                    <ListItem label="Saved Templates" showChevron onPress={() => router.push('/templates')} />

                    {/*
                    <View style={styles.row}>
                        <View>
                            <Text style={styles.label}>Biometric Lock</Text>
                            <Text style={styles.sublabel}>Require FaceID to open</Text>
                        </View>
                        <Switch
                            value={biometricEnabled}
                            onValueChange={setBiometricEnabled}
                            trackColor={{ false: Colors.border, true: Colors.text }}
                            thumbColor={Colors.background}
                            ios_backgroundColor={Colors.border}
                        />
                    </View>
                    */}

                    <SectionDivider />

                    <View style={styles.networkSection}>
                        <Text style={styles.label}>Solana Network</Text>
                        <Text style={styles.sublabel}>{`Active: ${networkLabel}`}</Text>
                        <Text style={styles.sublabel}>{`MWA chain: ${wallet.walletChain}`}</Text>

                        <View style={styles.networkButtons}>
                            <TouchableOpacity
                                onPress={() => handleNetworkChange('devnet')}
                                style={[styles.networkButton, network === 'devnet' && styles.networkButtonActive]}
                            >
                                <Text
                                    style={[
                                        styles.networkButtonLabel,
                                        network === 'devnet' && styles.networkButtonLabelActive,
                                    ]}
                                >
                                    Devnet
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleNetworkChange('mainnet-beta')}
                                style={[styles.networkButton, network === 'mainnet-beta' && styles.networkButtonActive]}
                            >
                                <Text
                                    style={[
                                        styles.networkButtonLabel,
                                        network === 'mainnet-beta' && styles.networkButtonLabelActive,
                                    ]}
                                >
                                    Mainnet
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {updatingNetwork && (
                            <View style={styles.networkLoadingRow}>
                                <ActivityIndicator size="small" color={Colors.text} />
                                <Text style={styles.sublabel}>Updating network...</Text>
                            </View>
                        )}
                    </View>

                    <SectionDivider />

                    <View style={styles.walletSection}>
                        <Text style={styles.label}>Wallet Connection</Text>
                        <Text style={styles.sublabel}>
                            {walletAddress ? 'Connected mobile wallet' : 'Connect once to speed up Send from contacts'}
                        </Text>

                        {walletAddress ? (
                            <View style={styles.connectedWalletRow}>
                                <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                                    {walletAddress}
                                </Text>
                                <TextButton
                                    title={wallet.disconnecting ? 'Disconnecting...' : 'Disconnect'}
                                    onPress={handleDisconnectWallet}
                                    disabled={wallet.disconnecting}
                                />
                            </View>
                        ) : (
                            <PrimaryButton
                                title="Connect Wallet"
                                onPress={handleConnectWallet}
                                loading={wallet.connecting}
                                disabled={wallet.connecting}
                                style={styles.walletButton}
                            />
                        )}
                    </View>

                    <SectionDivider />

                    <ListItem label="Notifications" showChevron onPress={() => {}} />
                    <ListItem label="Privacy" showChevron onPress={() => {}} />
                </View>

                <View style={styles.section}>
                    <ListItem label="Help & Support" showChevron onPress={() => {}} />
                    <ListItem label="About SolCircle" value="v1.0.0" onPress={() => {}} />
                </View>
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: Layout.spacing.lg,
    },
    section: {
        marginBottom: Layout.spacing.xxl,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Layout.spacing.md,
        minHeight: 56,
    },
    label: {
        ...Typography.styles.body,
        fontWeight: '500',
        color: Colors.text,
    },
    sublabel: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    networkSection: {
        paddingVertical: Layout.spacing.md,
    },
    networkButtons: {
        flexDirection: 'row',
        gap: Layout.spacing.sm,
        marginTop: Layout.spacing.sm,
    },
    networkButton: {
        paddingHorizontal: Layout.spacing.md,
        paddingVertical: Layout.spacing.sm,
        borderRadius: Layout.radius.round,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.background,
    },
    networkButtonActive: {
        borderColor: Colors.text,
        backgroundColor: Colors.text,
    },
    networkButtonLabel: {
        ...Typography.styles.caption,
        fontWeight: '700',
        color: Colors.text,
        textTransform: 'uppercase',
    },
    networkButtonLabelActive: {
        color: Colors.background,
    },
    networkLoadingRow: {
        marginTop: Layout.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Layout.spacing.sm,
    },
    walletSection: {
        paddingVertical: Layout.spacing.md,
    },
    connectedWalletRow: {
        marginTop: Layout.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
        paddingBottom: Layout.spacing.xs,
    },
    walletAddress: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        maxWidth: '72%',
    },
    walletButton: {
        marginTop: Layout.spacing.sm,
    },
});
