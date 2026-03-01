import { useCallback, useMemo, useRef, useState } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { useAppNetwork } from '@/features/settings/context/AppNetworkContext';
import { getWalletChain } from '@/features/wallet/services/network';
import {
    PhantomDeeplinkSession,
    signTransactionWithPhantomDeeplink,
} from '@/features/wallet/services/phantomDeeplink';
import {
    getWalletConnectMessage,
    getWalletErrorCode,
    getWalletErrorDetails,
    getWalletErrorMessage,
} from '@/features/wallet/services/walletErrors';

type WalletAccountLike = {
    address?: unknown;
    publicKey?: unknown;
};

type DirectMwaWallet = {
    authorize: (params: {
        identity: { name?: string; uri?: string; icon?: string };
        chain?: string;
        cluster?: 'devnet' | 'mainnet-beta';
        auth_token?: string;
    }) => Promise<{
        auth_token: string;
        wallet_uri_base: string;
    }>;
    signTransactions: (params: { transactions: Transaction[] }) => Promise<Transaction[]>;
    signAndSendTransactions: (params: {
        transactions: Transaction[];
        minContextSlot?: number;
    }) => Promise<string[]>;
};

function shouldRetryWithoutMinContextSlot(error: unknown, minContextSlot: number): boolean {
    if (minContextSlot <= 0) {
        return false;
    }

    const code = getWalletErrorCode(error);
    if (code === '-4' || code === 'ERROR_NOT_SUBMITTED' || code === 'ERROR_SESSION_TIMEOUT') {
        return true;
    }

    const message = getWalletErrorMessage(error).toLowerCase();
    return message.includes('mincontextslot') || message.includes('min context slot');
}

function shouldAttemptPhantomDeeplinkFallback(error: unknown, walletUriBase?: string): boolean {
    const code = getWalletErrorCode(error);
    const message = getWalletErrorMessage(error).toLowerCase();
    const knownPhantom = (walletUriBase || '').toLowerCase().includes('phantom');

    if (knownPhantom || message.includes('phantom')) {
        return true;
    }

    // If wallet URI is unavailable, fallback once for common no-popup cancellation patterns.
    if (!walletUriBase) {
        return code === '-3' || code === '-4' || code === 'ERROR_SESSION_TIMEOUT';
    }

    return false;
}

function toPublicKey(value: unknown): PublicKey | undefined {
    if (!value) {
        return undefined;
    }

    if (value instanceof PublicKey) {
        return value;
    }

    if (typeof value === 'string') {
        try {
            return new PublicKey(value);
        } catch {
            return undefined;
        }
    }

    if (typeof value === 'object') {
        const maybePublicKey = value as { toBase58?: unknown };
        if (typeof maybePublicKey.toBase58 === 'function') {
            try {
                const base58 = (maybePublicKey.toBase58 as () => string)();
                return new PublicKey(base58);
            } catch {
                return undefined;
            }
        }
    }

    return undefined;
}

export function useWallet() {
    const { network, rpcEndpoint } = useAppNetwork();
    const walletChain = getWalletChain(network);
    const {
        account,
        connect: walletConnect,
        disconnect: walletDisconnect,
        signAndSendTransaction: walletSignAndSendTransaction,
        signTransaction: walletSignTransaction,
        identity,
        connection,
    } = useMobileWallet();

    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const lastWalletUriBaseRef = useRef<string | undefined>(undefined);
    const lastAuthTokenRef = useRef<string | undefined>(undefined);
    const phantomSessionRef = useRef<PhantomDeeplinkSession | undefined>(undefined);

    const publicKey = useMemo(() => {
        const current = account as WalletAccountLike | undefined;
        return toPublicKey(current?.publicKey) || toPublicKey(current?.address);
    }, [account]);

    const walletAddress = publicKey?.toBase58();

    const connect = useCallback(async (): Promise<PublicKey> => {
        if (connecting) {
            throw new Error('Wallet connection already in progress');
        }

        try {
            setConnecting(true);
            console.log('Wallet connect attempt', {
                network,
                walletChain,
                rpcEndpoint,
            });

            const result = (await walletConnect()) as WalletAccountLike | undefined;
            const connectedPublicKey = toPublicKey(result?.publicKey) || toPublicKey(result?.address);
            if (!connectedPublicKey) {
                throw new Error('Wallet connected without an account');
            }

            return connectedPublicKey;
        } finally {
            setConnecting(false);
        }
    }, [connecting, network, rpcEndpoint, walletChain, walletConnect]);

    const disconnect = useCallback(async () => {
        if (disconnecting) {
            return;
        }

        try {
            setDisconnecting(true);
            await walletDisconnect();
            lastWalletUriBaseRef.current = undefined;
            lastAuthTokenRef.current = undefined;
            phantomSessionRef.current = undefined;
        } finally {
            setDisconnecting(false);
        }
    }, [disconnecting, walletDisconnect]);

    const ensureConnected = useCallback(async () => {
        if (publicKey) {
            return publicKey;
        }
        return connect();
    }, [connect, publicKey]);

    const getConnectErrorAlertMessage = useCallback((error: unknown) => {
        return `${getWalletConnectMessage(error)}\n\n${getWalletErrorDetails(error)}`;
    }, []);

    const getDisconnectErrorAlertMessage = useCallback((error: unknown) => {
        return getWalletErrorDetails(error);
    }, []);

    const authorizeDirectSession = useCallback(
        async (wallet: DirectMwaWallet) => {
            const persistAuthorization = (auth: { auth_token: string; wallet_uri_base: string }) => {
                lastAuthTokenRef.current = auth.auth_token;
                if (auth.wallet_uri_base) {
                    lastWalletUriBaseRef.current = auth.wallet_uri_base;
                }
            };

            try {
                const auth = await wallet.authorize({
                    identity,
                    chain: walletChain,
                    ...(lastAuthTokenRef.current ? { auth_token: lastAuthTokenRef.current } : {}),
                });
                persistAuthorization(auth);
            } catch (error) {
                const code = getWalletErrorCode(error);
                if (code === '-1' || code === 'ERROR_AUTHORIZATION_FAILED') {
                    try {
                        const auth = await wallet.authorize({
                            identity,
                            chain: walletChain,
                        });
                        persistAuthorization(auth);
                        return;
                    } catch (chainRetryError) {
                        const legacyCluster = network === 'mainnet-beta' ? 'mainnet-beta' : 'devnet';
                        const auth = await wallet.authorize({
                            identity,
                            cluster: legacyCluster,
                        });
                        persistAuthorization(auth);
                        console.warn('Authorized via legacy cluster fallback', {
                            initialCode: code,
                            retryCode: getWalletErrorCode(chainRetryError),
                            cluster: legacyCluster,
                        });
                    }
                    return;
                }

                const legacyCluster = network === 'mainnet-beta' ? 'mainnet-beta' : 'devnet';
                const message = getWalletErrorMessage(error).toLowerCase();
                if (
                    message.includes('chain') ||
                    message.includes('cluster') ||
                    message.includes('unsupported') ||
                    message.includes('invalid params')
                ) {
                    const auth = await wallet.authorize({
                        identity,
                        cluster: legacyCluster,
                    });
                    persistAuthorization(auth);
                    console.warn('Authorized via legacy cluster fallback', {
                        initialCode: code,
                        cluster: legacyCluster,
                    });
                    return;
                }

                throw error;
            }
        },
        [identity, network, walletChain]
    );

    const signTransactionViaDirectSession = useCallback(
        async (transaction: Transaction): Promise<Transaction> => {
            return transact(
                async (wallet) => {
                    const directWallet = wallet as unknown as DirectMwaWallet;
                    await authorizeDirectSession(directWallet);
                    const signed = await directWallet.signTransactions({
                        transactions: [transaction],
                    });
                    return signed[0];
                },
                lastWalletUriBaseRef.current ? { baseUri: lastWalletUriBaseRef.current } : undefined
            );
        },
        [authorizeDirectSession]
    );

    const signAndSendViaDirectSession = useCallback(
        async (transaction: Transaction, minContextSlot: number): Promise<string> => {
            return transact(
                async (wallet) => {
                    const directWallet = wallet as unknown as DirectMwaWallet;
                    await authorizeDirectSession(directWallet);
                    const signatures = await directWallet.signAndSendTransactions({
                        transactions: [transaction],
                        ...(minContextSlot > 0 ? { minContextSlot } : {}),
                    });
                    return signatures[0];
                },
                lastWalletUriBaseRef.current ? { baseUri: lastWalletUriBaseRef.current } : undefined
            );
        },
        [authorizeDirectSession]
    );

    const signAndSendTransaction = useCallback(
        async (transaction: Transaction, minContextSlot: number) => {
            try {
                return await walletSignAndSendTransaction(transaction, minContextSlot);
            } catch (error) {
                const canRetryWithoutMinContextSlot = shouldRetryWithoutMinContextSlot(error, minContextSlot);

                if (canRetryWithoutMinContextSlot) {
                    console.warn('Retrying transaction request with relaxed minContextSlot', {
                        minContextSlot,
                        retryMinContextSlot: 0,
                        code: getWalletErrorCode(error),
                        message: getWalletErrorMessage(error),
                    });

                    try {
                        return await walletSignAndSendTransaction(transaction, 0);
                    } catch (retryError) {
                        console.warn('High-level signAndSend failed, trying direct MWA session', {
                            code: getWalletErrorCode(retryError),
                            message: getWalletErrorMessage(retryError),
                        });
                        return signAndSendViaDirectSession(transaction, 0);
                    }
                }

                console.warn('High-level signAndSend failed, trying direct MWA session', {
                    code: getWalletErrorCode(error),
                    message: getWalletErrorMessage(error),
                });
                return signAndSendViaDirectSession(transaction, minContextSlot);
            }
        },
        [signAndSendViaDirectSession, walletSignAndSendTransaction]
    );

    const signTransaction = useCallback(
        async (transaction: Transaction) => {
            try {
                return await walletSignTransaction(transaction);
            } catch (error) {
                console.warn('High-level signTransaction failed, trying direct MWA session', {
                    code: getWalletErrorCode(error),
                    message: getWalletErrorMessage(error),
                });

                try {
                    return await signTransactionViaDirectSession(transaction);
                } catch (directSessionError) {
                    if (
                        !shouldAttemptPhantomDeeplinkFallback(
                            directSessionError,
                            lastWalletUriBaseRef.current
                        )
                    ) {
                        throw directSessionError;
                    }

                    console.warn('Direct MWA session failed, trying Phantom deeplink signTransaction', {
                        code: getWalletErrorCode(directSessionError),
                        message: getWalletErrorMessage(directSessionError),
                    });

                    const { signedTransaction, session } = await signTransactionWithPhantomDeeplink({
                        transaction,
                        network,
                        session: phantomSessionRef.current,
                    });

                    phantomSessionRef.current = session;
                    return signedTransaction;
                }
            }
        },
        [network, signTransactionViaDirectSession, walletSignTransaction]
    );

    return {
        connection,
        signAndSendTransaction,
        signTransaction,
        network,
        rpcEndpoint,
        walletChain,
        publicKey,
        walletAddress,
        connected: Boolean(publicKey),
        connecting,
        disconnecting,
        connect,
        disconnect,
        ensureConnected,
        getConnectErrorAlertMessage,
        getDisconnectErrorAlertMessage,
    };
}
