import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    Animated,
    Easing,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/shared/components/ScreenContainer';
import { AppHeader } from '@/shared/components/AppHeader';
import { Layout } from '@/shared/theme/Layout';
import { InputField } from '@/shared/components/InputField';
import { Colors } from '@/shared/theme/Colors';
import { Typography } from '@/shared/theme/Typography';
import { ContactRepository } from '@/features/contacts/data/ContactRepository';
import { Contact } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { isValidPublicKey } from '@/features/wallet/services/solanaTransfers';
import { notifyUser } from '@/shared/services/feedback';

function getParamValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
}

export default function AddContactScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [wallet, setWallet] = useState('');
    const [skr, setSkr] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const successAnim = React.useRef(new Animated.Value(0)).current;
    const successTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        const walletAddress = getParamValue(params.walletAddress);
        const name = getParamValue(params.name);
        const phone = getParamValue(params.phone) || getParamValue(params.phoneNumber);
        const skrAddress = getParamValue(params.skrAddress);

        if (walletAddress) setWallet(walletAddress);
        if (name) setName(name);
        if (phone) setPhone(phone);
        if (skrAddress) setSkr(skrAddress);
    }, [params]);

    React.useEffect(() => {
        return () => {
            if (successTimerRef.current) {
                clearTimeout(successTimerRef.current);
            }
        };
    }, []);

    const handleSave = async () => {
        if (!name.trim()) {
            notifyUser({ title: 'Validation', message: 'Name is required' });
            return;
        }

        const walletAddress = wallet.trim();
        if (walletAddress && !isValidPublicKey(walletAddress)) {
            notifyUser({ title: 'Validation', message: 'Enter a valid Solana wallet address.' });
            return;
        }

        const addedViaParam = getParamValue(params.addedVia);
        const addedVia: Contact['addedVia'] = addedViaParam === 'qr' ? 'qr' : 'manual';

        try {
            setIsSubmitting(true);
            const newContact: Contact = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                name: name.trim(),
                phoneNumber: phone.trim(),
                walletAddress,
                skrAddress: skr.trim(),
                notes: notes.trim(),
                addedVia,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            await ContactRepository.addContact(newContact);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowSuccessModal(true);
            successAnim.setValue(0);
            Animated.spring(successAnim, {
                toValue: 1,
                damping: 14,
                mass: 0.6,
                stiffness: 180,
                useNativeDriver: true,
            }).start();
            if (successTimerRef.current) {
                clearTimeout(successTimerRef.current);
            }
            successTimerRef.current = setTimeout(() => {
                Animated.timing(successAnim, {
                    toValue: 0,
                    duration: 180,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }).start(() => {
                    setShowSuccessModal(false);
                    if (addedVia === 'qr') {
                        router.replace('/home');
                    } else {
                        router.back();
                    }
                });
            }, 950);
        } catch (error) {
            console.error('Failed to save contact:', error);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            notifyUser({ title: 'Error', message: 'Failed to save contact' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScreenContainer>
            <AppHeader title="" showBack />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.formStack}>
                        <InputField
                            label="Name"
                            placeholder="Required"
                            autoFocus
                            value={name}
                            onChangeText={setName}
                            style={styles.minimalInput}
                        />
                        <InputField
                            label="Phone"
                            placeholder="+1 234 567 8900"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                            style={styles.minimalInput}
                        />
                        <InputField
                            label="Wallet Address"
                            placeholder="solana public adderess"
                            value={wallet}
                            onChangeText={setWallet}
                            style={styles.minimalInput}
                        />
                        <InputField
                            label=".skr Address"
                            placeholder="username.skr"
                            autoCapitalize="none"
                            value={skr}
                            onChangeText={setSkr}
                            style={styles.minimalInput}
                        />
                        <InputField
                            label="Notes"
                            placeholder="Type here..."
                            multiline
                            style={[styles.minimalInput, { height: 80, textAlignVertical: 'top' }]}
                            value={notes}
                            onChangeText={setNotes}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Floating Action Button for Save */}
            <TouchableOpacity
                style={[styles.fab, isSubmitting && styles.fabDisabled]}
                onPress={handleSave}
                disabled={isSubmitting || showSuccessModal}
                activeOpacity={0.8}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Ionicons name="checkmark" size={32} color="white" />
                )}
            </TouchableOpacity>

            <Modal
                visible={showSuccessModal}
                transparent
                animationType="none"
                statusBarTranslucent
            >
                <View style={styles.successOverlay}>
                    <Animated.View
                        style={[
                            styles.successCard,
                            {
                                opacity: successAnim,
                                transform: [
                                    {
                                        scale: successAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.86, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <View style={styles.successIconCircle}>
                            <Ionicons name="checkmark" size={28} color={Colors.background} />
                        </View>
                        <Text style={styles.successTitle}>Contact saved</Text>
                        <Text style={styles.successSubtitle}>Saved successfully.</Text>
                    </Animated.View>
                </View>
            </Modal>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: Layout.spacing.xl,
        paddingBottom: 100, // Space for FAB
    },
    formStack: {
        gap: Layout.spacing.xl, // Spacious gaps (24px+)
    },
    minimalInput: {
        borderBottomWidth: 1, // Keep it minimal
        borderBottomColor: Colors.border,
        fontSize: 18, // Slightly larger text
        paddingVertical: Layout.spacing.md,
    },
    fab: {
        position: 'absolute',
        bottom: Layout.spacing.xl,
        right: Layout.spacing.xl,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.text, // Black
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    fabDisabled: {
        backgroundColor: Colors.textTertiary,
    },
    successOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Layout.spacing.xl,
    },
    successCard: {
        width: '100%',
        maxWidth: 300,
        borderRadius: Layout.radius.lg,
        paddingHorizontal: Layout.spacing.lg,
        paddingVertical: Layout.spacing.xl,
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    successIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.text,
        marginBottom: Layout.spacing.md,
    },
    successTitle: {
        ...Typography.styles.body,
        color: Colors.text,
        fontWeight: '700',
    },
    successSubtitle: {
        ...Typography.styles.caption,
        color: Colors.textSecondary,
        marginTop: Layout.spacing.xs,
    },
});
