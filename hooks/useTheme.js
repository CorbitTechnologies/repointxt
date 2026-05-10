import { useColorScheme, Platform } from 'react-native';
import { useMemo } from 'react';

const palette = {
    // Premium Developer Theme
    primary: '#0070F3', // Sleek Blue
    primaryLight: '#3291FF',
    primaryDark: '#0051B3',
    secondary: '#10B981', 

    success: '#0070F3', // Let's use primary for success states for a unified look
    warning: '#F5A623',
    error: '#E00000',

    // Light Theme
    white: '#FFFFFF',
    gray50: '#FAFAFA',
    gray100: '#F5F5F5',
    gray200: '#EAEAEA',
    gray300: '#999999',
    gray400: '#888888',
    gray500: '#666666',
    gray600: '#444444',
    gray700: '#333333',
    gray800: '#111111',
    gray900: '#000000',

    // Dark Theme
    darkBg: '#000000',
    darkCard: '#0A0A0A',
    darkSurface: '#111111',
    darkBorder: '#222222',
};

export const useTheme = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return useMemo(() => {
        return {
            isDark,
            colors: {
                primary: palette.primary,
                primaryLight: palette.primaryLight,
                primaryDark: palette.primaryDark,
                secondary: palette.secondary,
                success: palette.success,
                warning: palette.warning,
                error: palette.error,

                background: isDark ? palette.darkBg : palette.white,
                card: isDark ? palette.darkCard : palette.gray50,
                surface: isDark ? palette.darkSurface : palette.white,
                border: isDark ? palette.darkBorder : palette.gray200,

                text: isDark ? '#EDEDED' : palette.gray900,
                textSecondary: isDark ? '#A1A1AA' : palette.gray500,
                textPlaceholder: isDark ? '#555555' : palette.gray300,

                icon: isDark ? '#A1A1AA' : palette.gray500,

                primaryGradient: isDark ? 'linear-gradient(135deg, #0070F3 0%, #0051B3 100%)' : 'linear-gradient(135deg, #0070F3 0%, #3291FF 100%)',
            },
            spacing: {
                xs: 4,
                sm: 8,
                md: 16,
                lg: 24,
                xl: 32,
                xxl: 48,
            },
            borderRadius: {
                sm: 4,
                md: 6,
                lg: 8,
                xl: 12,
                full: 9999,
            },
            shadows: Platform.select({
                web: {
                    sm: { boxShadow: isDark ? '0 0 0 1px #333' : '0 1px 2px rgba(0,0,0,0.05)' },
                    md: { boxShadow: isDark ? '0 0 0 1px #333, 0 4px 6px rgba(0,0,0,0.4)' : '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' },
                    lg: { boxShadow: isDark ? '0 0 0 1px #333, 0 10px 15px rgba(0,0,0,0.5)' : '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)' },
                },
                default: isDark ? {
                    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.5, shadowRadius: 2, elevation: 2 },
                    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 5 },
                    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.8, shadowRadius: 15, elevation: 10 },
                } : {
                    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
                    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
                    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 10 },
                }
            })
        };
    }, [isDark]);
};
