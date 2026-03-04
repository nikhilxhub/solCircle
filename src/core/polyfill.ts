import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { getRandomValues as expoCryptoGetRandomValues } from 'expo-crypto';
import { Buffer } from 'buffer';

if (typeof globalThis.Buffer === 'undefined') {
    globalThis.Buffer = Buffer;
}

if (typeof globalThis.crypto === 'undefined') {
    Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        enumerable: true,
        value: { getRandomValues: expoCryptoGetRandomValues },
    });
}
