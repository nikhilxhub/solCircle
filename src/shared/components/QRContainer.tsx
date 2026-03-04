import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '@/shared/theme/Colors';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';

interface QRContainerProps {
    value: string;
    displayValue?: string;
}

export const QRContainer: React.FC<QRContainerProps> = ({ value, displayValue }) => {
    return (
        <View style={styles.container}>
            <View style={styles.qrWrapper}>
                <QRCode
                    value={value}
                    size={200}
                    color="black"
                    backgroundColor="white"
                />
            </View>
            <Text style={styles.valueText} numberOfLines={1} ellipsizeMode="middle">
                {displayValue !== undefined ? displayValue : value}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: Layout.spacing.xl,
        backgroundColor: Colors.background,
        borderRadius: Layout.radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    qrWrapper: {
        padding: Layout.spacing.md,
        backgroundColor: 'white',
        borderRadius: Layout.radius.md,
        // Optional: add shadow or border if desired for better contrast
    },
    valueText: {
        marginTop: Layout.spacing.md,
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        maxWidth: 200,
    },
});
