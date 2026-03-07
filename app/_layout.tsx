import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Colors } from '@/shared/theme/Colors';
import { AppProviders } from '@/providers/AppProviders';

export default function RootLayout() {
    return (
        <AppProviders>
            <View style={{ flex: 1, backgroundColor: Colors.background }}>
                <StatusBar style="dark" backgroundColor={Colors.background} />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: Colors.background },
                        animation: 'fade',
                        animationDuration: 200,
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="home/index" />
                    <Stack.Screen name="transactions/index" />
                    <Stack.Screen name="transactions/[id]" />
                    <Stack.Screen name="contact/add" />
                    <Stack.Screen name="contact/[id]" />
                    <Stack.Screen name="contact/edit/[id]" />
                    <Stack.Screen name="qr/generate" />
                    <Stack.Screen name="qr/scan" />
                    <Stack.Screen name="settings/index" />
                    <Stack.Screen name="templates/index" />
                    <Stack.Screen name="settings/profile/index" />
                    <Stack.Screen name="settings/profile/edit" />
                    <Stack.Screen name="wallet/phantom-connect" />
                    <Stack.Screen name="wallet/phantom-sign" />
                </Stack>
            </View>
        </AppProviders>
    );
}
