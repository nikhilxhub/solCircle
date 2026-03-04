import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/shared/theme/Colors';
import { Layout } from '@/shared/theme/Layout';

interface ScreenContainerProps {
    children: React.ReactNode;
    style?: ViewStyle;
    edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
    children,
    style,
    edges = ['top', 'left', 'right'],
}) => {
    return (
        <SafeAreaView style={[styles.container, style]} edges={edges}>
            {children}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
});
