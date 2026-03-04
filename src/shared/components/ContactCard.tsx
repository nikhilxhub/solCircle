import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableOpacityProps,
} from 'react-native';
import { Colors } from '@/shared/theme/Colors';
import { Layout } from '@/shared/theme/Layout';
import { Typography } from '@/shared/theme/Typography';
import { Avatar } from './Avatar';
import * as Haptics from 'expo-haptics';

interface ContactCardProps extends TouchableOpacityProps {
    name: string;
    detail: string;
    onPress: () => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
    name,
    detail,
    onPress,
    ...props
}) => {
    const handlePress = () => {
        Haptics.selectionAsync();
        onPress();
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.6} // More subtle press
            {...props}
        >
            <Avatar name={name} size={50} />
            <View style={styles.textContainer}>
                <Text style={styles.name} numberOfLines={1}>
                    {name}
                </Text>
                {/* Only show detail if it exists, caption style */}
                {detail ? (
                    <Text style={styles.detail} numberOfLines={1}>
                        {detail}
                    </Text>
                ) : null}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Layout.spacing.lg, // Increased padding (Airy)
        paddingHorizontal: Layout.spacing.md, // Add horizontal padding for touch target
        backgroundColor: Colors.background,
        // Minimalist separator Logic: handled by FlatList ItemSeparatorComponent usually, 
        // but here we can keep a very subtle border or remove it for a cleaner look.
        // Let's keep a very faint border for list readability.
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
    },
    textContainer: {
        marginLeft: Layout.spacing.lg, // More space between avatar and text
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        ...Typography.styles.body,
        fontWeight: '700', // Stronger weight
        fontSize: 17, // Slightly larger
        color: Colors.text,
        marginBottom: 2,
    },
    detail: {
        ...Typography.styles.caption,
        color: Colors.textTertiary, // lighter gray for hierarchy
        fontSize: 13,
    },
});
