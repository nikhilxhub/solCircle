import * as ExpoLinking from 'expo-linking';
import { Linking } from 'react-native';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { PublicKey, Transaction } from '@solana/web3.js';
import { NetworkType } from '@/shared/types';

const PHANTOM_DEEPLINK_BASE = 'https://phantom.app/ul/v1';
const CALLBACK_CONNECT_PATH = 'wallet/phantom-connect';
const CALLBACK_SIGN_PATH = 'wallet/phantom-sign';
const CALLBACK_TIMEOUT_MS = 90000;

type PhantomEncryptedParams = {
    nonce: string;
    data: string;
};

type PhantomConnectResponse = {
    public_key: string;
    session: string;
};

type PhantomSignResponse = {
    transaction: string;
};

export type PhantomDeeplinkSession = {
    dappPublicKey: string;
    dappSecretKey: string;
    walletEncryptionPublicKey: string;
    sharedSecret: Uint8Array;
    session: string;
    publicKey: PublicKey;
    network: NetworkType;
};

type DeeplinkError = Error & { code?: string };

function toCluster(network: NetworkType): 'devnet' | 'mainnet-beta' {
    return network === 'mainnet-beta' ? 'mainnet-beta' : 'devnet';
}

function buildRedirectLink(path: string): string {
    return ExpoLinking.createURL(path);
}

function toBuffer(value: Uint8Array): Buffer {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
}

function parseErrorFromParams(searchParams: URLSearchParams): DeeplinkError | undefined {
    const errorCode = searchParams.get('errorCode') || undefined;
    const errorMessage = searchParams.get('errorMessage') || undefined;

    if (!errorCode && !errorMessage) {
        return undefined;
    }

    const error = new Error(errorMessage || 'Phantom deeplink failed') as DeeplinkError;
    error.name = 'PhantomDeeplinkError';
    error.code = errorCode;
    return error;
}

async function waitForRedirect(redirectLink: string): Promise<URL> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const timeoutId = setTimeout(() => {
            if (settled) {
                return;
            }
            settled = true;
            subscription.remove();
            const timeoutError = new Error('Phantom deeplink callback timed out') as DeeplinkError;
            timeoutError.name = 'PhantomDeeplinkTimeout';
            timeoutError.code = 'ERROR_SESSION_TIMEOUT';
            reject(timeoutError);
        }, CALLBACK_TIMEOUT_MS);

        const resolveIfMatches = (incomingUrl: string | null | undefined) => {
            if (!incomingUrl || settled) {
                return false;
            }

            if (!incomingUrl.startsWith(redirectLink)) {
                return false;
            }

            settled = true;
            clearTimeout(timeoutId);
            subscription.remove();
            resolve(new URL(incomingUrl));
            return true;
        };

        const subscription = Linking.addEventListener('url', ({ url }) => {
            resolveIfMatches(url);
        });

        // Handles cold-start return paths where listener may miss the first event.
        void Linking.getInitialURL().then((initialUrl) => {
            resolveIfMatches(initialUrl);
        });
    });
}

function decodePayload<T>(params: PhantomEncryptedParams, sharedSecret: Uint8Array): T {
    const decodedNonce = bs58.decode(params.nonce);
    const decodedData = bs58.decode(params.data);
    const decrypted = nacl.box.open.after(decodedData, decodedNonce, sharedSecret);

    if (!decrypted) {
        throw new Error('Failed to decrypt Phantom payload');
    }

    const json = toBuffer(decrypted).toString('utf8');
    return JSON.parse(json) as T;
}

function encodePayload(payload: unknown, sharedSecret: Uint8Array): PhantomEncryptedParams {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
    const encrypted = nacl.box.after(payloadBytes, nonce, sharedSecret);

    return {
        nonce: bs58.encode(toBuffer(nonce)),
        data: bs58.encode(toBuffer(encrypted)),
    };
}

function buildUrl(path: string, params: Record<string, string>): string {
    const url = new URL(`${PHANTOM_DEEPLINK_BASE}/${path}`);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return url.toString();
}

function isSessionInvalidError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const code = (error as { code?: unknown }).code;
    const message = String((error as { message?: unknown }).message || '').toLowerCase();
    if (code === '4100' || code === '401') {
        return true;
    }

    return message.includes('session') || message.includes('authorized');
}

export async function connectPhantomDeeplink(network: NetworkType): Promise<PhantomDeeplinkSession> {
    const dappKeyPair = nacl.box.keyPair();
    const dappPublicKey = bs58.encode(toBuffer(dappKeyPair.publicKey));
    const dappSecretKey = bs58.encode(toBuffer(dappKeyPair.secretKey));
    const redirectLink = buildRedirectLink(CALLBACK_CONNECT_PATH);
    const appUrl = process.env.EXPO_PUBLIC_APP_IDENTITY_URI || 'https://phantom.app';

    const connectUrl = buildUrl('connect', {
        dapp_encryption_public_key: dappPublicKey,
        cluster: toCluster(network),
        app_url: appUrl,
        redirect_link: redirectLink,
    });

    await Linking.openURL(connectUrl);
    const callbackUrl = await waitForRedirect(redirectLink);
    const callbackError = parseErrorFromParams(callbackUrl.searchParams);
    if (callbackError) {
        throw callbackError;
    }

    const walletEncryptionPublicKey = callbackUrl.searchParams.get('phantom_encryption_public_key');
    const nonce = callbackUrl.searchParams.get('nonce');
    const data = callbackUrl.searchParams.get('data');

    if (!walletEncryptionPublicKey || !nonce || !data) {
        throw new Error('Phantom connect callback missing encrypted payload');
    }

    const sharedSecret = nacl.box.before(bs58.decode(walletEncryptionPublicKey), dappKeyPair.secretKey);
    const payload = decodePayload<PhantomConnectResponse>({ nonce, data }, sharedSecret);

    return {
        dappPublicKey,
        dappSecretKey,
        walletEncryptionPublicKey,
        sharedSecret,
        session: payload.session,
        publicKey: new PublicKey(payload.public_key),
        network,
    };
}

async function signTransactionWithSession(
    transaction: Transaction,
    session: PhantomDeeplinkSession
): Promise<Transaction> {
    const redirectLink = buildRedirectLink(CALLBACK_SIGN_PATH);
    const serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
    });

    const encrypted = encodePayload(
        {
            transaction: bs58.encode(serializedTx),
            session: session.session,
        },
        session.sharedSecret
    );

    const signUrl = buildUrl('signTransaction', {
        dapp_encryption_public_key: session.dappPublicKey,
        nonce: encrypted.nonce,
        redirect_link: redirectLink,
        payload: encrypted.data,
    });

    await Linking.openURL(signUrl);
    const callbackUrl = await waitForRedirect(redirectLink);
    const callbackError = parseErrorFromParams(callbackUrl.searchParams);
    if (callbackError) {
        throw callbackError;
    }

    const nonce = callbackUrl.searchParams.get('nonce');
    const data = callbackUrl.searchParams.get('data');
    if (!nonce || !data) {
        throw new Error('Phantom sign callback missing encrypted payload');
    }

    const payload = decodePayload<PhantomSignResponse>({ nonce, data }, session.sharedSecret);
    return Transaction.from(bs58.decode(payload.transaction));
}

export async function signTransactionWithPhantomDeeplink(params: {
    transaction: Transaction;
    network: NetworkType;
    session?: PhantomDeeplinkSession;
}): Promise<{ signedTransaction: Transaction; session: PhantomDeeplinkSession }> {
    const activeSession =
        params.session && params.session.network === params.network
            ? params.session
            : await connectPhantomDeeplink(params.network);

    try {
        const signedTransaction = await signTransactionWithSession(params.transaction, activeSession);
        return { signedTransaction, session: activeSession };
    } catch (error) {
        if (!isSessionInvalidError(error)) {
            throw error;
        }

        const refreshedSession = await connectPhantomDeeplink(params.network);
        const signedTransaction = await signTransactionWithSession(params.transaction, refreshedSession);
        return { signedTransaction, session: refreshedSession };
    }
}

