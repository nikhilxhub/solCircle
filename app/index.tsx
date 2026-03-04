import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/shared/theme/Colors';
import { Typography } from '@/shared/theme/Typography';

export default function SplashScreen() {
    const router = useRouter();
    const fadeAnim = new Animated.Value(0);

    useEffect(() => {
        // Fade in
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start(() => {
            // Create a small delay then navigate to Home
            setTimeout(() => {
                router.replace('/home');
            }, 500);
        });
    }, []);

    return (
        <View style={styles.container}>
            <Animated.Text style={[styles.logo, { opacity: fadeAnim }]}>
                SolCircle
            </Animated.Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        ...Typography.styles.title,
        fontSize: 40,
        letterSpacing: -1,
        fontWeight: '900', // Heavy bold for impact
    },
});
