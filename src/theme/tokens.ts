/**
 * Design tokens. Calm emerald + warm sand with a gold accent:
 * quiet and respectful, no alarming reds (see docs/design.md).
 */
export const palette = {
  light: {
    background: '#F7F3EC',
    surface: '#FFFFFF',
    surfaceMuted: '#EFE9DE',
    border: '#E2DACB',
    text: '#1C2422',
    textMuted: '#5E6A66',
    primary: '#0F5E55',
    primaryPressed: '#0B4A43',
    onPrimary: '#FFFFFF',
    primarySoft: '#DCEDE9',
    accent: '#B8901F',
    accentSoft: '#F4EAC8',
    success: '#2E7D4F',
    heat1: '#B7DCD3',
    heat2: '#6FB8A7',
    onAccent: '#1C1606',
    overlay: 'rgba(16, 24, 22, 0.45)',
  },
  dark: {
    background: '#0E1513',
    surface: '#17211F',
    surfaceMuted: '#1F2B28',
    border: '#2A3835',
    text: '#EEF3F1',
    textMuted: '#A3B1AD',
    primary: '#4FBFA8',
    primaryPressed: '#3FA791',
    onPrimary: '#06201B',
    primarySoft: '#173B35',
    accent: '#E0BE5A',
    accentSoft: '#3A321A',
    success: '#6CCB8F',
    heat1: '#1E4A42',
    heat2: '#2F7F6F',
    onAccent: '#1C1606',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type Colors = { [K in keyof (typeof palette)['light']]: string };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

export const fonts = {
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
  bold: 'IBMPlexSansArabic_700Bold',
} as const;

/** Type scale: [fontSize, lineHeight]. Arabic needs generous line height. */
export const type = {
  display: { fontSize: 34, lineHeight: 50, fontFamily: fonts.bold },
  title: { fontSize: 24, lineHeight: 36, fontFamily: fonts.bold },
  heading: { fontSize: 18, lineHeight: 28, fontFamily: fonts.semibold },
  body: { fontSize: 16, lineHeight: 26, fontFamily: fonts.regular },
  bodyStrong: { fontSize: 16, lineHeight: 26, fontFamily: fonts.semibold },
  caption: { fontSize: 13, lineHeight: 20, fontFamily: fonts.regular },
  label: { fontSize: 14, lineHeight: 22, fontFamily: fonts.medium },
} as const;

export type TypeVariant = keyof typeof type;

/** Minimum touch target (accessibility). */
export const touchTarget = 48;
