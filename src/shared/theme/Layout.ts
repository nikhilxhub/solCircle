import { Dimensions, Platform } from 'react-native';

const width = Dimensions.get('window').width;
const height = Dimensions.get('window').height;

export const Layout = {
    window: {
        width,
        height,
    },
    isSmallDevice: width < 375,
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },
    radius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        round: 999,
    },
    hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
};
