// Obsidian Fuel — design tokens
// Converted from the design package (DESIGN.md + theme.ts reference).
// Screens import these constants instead of hardcoding values.

import type { TextStyle } from 'react-native';

export const colors = {
  // Surfaces (tonal steps, dark → light)
  surfaceBase: '#0B0C10', // behind nav bars / safe areas
  surfaceCanvas: '#0F1115', // default screen background
  surfaceCard: '#181A20', // rest state for cards, inputs, list rows
  surfaceElevated: '#222630', // active sheets, modals, floating banners
  surfaceInteractive: '#2C313E', // segmented controls, toggle tracks, press states

  // Borders
  borderSubtle: '#232733',
  borderStrong: '#343A4A',

  // Text
  textPrimary: '#F0F2F5',
  textSecondary: '#9BA3AF',
  textTertiary: '#606877',

  // Brand / action
  primary: '#FFFFFF',
  onPrimary: '#0B0C10',

  // Telemetry accents — used with intent, never decoratively
  metricPeak: '#F59E0B', // amber — costliest month, warnings, alerts
  metricPositive: '#10B981', // emerald — efficiency, positive deltas, success
  metricDanger: '#EF4444', // destructive actions (delete entry)

  // Tinted backgrounds for chips/callouts (10% opacity versions)
  metricPeakTint: 'rgba(245, 158, 11, 0.1)',
  metricPositiveTint: 'rgba(16, 185, 129, 0.1)',
  metricDangerTint: 'rgba(239, 68, 68, 0.1)',
};

// Gradient fills called out explicitly by DESIGN.md components.
export const gradients = {
  // Daily check-in prompt: surfaceCard → #1D212B (vertical)
  prompt: [colors.surfaceCard, '#1D212B'] as [string, string],
  // Peak-expense callout: surfaceCard → surfaceElevated (horizontal)
  peakCallout: [colors.surfaceCard, colors.surfaceElevated] as [string, string],
};

export const typography = {
  displayLg: { fontSize: 36, fontWeight: '700' as const, lineHeight: 44, letterSpacing: -1.1 },
  headlineLg: { fontSize: 28, fontWeight: '600' as const, lineHeight: 34, letterSpacing: -0.56 },
  headlineMd: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28, letterSpacing: -0.33 },
  headlineSm: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24, letterSpacing: -0.18 },
  titleMd: { fontSize: 16, fontWeight: '500' as const, lineHeight: 22, letterSpacing: -0.08 },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, letterSpacing: 0 },
  bodyMd: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, letterSpacing: 0 },
  labelMd: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.24 },
  labelSm: {
    fontSize: 10,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  metricXl: { fontSize: 32, fontWeight: '700' as const, lineHeight: 38, letterSpacing: -0.64 },
  metricMd: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26, letterSpacing: -0.2 },
};

// Design-system font family name (Inter). The concrete runtime family names
// live in `interFamilies` below — React Native cannot resolve `fontWeight`
// against runtime-registered static font files, so every weight is registered
// as its own named family in app/_layout.tsx and resolved through `t()`.
export const fontFamily = 'Inter';

export const interFamilies = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
} as const;

export type TypeToken = {
  fontSize: number;
  fontWeight?: keyof typeof interFamilies;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize';
};

/** Resolve a `typography` token into a React Native TextStyle (Inter family). */
export function t(token: TypeToken): TextStyle {
  const { fontWeight, ...rest } = token;
  return { fontFamily: interFamilies[fontWeight ?? '400'], ...rest };
}

/** Tabular (fixed-width) figures for numeric readouts — DESIGN.md `tnum`. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const radius = {
  sm: 4,
  default: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const spacing = {
  gutter: 16, // between sibling cards
  margin: 20, // outer horizontal screen inset
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// Elevation via border, not shadow (per design system — keeps OLED contrast crisp)
export const elevation = {
  level0: { backgroundColor: colors.surfaceCanvas },
  level1: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  level2: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8, // Android
  },
};

// Icon mapping: Material Symbols (used in the mockup) → @expo/vector-icons
// Use Ionicons unless noted. Stroke width ~1.75, size 20 or 24.
export const iconMap = {
  local_gas_station: { set: 'Ionicons', name: 'car-outline' }, // or 'speedometer-outline'
  add_circle: { set: 'Ionicons', name: 'add-circle-outline' },
  check_circle: { set: 'Ionicons', name: 'checkmark-circle-outline' },
  trending_down: { set: 'Ionicons', name: 'trending-down-outline' },
  trending_up: { set: 'Ionicons', name: 'trending-up-outline' },
  warning: { set: 'Ionicons', name: 'warning-outline' },
  calendar: { set: 'Ionicons', name: 'calendar-outline' },
  download: { set: 'Ionicons', name: 'download-outline' },
  trash: { set: 'Ionicons', name: 'trash-outline' },
  chevron_down: { set: 'Ionicons', name: 'chevron-down-outline' },
  bar_chart: { set: 'Ionicons', name: 'bar-chart-outline' },
  home: { set: 'Ionicons', name: 'home-outline' },
};
