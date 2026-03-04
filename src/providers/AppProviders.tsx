import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { MobileWalletProvider } from '@wallet-ui/react-native-web3js';
import { createTable } from '@/core/db/Database';
import { AppNetworkProvider, useAppNetwork } from '@/features/settings/context/AppNetworkContext';
import { getWalletChain } from '@/features/wallet/services/network';
import { Colors } from '@/shared/theme/Colors';

const APP_IDENTITY = {
    name: 'SolContact',
    ...(process.env.EXPO_PUBLIC_APP_IDENTITY_URI ? { uri: process.env.EXPO_PUBLIC_APP_IDENTITY_URI } : {}),
    ...(process.env.EXPO_PUBLIC_APP_IDENTITY_ICON ? { icon: process.env.EXPO_PUBLIC_APP_IDENTITY_ICON } : {}),
};

function WalletProvider({ children }: { children: React.ReactNode }) {
    const { network, rpcEndpoint } = useAppNetwork();
    const walletChain = getWalletChain(network);

    return (
        <MobileWalletProvider chain={walletChain} endpoint={rpcEndpoint} identity={APP_IDENTITY}>
            {children}
        </MobileWalletProvider>
    );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
    const [dbInitialized, setDbInitialized] = useState(false);

    useEffect(() => {
        createTable()
            .then(() => setDbInitialized(true))
            .catch((error) => {
                console.error('Failed to initialize database:', error);
                setDbInitialized(true);
            });
    }, []);

    if (!dbInitialized) {
        return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
    }

    return (
        <AppNetworkProvider>
            <WalletProvider>{children}</WalletProvider>
        </AppNetworkProvider>
    );
}
