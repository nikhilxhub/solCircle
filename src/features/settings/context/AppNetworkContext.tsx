import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppSettingsRepository } from '@/features/settings/data/AppSettingsRepository';
import { getNetworkLabel, getRpcEndpoint } from '@/features/wallet/services/network';
import { NetworkType } from '@/shared/types';

interface AppNetworkContextValue {
    network: NetworkType;
    rpcEndpoint: string;
    networkLabel: string;
    setNetwork: (network: NetworkType) => Promise<void>;
}

const AppNetworkContext = createContext<AppNetworkContextValue | null>(null);

export function AppNetworkProvider({ children }: { children: React.ReactNode }) {
    const [network, setNetworkState] = useState<NetworkType>('devnet');

    useEffect(() => {
        let mounted = true;

        const loadNetwork = async () => {
            try {
                const stored = await AppSettingsRepository.getNetwork();
                if (mounted) {
                    setNetworkState(stored);
                }
            } catch (error) {
                console.error('Failed to load network setting:', error);
            }
        };

        loadNetwork();

        return () => {
            mounted = false;
        };
    }, []);

    const value = useMemo<AppNetworkContextValue>(() => {
        return {
            network,
            rpcEndpoint: getRpcEndpoint(network),
            networkLabel: getNetworkLabel(network),
            setNetwork: async (nextNetwork: NetworkType) => {
                await AppSettingsRepository.setNetwork(nextNetwork);
                setNetworkState(nextNetwork);
            },
        };
    }, [network]);

    return <AppNetworkContext.Provider value={value}>{children}</AppNetworkContext.Provider>;
}

export function useAppNetwork() {
    const ctx = useContext(AppNetworkContext);
    if (!ctx) {
        throw new Error('useAppNetwork must be used inside AppNetworkProvider');
    }
    return ctx;
}
