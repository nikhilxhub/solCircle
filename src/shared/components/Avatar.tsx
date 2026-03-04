import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/shared/theme/Colors';
import { Typography } from '@/shared/theme/Typography';

interface AvatarProps {
    name?: string;
    size?: number;
    uri?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 48, uri }) => {
    const getInitials = (name?: string) => {
        if (!name) return '';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <View
            style={[
                styles.container,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                },
            ]}
        >
            <Text
                style={[
                    styles.text,
                    {
                        fontSize: size * 0.4,
                        lineHeight: size * 0.5, // Explicit line height to prevent clipping
                    },
                ]}
                allowFontScaling={false} // Prevent scaling issues
            >
                {getInitials(name)}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.border, // Neutral placeholder
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.borderDark,
        overflow: 'hidden',
    },
    text: {
        ...Typography.styles.body,
        fontWeight: '600',
        color: Colors.text,
        includeFontPadding: false, // Android specific fix
        textAlign: 'center',
        textAlignVertical: 'center',
    },
});
