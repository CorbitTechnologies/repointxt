import { useState, useEffect, useMemo } from 'react';

const palette = {
    primary: '#007AFF', // Electric Blue
    primaryLight: '#5AC8FA',
    primaryDark: '#0056B3',
    secondary: '#32CD32', // Lime Green

    success: '#32CD32',
    warning: '#FF9500',
    error: '#FF3B30',

    // Light Theme (ChatGPT inspired)
    white: '#FFFFFF',
    gray50: '#F7F7F8',
    gray100: '#ECECF1',
    gray200: '#D9D9E3',
    gray300: '#C5C5D2',
    gray400: '#ACACBE',
    gray500: '#8E8EA0',
    gray600: '#565869',
    gray700: '#40414F',
    gray800: '#343541',
    gray900: '#202123',

    // Dark Theme (ChatGPT inspired)
    darkBg: '#202123',
    darkCard: '#343541',
    darkSurface: '#40414F',
    darkBorder: '#565869',
};

export const useTheme = () => {
    const [isDark, setIsDark] = useState(
        typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => setIsDark(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

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
                card: isDark ? palette.darkCard : palette.white,
                surface: isDark ? palette.darkSurface : palette.gray50,
                border: isDark ? palette.darkBorder : palette.gray200,

                text: isDark ? '#ECECF1' : '#202123',
                textSecondary: isDark ? '#C5C5D2' : '#565869',
                textPlaceholder: isDark ? '#8E8EA0' : '#8E8EA0',

                icon: isDark ? '#C5C5D2' : '#565869',

                primaryGradient: isDark ? 'linear-gradient(135deg, #007AFF 0%, #32CD32 100%)' : 'linear-gradient(135deg, #007AFF 0%, #32CD32 100%)',
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
            shadows: {
                sm: { boxShadow: isDark ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)' },
                md: { boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.4)' : '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' },
                lg: { boxShadow: isDark ? '0 10px 15px rgba(0,0,0,0.5)' : '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)' },
            }
        };
    }, [isDark]);
};
