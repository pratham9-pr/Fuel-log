import { useColorScheme } from 'react-native';

export interface ThemeColors {
  background: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  primaryBorder: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  placeholderText: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  highlightBg: string;
  highlightBorder: string;
  highlightText: string;
  chartBg: string;
  chartBar: string;
  chartLabel: string;
  headerBg: string;
  headerTint: string;
  chipBg: string;
  chipText: string;
  chipActiveBg: string;
  chipActiveText: string;
  divider: string;
  subtleBg: string;
  refreshColor: string;
}

export const LightTheme: ThemeColors = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryBorder: '#BFDBFE',
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  inputText: '#0F172A',
  placeholderText: '#94A3B8',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerText: '#DC2626',
  highlightBg: '#FFFBEB',
  highlightBorder: '#FDE68A',
  highlightText: '#B45309',
  chartBg: '#FFFFFF',
  chartBar: 'rgba(37, 99, 235, 1)',
  chartLabel: '#64748B',
  headerBg: '#2563EB',
  headerTint: '#FFFFFF',
  chipBg: '#E2E8F0',
  chipText: '#64748B',
  chipActiveBg: '#DBEAFE',
  chipActiveText: '#1D4ED8',
  divider: '#F1F5F9',
  subtleBg: '#F8FAFC',
  refreshColor: '#2563EB',
};

export const DarkTheme: ThemeColors = {
  background: '#0B0F19',
  card: '#161F30',
  cardBorder: '#232F46',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#3B82F6',
  primaryLight: '#172554',
  primaryBorder: '#1E40AF',
  inputBg: '#111827',
  inputBorder: '#374151',
  inputText: '#F9FAFB',
  placeholderText: '#6B7280',
  dangerBg: '#3B1515',
  dangerBorder: '#7F1D1D',
  dangerText: '#F87171',
  highlightBg: '#2D1F08',
  highlightBorder: '#78350F',
  highlightText: '#FBBF24',
  chartBg: '#161F30',
  chartBar: 'rgba(96, 165, 250, 1)',
  chartLabel: '#94A3B8',
  headerBg: '#111827',
  headerTint: '#F9FAFB',
  chipBg: '#1F2937',
  chipText: '#9CA3AF',
  chipActiveBg: '#1D4ED8',
  chipActiveText: '#DBEAFE',
  divider: '#1F2937',
  subtleBg: '#111827',
  refreshColor: '#60A5FA',
};

export function useAppTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? DarkTheme : LightTheme;
  return { colors, isDark, scheme };
}
