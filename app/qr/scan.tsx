import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { TextButton } from '@/shared/components/Buttons';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';
import { StatusBar } from 'expo-status-bar';
import { parseContactQrData } from '@/features/qr/services/contactQr';

export default function QRScanScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <View style={styles.messageContainer}>
                    <Text style={styles.message}>We need your permission to show the camera</Text>
                    <Button onPress={requestPermission} title="Grant Permission" />
                </View>
            </View>
        );
    }

    const handleBarcodeScanned = ({ data }: { type: string; data: string }) => {
        setScanned(true);

        const parsed = parseContactQrData(data);
        if (!parsed) {
            Alert.alert('Invalid QR', 'This QR code is not a supported contact payload.', [
                {
                    text: 'Scan Again',
                    onPress: () => setScanned(false),
                },
                {
                    text: 'Cancel',
                    onPress: () => router.back(),
                    style: 'cancel',
                },
            ]);
            return;
        }

        router.push({
            pathname: '/contact/add',
            params: {
                name: parsed.name || '',
                phone: parsed.phoneNumber || '',
                walletAddress: parsed.walletAddress || '',
                skrAddress: parsed.skrAddress || '',
            },
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
            />

            <View style={styles.overlay}>
                <View style={styles.header}>
                    <Text style={styles.title}>Scan QR Code</Text>
                    <Text style={styles.subtitle}>Align code within the frame</Text>
                </View>

                <View style={styles.scanFrameContainer}>
                    <View style={styles.scanFrame} />
                </View>

                <View style={styles.footer}>
                    <TextButton title="Cancel" onPress={() => router.back()} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    messageContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    message: {
        ...Typography.styles.body,
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        paddingVertical: Layout.spacing.xxl,
    },
    header: {
        alignItems: 'center',
        marginTop: Layout.spacing.xl,
        paddingHorizontal: Layout.spacing.lg,
    },
    title: {
        ...Typography.styles.title,
        color: '#fff',
        marginBottom: Layout.spacing.xs,
        textAlign: 'center',
    },
    subtitle: {
        ...Typography.styles.body,
        color: '#ccc',
        textAlign: 'center',
        width: '100%',
    },
    scanFrameContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: Layout.radius.lg,
        backgroundColor: 'transparent',
    },
    footer: {
        alignItems: 'center',
        marginBottom: Layout.spacing.lg,
    },
});
