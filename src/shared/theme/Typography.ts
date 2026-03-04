import { Platform, TextStyle } from 'react-native';

const fontSystem = Platform.select({
    ios: 'System',
    android: 'Roboto', // Or system default
    default: 'System',
});

export const Typography = {
    fontFamily: fontSystem,
    weights: {
        regular: '400',
        medium: '500',
        bold: '700',
        black: '900',
    } as const,
    sizes: {
        micro: 10,
        caption: 12,
        body: 16,
        subtitle: 14,
        title: 20,
        headline: 24,
        display: 32,
    },
    styles: {
        title: {
            fontSize: 24,
            fontWeight: '700',
            color: '#000000',
            letterSpacing: -0.5,
        } as TextStyle,
        body: {
            fontSize: 16,
            fontWeight: '400',
            color: '#111111',
            lineHeight: 22,
        } as TextStyle,
        caption: {
            fontSize: 12,
            fontWeight: '400',
            color: '#666666',
        } as TextStyle,
    },
};
