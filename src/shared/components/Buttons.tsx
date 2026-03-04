import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacityProps,
    View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/shared/theme/Colors';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    loading?: boolean;
    variant?: 'primary' | 'outline' | 'text';
    labelStyle?: any;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
    title,
    style,
    labelStyle,
    loading,
    variant = 'primary',
    onPress,
    disabled,
    ...props
}) => {
    const handlePress = (e: any) => {
        Haptics.selectionAsync();
        onPress?.(e);
    };

    const getBackgroundColor = () => {
        if (disabled) return Colors.border;
        if (variant === 'primary') return Colors.buttonPrimary;
        return 'transparent';
    };

    const getTextColor = () => {
        if (disabled) return Colors.textTertiary;
        if (variant === 'primary') return Colors.buttonText;
        return Colors.text;
    };

    const getBorderWidth = () => {
        if (variant === 'outline') return 1;
        return 0;
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(),
                    borderWidth: getBorderWidth(),
                    borderColor: Colors.buttonPrimary,
                },
                style,
            ]}
            onPress={handlePress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }, labelStyle]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

export const TextButton: React.FC<ButtonProps> = ({
    title,
    style,
    labelStyle,
    onPress,
    disabled,
    ...props
}) => {
    const handlePress = (e: any) => {
        Haptics.selectionAsync();
        onPress?.(e);
    };

    return (
        <TouchableOpacity
            style={[styles.textButton, style]}
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={0.6}
            hitSlop={Layout.hitSlop}
            {...props}
        >
            <Text
                style={[
                    styles.textButtonLabel,
                    { color: disabled ? Colors.textTertiary : Colors.text },
                    labelStyle,
                ]}
            >
                {title}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 48,
        borderRadius: Layout.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Layout.spacing.lg,
    },
    text: {
        ...Typography.styles.body,
        fontWeight: '600',
    },
    textButton: {
        padding: Layout.spacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textButtonLabel: {
        ...Typography.styles.body,
        fontWeight: '500',
    },
    iconButtonContainer: {
        width: 48,
        height: 48,
        borderRadius: 24, // Circle
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.secondary, // Light gray/secondary background
    },
    iconButtonLabel: {
        ...Typography.styles.caption,
        marginTop: Layout.spacing.xs,
        color: Colors.text,
        textAlign: 'center',
    },
});

interface IconActionButtonProps extends TouchableOpacityProps {
    icon: React.ReactNode;
    label?: string;
    labelStyle?: any;
}

export const IconActionButton: React.FC<IconActionButtonProps> = ({
    icon,
    label,
    style,
    labelStyle,
    onPress,
    ...props
}) => {
    return (
        <TouchableOpacity
            style={{ alignItems: 'center' }}
            onPress={onPress}
            activeOpacity={0.7}
            {...props}
        >
            <View style={[styles.iconButtonContainer, style]}>
                {icon}
            </View>
            {label && <Text style={[styles.iconButtonLabel, labelStyle]}>{label}</Text>}
        </TouchableOpacity>
    );
};
