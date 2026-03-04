import { clusterApiUrl } from '@solana/web3.js';
import type { Chain } from '@solana-mobile/mobile-wallet-adapter-protocol';
import { NetworkType } from '@/shared/types';

export function getRpcEndpoint(network: NetworkType): string {
    if (network === 'mainnet-beta') {
        return process.env.EXPO_PUBLIC_SOLANA_RPC_MAINNET || clusterApiUrl('mainnet-beta');
    }

    return process.env.EXPO_PUBLIC_SOLANA_RPC_DEVNET || clusterApiUrl('devnet');
}

export function getWalletChain(network: NetworkType): Chain {
    const configured = process.env.EXPO_PUBLIC_MWA_CHAIN?.trim();
    if (configured) {
        return configured as Chain;
    }

    const mode = process.env.EXPO_PUBLIC_MWA_CHAIN_MODE?.trim().toLowerCase();
    if (mode === 'legacy') {
        return network;
    }

    return network === 'mainnet-beta' ? 'solana:mainnet' : 'solana:devnet';
}

export function getExplorerTxUrl(signature: string, network: NetworkType): string {
    const base = `https://explorer.solana.com/tx/${signature}`;
    if (network === 'mainnet-beta') {
        return base;
    }
    return `${base}?cluster=devnet`;
}

export function getNetworkLabel(network: NetworkType): string {
    return network === 'mainnet-beta' ? 'Mainnet' : 'Devnet';
}
