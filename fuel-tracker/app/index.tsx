import { format, parseISO } from 'date-fns';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  deleteEntry,
  getAllEntries,
  getEntryForDate,
  getMonthSpend,
} from '~/lib/fuelRepository';
import {
  colors,
  elevation,
  gradients,
  radius,
  spacing,
  t,
  tabular,
  typography,
} from '~/lib/theme';
import type { FuelEntry } from '~/lib/types';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasTodayEntry, setHasTodayEntry] = useState<boolean | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [recentEntries, setRecentEntries] = useState<FuelEntry[]>([]);
  const [totalEntriesCount, setTotalEntriesCount] = useState(0);
  const [monthSpend, setMonthSpend] = useState<{
    totalSpent: number;
    totalLiters: number;
    count: number;
  }>({ totalSpent: 0, totalLiters: 0, count: 0 });

  const todayDate = new Date();
  const todayISO = format(todayDate, 'yyyy-MM-dd');
  const currentMonthISO = format(todayDate, 'yyyy-MM');
  const currentMonthLabel = format(todayDate, 'MMMM yyyy');
  const formattedToday = format(todayDate, 'EEEE, MMMM d');

  const loadDashboardData = useCallback(async () => {
    try {
      const [todayEntry, allEntries, monthData] = await Promise.all([
        getEntryForDate(todayISO),
        getAllEntries(),
        getMonthSpend(currentMonthISO),
      ]);

      setHasTodayEntry(todayEntry !== null);
      setRecentEntries(allEntries.slice(0, 3));
      setTotalEntriesCount(allEntries.length);
      setMonthSpend(monthData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [todayISO, currentMonthISO]);

  // Refresh data every time Home screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void loadDashboardData();
    }, [loadDashboardData])
  );

  // Pull-to-refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    void loadDashboardData();
  };

  const handleDismissPrompt = () => {
    // Dismiss the prompt for this current session only (no DB write)
    setPromptDismissed(true);
  };

  const handleAcceptPrompt = () => {
    router.push('/add-entry');
  };

  const handleDeleteEntry = (id: number) => {
    Alert.alert('Delete Entry', 'Are you sure you want to remove this fuel entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry(id);
            void loadDashboardData();
          } catch (err) {
            Alert.alert('Error', 'Could not delete entry.');
          }
        },
      },
    ]);
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const shouldShowPrompt = !loading && hasTodayEntry === false && !promptDismissed;

  // Spend per litre for the current month (0 when nothing logged yet)
  const monthAvgPricePerLiter =
    monthSpend.totalLiters > 0 ? monthSpend.totalSpent / monthSpend.totalLiters : 0;

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.textSecondary}
          colors={[colors.textSecondary]}
        />
      }
    >
      {/* Obsidian Fuel app bar: brand tile + date label + quick nav */}
      <View style={styles.headerRow}>
        <View style={styles.brandRow}>
          <View style={styles.brandTile}>
            <Ionicons name="car-outline" size={20} color={colors.textPrimary} />
          </View>
          <View style={styles.brandText}>
            <Text style={styles.brandLabel} numberOfLines={1}>
              {formattedToday}
            </Text>
            <Text style={styles.brandTitle}>Fuel Tracker</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Link href="/stats" asChild>
            <Pressable style={styles.navPill}>
              <Text style={styles.navPillText}>Stats</Text>
            </Pressable>
          </Link>
          <Link href="/add-entry" asChild>
            <Pressable style={styles.navTile}>
              <Ionicons name="add" size={20} color={colors.onPrimary} />
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Daily check-in prompt */}
      {shouldShowPrompt && (
        <LinearGradient
          colors={gradients.prompt}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.promptCard}
        >
          <View style={styles.promptHeaderRow}>
            <View style={styles.promptHeaderLeft}>
              <View style={styles.promptDot} />
              <Text style={styles.promptLabel}>Daily Telemetry Prompt</Text>
            </View>
            <Text style={styles.promptDate} numberOfLines={1}>
              {formattedToday}
            </Text>
          </View>

          <Text style={styles.promptTitle}>Did you top up fuel today?</Text>
          <Text style={styles.promptDescription}>
            Keep your fuel expenses up to date by recording today&apos;s fill-up.
          </Text>

          <View style={styles.promptButtons}>
            <Pressable style={styles.ghostButton} onPress={handleDismissPrompt}>
              <Text style={styles.ghostButtonText}>No, didn&apos;t fill</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleAcceptPrompt}>
              <Ionicons name="add-circle-outline" size={18} color={colors.onPrimary} />
              <Text style={styles.primaryButtonText}>Log Fill-up</Text>
            </Pressable>
          </View>
        </LinearGradient>
      )}

      {/* Loading state */}
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
          <Text style={styles.loaderText}>Loading fuel log…</Text>
        </View>
      ) : (
        <>
          {/* Current period summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeaderRow}>
              <View style={styles.summaryHeaderText}>
                <Text style={styles.summaryPeriodLabel}>Current Period</Text>
                <Text style={styles.summaryMonthTitle}>{currentMonthLabel}</Text>
              </View>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryChipText}>
                  {monthSpend.count} {monthSpend.count === 1 ? 'fill-up' : 'fill-ups'}
                </Text>
              </View>
            </View>

            <View style={styles.summaryValueRow}>
              <Text style={styles.summaryAmount}>
                ₹
                {monthSpend.totalSpent.toLocaleString('en-IN', {
                  maximumFractionDigits: 0,
                })}
              </Text>
              <Text style={styles.summaryValueLabel}>Total Spend</Text>
            </View>

            <View style={styles.bentoRow}>
              <View style={styles.bentoTile}>
                <View style={styles.bentoLabelRow}>
                  <Ionicons name="water-outline" size={16} color={colors.textTertiary} />
                  <Text style={styles.bentoLabel} numberOfLines={1}>
                    Volume
                  </Text>
                </View>
                <View style={styles.bentoValueRow}>
                  <Text style={styles.bentoValue}>{monthSpend.totalLiters.toFixed(1)}</Text>
                  <Text style={styles.bentoUnit}>L</Text>
                </View>
              </View>

              <View style={styles.bentoTile}>
                <View style={styles.bentoLabelRow}>
                  <Ionicons name="car-outline" size={16} color={colors.textTertiary} />
                  <Text style={styles.bentoLabel} numberOfLines={1}>
                    Fills
                  </Text>
                </View>
                <View style={styles.bentoValueRow}>
                  <Text style={styles.bentoValue}>{monthSpend.count}</Text>
                  <Text style={styles.bentoUnit}>
                    {monthSpend.count === 1 ? 'time' : 'times'}
                  </Text>
                </View>
              </View>

              <View style={styles.bentoTile}>
                <View style={styles.bentoLabelRow}>
                  <Ionicons name="receipt-outline" size={16} color={colors.textTertiary} />
                  <Text style={styles.bentoLabel} numberOfLines={1}>
                    Avg Cost
                  </Text>
                </View>
                <View style={styles.bentoValueRow}>
                  <Text style={styles.bentoValue}>{monthAvgPricePerLiter.toFixed(2)}</Text>
                  <Text style={styles.bentoUnit}>/L</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3 Most Recent Entries */}
          <View>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Recent Fill-Ups</Text>
                {totalEntriesCount > 0 && (
                  <View style={styles.sectionCountPill}>
                    <Text style={styles.sectionCountText}>
                      {recentEntries.length} of {totalEntriesCount}
                    </Text>
                  </View>
                )}
              </View>
              <Link href="/stats" asChild>
                <Pressable style={styles.viewAll}>
                  <Text style={styles.viewAllText}>View all</Text>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </Link>
            </View>

            {recentEntries.length === 0 ? (
              <View style={styles.emptyCard}>
                <Feather name="clipboard" size={24} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>No entries recorded yet</Text>
                <Text style={styles.emptyMessage}>
                  Tap the + button above or respond to the top-up prompt to record your first
                  fuel receipt.
                </Text>
                <Link href="/add-entry" asChild>
                  <Pressable style={styles.emptyButton}>
                    <Text style={styles.emptyButtonText}>Add First Entry</Text>
                  </Pressable>
                </Link>
              </View>
            ) : (
              <View style={styles.entriesList}>
                {recentEntries.map((item) => (
                  <View key={item.id} style={styles.entryCard}>
                    <View style={styles.entryTile}>
                      <Ionicons name="car-outline" size={20} color={colors.textSecondary} />
                    </View>

                    <View style={styles.entryBody}>
                      <View style={styles.entryTitleRow}>
                        <Text style={styles.entryDate}>{formatDateLabel(item.date)}</Text>
                        {item.date === todayISO && (
                          <View style={styles.entryTag}>
                            <Text style={styles.entryTagText}>Today</Text>
                          </View>
                        )}
                        {item.vehicle ? (
                          <View style={styles.entryVehicleChip}>
                            <Text style={styles.entryVehicleText} numberOfLines={1}>
                              {item.vehicle}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.entryMetaRow}>
                        <Ionicons name="water-outline" size={16} color={colors.textTertiary} />
                        <Text style={styles.entryMetaText} numberOfLines={1}>
                          {item.liters.toFixed(2)} L · ₹{item.price_per_liter.toFixed(2)} / L
                        </Text>
                      </View>
                    </View>

                    <View style={styles.entryRight}>
                      <Text style={styles.entryTotal}>₹{item.total_cost.toFixed(2)}</Text>
                      {item.notes ? (
                        <Text style={styles.entryNotes} numberOfLines={1}>
                          {item.notes}
                        </Text>
                      ) : null}
                      <Pressable
                        style={styles.entryDelete}
                        onPress={() => handleDeleteEntry(item.id)}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.metricDanger} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      )}

      {/* Local storage status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeaderRow}>
          <View style={styles.statusTitleRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusTitle}>Local SQLite Active</Text>
          </View>
          <Text style={styles.statusVersion}>v{appVersion} · Offline</Text>
        </View>
        <Text style={styles.statusBody}>
          All entries are stored on-device in your local SQLite database. No cloud sync
          required.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceCanvas,
  },
  content: {
    paddingHorizontal: spacing.margin,
    paddingBottom: 40,
    gap: spacing.lg,
  },

  // ─── App bar ────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  brandTile: {
    width: 36,
    height: 36,
    borderRadius: radius.default,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    flexShrink: 1,
  },
  brandLabel: {
    ...t(typography.labelSm),
    color: colors.textTertiary,
  },
  brandTitle: {
    ...t(typography.headlineSm),
    color: colors.textPrimary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.default,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navPillText: {
    ...t(typography.labelSm),
    color: colors.textSecondary,
  },
  navTile: {
    width: 36,
    height: 36,
    borderRadius: radius.default,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Daily check-in prompt ──────────────────────────────────────────────
  promptCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
  },
  promptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  promptHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  promptDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.metricPeak,
  },
  promptLabel: {
    ...t(typography.labelSm),
    color: colors.textTertiary,
  },
  promptDate: {
    ...t(typography.labelMd),
    color: colors.textSecondary,
    flexShrink: 1,
    textAlign: 'right',
  },
  promptTitle: {
    ...t(typography.headlineSm),
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  promptDescription: {
    ...t(typography.bodyMd),
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  promptButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  ghostButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.default,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  ghostButtonText: {
    ...t(typography.labelMd),
    color: colors.textSecondary,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.default,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButtonText: {
    ...t({ ...typography.labelMd, fontWeight: '600' }),
    color: colors.onPrimary,
  },

  // ─── Current period summary ─────────────────────────────────────────────
  summaryCard: {
    ...elevation.level1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  summaryHeaderText: {
    flexShrink: 1,
  },
  summaryPeriodLabel: {
    ...t(typography.labelSm),
    color: colors.textTertiary,
  },
  summaryMonthTitle: {
    ...t(typography.headlineSm),
    color: colors.textPrimary,
    marginTop: 2,
  },
  summaryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.default,
    backgroundColor: colors.surfaceElevated,
  },
  summaryChipText: {
    ...t(typography.labelMd),
    color: colors.textSecondary,
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  summaryAmount: {
    ...t(typography.metricXl),
    ...tabular,
    color: colors.textPrimary,
  },
  summaryValueLabel: {
    ...t(typography.labelSm),
    color: colors.textTertiary,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bentoTile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.default,
    padding: 10,
    gap: spacing.sm,
  },
  bentoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bentoLabel: {
    ...t(typography.labelSm),
    color: colors.textTertiary,
    flexShrink: 1,
  },
  bentoValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  bentoValue: {
    ...t(typography.metricMd),
    ...tabular,
    color: colors.textPrimary,
  },
  bentoUnit: {
    ...t(typography.labelMd),
    color: colors.textTertiary,
  },

  // ─── Recent fill-ups ────────────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  sectionTitle: {
    ...t(typography.headlineSm),
    color: colors.textPrimary,
  },
  sectionCountPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceInteractive,
  },
  sectionCountText: {
    ...t(typography.labelSm),
    color: colors.textSecondary,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
  },
  viewAllText: {
    ...t(typography.labelMd),
    color: colors.textSecondary,
  },
  entriesList: {
    gap: spacing.gutter,
  },
  entryCard: {
    ...elevation.level1,
    flexDirection: 'row',
    gap: 12, // icon-tile gutter from the mockup
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  entryTile: {
    width: 40,
    height: 40,
    borderRadius: radius.default,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  entryDate: {
    ...t(typography.titleMd),
    color: colors.textPrimary,
  },
  entryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceInteractive,
  },
  entryTagText: {
    ...t(typography.labelSm),
    color: colors.textSecondary,
  },
  entryVehicleChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    maxWidth: 110,
  },
  entryVehicleText: {
    ...t(typography.labelSm),
    color: colors.textSecondary,
  },
  entryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  entryMetaText: {
    ...t(typography.labelMd),
    ...tabular,
    color: colors.textTertiary,
    flexShrink: 1,
  },
  entryRight: {
    alignItems: 'flex-end',
    gap: 2,
    maxWidth: 130,
  },
  entryTotal: {
    ...t(typography.headlineSm),
    ...tabular,
    color: colors.textPrimary,
  },
  entryNotes: {
    ...t(typography.labelMd),
    color: colors.textTertiary,
    maxWidth: 120,
  },
  entryDelete: {
    marginTop: spacing.xs,
    padding: 6,
    borderRadius: radius.default,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },

  // ─── Empty state ────────────────────────────────────────────────────────
  emptyCard: {
    ...elevation.level1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    ...t(typography.headlineSm),
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  emptyMessage: {
    ...t(typography.bodyMd),
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyButton: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.default,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    ...t({ ...typography.bodyMd, fontWeight: '600' }),
    color: colors.onPrimary,
  },

  // ─── Storage status ─────────────────────────────────────────────────────
  statusCard: {
    ...elevation.level1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.metricPositive,
  },
  statusTitle: {
    ...t(typography.labelMd),
    color: colors.textSecondary,
  },
  statusVersion: {
    ...t(typography.labelSm),
    ...tabular,
    color: colors.textTertiary,
  },
  statusBody: {
    ...t(typography.labelMd),
    color: colors.textTertiary,
    lineHeight: 16,
  },

  // ─── Loader ─────────────────────────────────────────────────────────────
  loaderContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: spacing.md,
  },
  loaderText: {
    ...t(typography.bodyMd),
    color: colors.textTertiary,
  },
});
