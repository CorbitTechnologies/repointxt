import { useColorScheme, Platform } from 'react-native';

const palette = {
    primary: '#007AFF', // Standard Blue
    primaryDark: '#005BB5',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',

    // Light Theme
    white: '#FFFFFF',
    gray50: '#F9F9F9',
    gray100: '#F2F2F7',
    gray200: '#E5E5EA',
    gray300: '#D1D1D6',
    gray400: '#C7C7CC',
    gray500: '#8E8E93',
    gray600: '#636366',
    gray700: '#48484A',
    gray800: '#3A3A3C',
    gray900: '#1C1C1E',

    // Dark Theme specifics
    darkBg: '#000000',
    darkCard: '#1C1C1E',
    darkSurface: '#2C2C2E',
};

export const useTheme = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return {
        isDark,
        colors: {
            primary: palette.primary,
            primaryDark: palette.primaryDark,
            success: palette.success,
            warning: palette.warning,
            error: palette.error,

            background: isDark ? palette.darkBg : palette.gray100,
            card: isDark ? palette.darkCard : palette.white,
            surface: isDark ? palette.darkSurface : palette.gray50,
            border: isDark ? palette.gray700 : palette.gray200,

            text: isDark ? palette.white : palette.gray900,
            textSecondary: isDark ? palette.gray400 : palette.gray600,
            textPlaceholder: isDark ? palette.gray600 : palette.gray400,

            icon: isDark ? palette.gray300 : palette.gray700,
        },
        spacing: {
            xs: 4,
            sm: 8,
            md: 16,
            lg: 24,
            xl: 32,
        },
        borderRadius: {
            sm: 4,
            md: 8,
            lg: 12,
            xl: 16,
            full: 9999,
        },
        shadows: Platform.select({
            web: {
                sm: { boxShadow: isDark ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.1)' },
                md: { boxShadow: isDark ? '0 4px 8px rgba(0,0,0,0.5)' : '0 4px 8px rgba(0,0,0,0.1)' },
            },
            default: isDark ? {
                sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 2 },
                md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 5 },
            } : {
                sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
                md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
            }
        })
    };
};
