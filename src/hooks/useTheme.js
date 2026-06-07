import { useState, useEffect, useMemo } from 'react';

const palette = {
    primary: '#10a37f', // ChatGPT Green
    primaryLight: '#34d399',
    primaryDark: '#0d7d62',
    secondary: '#10a37f',

    success: '#10a37f',
    warning: '#f59e0b',
    error: '#ef4444',

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
    darkBg: '#09090b', // zinc-950
    darkCard: '#18181b', // zinc-900
    darkSurface: '#27272a', // zinc-800
    darkBorder: '#3f3f46', // zinc-700
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
                primary: isDark ? '#10a37f' : '#0d7d62',
                primaryLight: palette.primaryLight,
                primaryDark: palette.primaryDark,
                secondary: palette.secondary,
                success: palette.success,
                warning: palette.warning,
                error: palette.error,

                background: isDark ? palette.darkBg : palette.white,
                card: isDark ? palette.darkCard : palette.white,
                surface: isDark ? palette.darkSurface : palette.gray100,
                border: isDark ? '#52525b' : palette.gray300, // zinc-600 / gray-300 for clearer borders

                text: isDark ? '#ffffff' : '#18181b', // pure white on dark / zinc-900 on light
                textSecondary: isDark ? '#e4e4e7' : '#52525b', // zinc-200 on dark / zinc-600 on light
                textPlaceholder: isDark ? '#a1a1aa' : '#71717a', // zinc-400 on dark / zinc-500 on light

                icon: isDark ? '#e4e4e7' : '#52525b',

                primaryGradient: isDark ? 'linear-gradient(135deg, #10a37f 0%, #0d7d62 100%)' : 'linear-gradient(135deg, #10a37f 0%, #0d7d62 100%)',
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
