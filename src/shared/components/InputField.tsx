import React, { useState } from 'react';
import {
    TextInput,
    View,
    Text,
    StyleSheet,
    TextInputProps,
} from 'react-native';
import { Colors } from '@/shared/theme/Colors';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';

interface InputFieldProps extends TextInputProps {
    label: string;
    error?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
    label,
    error,
    style,
    onFocus,
    onBlur,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: any) => {
        setIsFocused(true);
        onFocus?.(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        onBlur?.(e);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[
                    styles.input,
                    isFocused && styles.inputFocused,
                    !!error && styles.inputError,
                    style,
                ]}
                placeholderTextColor={Colors.placeholder}
                onFocus={handleFocus}
                onBlur={handleBlur}
                selectionColor={Colors.selection}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: Layout.spacing.md,
    },
    label: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        marginBottom: Layout.spacing.xs,
        fontWeight: '600',
    },
    input: {
        ...Typography.styles.body,
        paddingVertical: Layout.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        color: Colors.text,
    },
    inputFocused: {
        borderBottomColor: Colors.text, // Black highlight
    },
    inputError: {
        borderBottomColor: Colors.error,
    },
    errorText: {
        ...Typography.styles.caption,
        color: Colors.error,
        marginTop: Layout.spacing.xs,
    },
});
