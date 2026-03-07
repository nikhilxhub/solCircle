import { Alert, Platform, ToastAndroid } from 'react-native';

type NotifyUserInput = {
    title?: string;
    message: string;
    forceAlert?: boolean;
};

export function notifyUser({ title, message, forceAlert = false }: NotifyUserInput): void {
    if (!forceAlert && Platform.OS === 'android') {
        const toastText = title ? `${title}: ${message}` : message;
        ToastAndroid.show(toastText, ToastAndroid.SHORT);
        return;
    }

    Alert.alert(title ?? 'Notice', message);
}
