import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/shared/theme/Colors';
import { Typography } from '@/shared/theme/Typography';

export function WalletCallbackScreen() {
    const router = useRouter();

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (router.canGoBack()) {
                router.back();
                return;
            }

            router.replace('/home');
        }, 120);

        return () => clearTimeout(timeout);
    }, [router]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="small" color={Colors.text} />
            <Text style={styles.label}>Returning to app...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: Colors.background,
    },
    label: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
    },
});

