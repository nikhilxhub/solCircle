import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '@/shared/theme/Colors';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface AppHeaderProps {
    title: string;
    showBack?: boolean;
    rightAction?: React.ReactNode;
    style?: ViewStyle;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    title,
    showBack,
    rightAction,
    style,
}) => {
    const router = useRouter();

    return (
        <View style={[styles.container, style]}>
            <View style={styles.leftContainer}>
                {showBack && (
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                        hitSlop={Layout.hitSlop}
                    >
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                )}
                <Text style={styles.title} numberOfLines={1}>
                    {title}
                </Text>
            </View>
            <View style={styles.rightContainer}>{rightAction}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 56, // Standard accessible height
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Layout.spacing.md,
        backgroundColor: Colors.background,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        marginRight: Layout.spacing.sm,
    },
    title: {
        ...Typography.styles.title,
        fontSize: 20, // Slightly smaller than page title for header
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
