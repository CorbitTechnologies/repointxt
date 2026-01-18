import { useColorScheme, Platform } from 'react-native';
import { useMemo } from 'react';

const palette = {
    // Vibrant Primary
    primary: '#6366F1', // Indigo
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    secondary: '#EC4899', // Pink

    success: '#10B981', // Emerald
    warning: '#F59E0B', // Amber
    error: '#EF4444', // Red

    // Light Theme
    white: '#FFFFFF',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',

    // Dark Theme - True Black OLED experience
    darkBg: '#000000',
    darkCard: '#0A0B10',
    darkSurface: '#12151E',
    darkBorder: '#1E293B',
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

                background: isDark ? palette.darkBg : palette.gray50,
                card: isDark ? palette.darkCard : palette.white,
                surface: isDark ? palette.darkSurface : palette.gray100,
                border: isDark ? palette.darkBorder : palette.gray200,

                text: isDark ? '#F9FAFB' : palette.gray900,
                textSecondary: isDark ? '#94A3B8' : palette.gray500,
                textPlaceholder: isDark ? '#475569' : palette.gray400,

                icon: isDark ? '#94A3B8' : palette.gray600,

                // For web gradients
                primaryGradient: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
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
                sm: 6,
                md: 10,
                lg: 16,
                xl: 24,
                full: 9999,
            },
            shadows: Platform.select({
                web: {
                    sm: { boxShadow: isDark ? '0 1px 2px rgba(0,0,0,0.5)' : '0 1px 2px rgba(0,0,0,0.05)' },
                    md: { boxShadow: isDark ? '0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -2px rgba(0,0,0,0.2)' : '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)' },
                    lg: { boxShadow: isDark ? '0 20px 25px -5px rgba(0,0,0,0.6), 0 10px 10px -5px rgba(0,0,0,0.3)' : '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' },
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
