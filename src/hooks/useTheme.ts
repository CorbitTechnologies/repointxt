import { useState, useEffect, useMemo } from 'react';

const palette = {
    primary: '#1f6feb',        // Clean GitHub/Linear refined blue
    primaryLight: '#388bfd',
    primaryDark: '#1158c7',
    secondary: '#238636',      // Refined GitHub green

    success: '#238636',
    warning: '#d29922',
    error: '#f85149',

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

    darkBg: '#090d13',        // Refined deep slate background instead of #000000
    darkCard: '#0e1117',      // Sleek container background
    darkSurface: '#161b22',   // Element background
    darkBorder: '#21262d',    // Subtle border instead of stark borders
    darkBorderSubtle: '#30363d',
};

export const useTheme = () => {
    const [isDark, setIsDark] = useState(
        typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return useMemo(() => {
        return {
            isDark,
            colors: {
                primary: isDark ? '#58a6ff' : '#0969da',
                primaryButtonBg: '#1f6feb',
                primaryLight: '#58a6ff',
                primaryDark: isDark ? '#1f6feb' : '#0550ae',
                secondary: palette.secondary,
                success: palette.success,
                warning: palette.warning,
                error: palette.error,

                background: isDark ? palette.darkBg : palette.white,
                card: isDark ? palette.darkCard : palette.white,
                surface: isDark ? palette.darkSurface : palette.gray50,
                border: isDark ? palette.darkBorder : palette.gray200,
                borderSubtle: isDark ? palette.darkBorderSubtle : palette.gray300,

                text: isDark ? '#e6edf3' : '#1f2328',
                textSecondary: isDark ? '#8b949e' : '#656d76',
                textPlaceholder: isDark ? '#6e7681' : '#8c959f',

                icon: isDark ? '#e6edf3' : '#1f2328',

                primaryGradient: 'linear-gradient(135deg, #1f6feb 0%, #238636 100%)',
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
                sm: { boxShadow: isDark ? '0 1px 2px rgba(0,0,0,0.8)' : '0 1px 2px rgba(0,0,0,0.05)' },
                md: { boxShadow: isDark ? '0 4px 6px rgba(0,0,0,0.8)' : '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' },
                lg: { boxShadow: isDark ? '0 10px 15px rgba(0,0,0,0.9)' : '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)' },
            }
        };
    }, [isDark]);
};
