import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/shared/theme/Colors';
import { Layout } from '@/shared/theme/Layout';

interface SectionDividerProps {
    style?: ViewStyle;
}

export const SectionDivider: React.FC<SectionDividerProps> = ({ style }) => {
    return <View style={[styles.divider, style]} />;
};

const styles = StyleSheet.create({
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: Colors.border,
        marginVertical: Layout.spacing.sm,
    },
});
