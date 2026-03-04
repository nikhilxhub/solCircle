import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableOpacityProps,
    GestureResponderEvent,
} from 'react-native';
import { Colors } from '@/shared/theme/Colors';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface ListItemProps extends TouchableOpacityProps {
    label: string;
    value?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    showChevron?: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({
    label,
    value,
    icon,
    showChevron,
    onPress,
    ...props
}) => {
    const handlePress = (event: GestureResponderEvent) => {
        if (onPress) {
            Haptics.selectionAsync();
            onPress(event);
        }
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress ? handlePress : undefined}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress}
            {...props}
        >
            <View style={styles.content}>
                <Text style={styles.label}>{label}</Text>
                {value && <Text style={styles.value}>{value}</Text>}
            </View>
            {showChevron && (
                <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={Colors.textTertiary}
                    style={styles.chevron}
                />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Layout.spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
        minHeight: 56,
    },
    content: {
        flex: 1,
    },
    label: {
        ...Typography.styles.body,
        fontWeight: '500',
        color: Colors.text,
    },
    value: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    chevron: {
        marginLeft: Layout.spacing.sm,
    },
});
