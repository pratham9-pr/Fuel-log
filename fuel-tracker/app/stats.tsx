import { format, parseISO } from 'date-fns';
import { useFocusEffect, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { deleteEntry, getAllEntries, getYearlyStats } from '~/lib/fuelRepository';
import { colors, elevation, gradients, radius, spacing, t, tabular, typography } from '~/lib/theme';
import type { FuelEntry, YearlyStats } from '~/lib/types';

const CURRENT_YEAR = new Date().getFullYear();

export default function StatsScreen() {
  const screenWidth = Dimensions.get('window').width;

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [stats, setStats] = useState<YearlyStats | null>(null);
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartMode, setChartMode] = useState<'spend' | 'volume'>('spend');

  const loadData = useCallback(async () => {
    try {
      const [yearlyStats, allEntries] = await Promise.all([
        getYearlyStats(selectedYear),
        getAllEntries(),
      ]);
      setStats(yearlyStats);
      setEntries(allEntries);
    } catch (err) {
      console.error('Failed to load stats data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  // Pull-to-refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const handlePrevYear = () => {
    setSelectedYear((prev) => prev - 1);
  };

  const handleNextYear = () => {
    if (selectedYear < CURRENT_YEAR + 1) {
      setSelectedYear((prev) => prev + 1);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this fuel record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry(id);
            void loadData();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete entry.');
          }
        },
      },
    ]);
  };

  const entryCount = stats?.entryCount ?? 0;

  // Format month for the peak-expense callout
  const costliestMonth = stats?.costliestMonth;
  const formattedCostliestMonth = useMemo(() => {
    if (!costliestMonth) return null;
    try {
      const date = parseISO(`${costliestMonth.month}-01`);
      return {
        monthName: format(date, 'MMMM'),
        amount: costliestMonth.amount,
      };
    } catch {
      return {
        monthName: costliestMonth.month,
        amount: costliestMonth.amount,
      };
    }
  }, [costliestMonth]);

  // Peak month details derived from already-loaded data (no extra DB calls)
  const peakMonthData = useMemo(() => {
    if (!stats?.costliestMonth) return null;
    const { month: peakMonth, amount } = stats.costliestMonth;
    const monthEntries = entries.filter((e) => e.date.startsWith(`${peakMonth}-`));
    const liters = monthEntries.reduce((sum, e) => sum + e.liters, 0);
    const pct = stats.totalSpent > 0 ? (amount / stats.totalSpent) * 100 : 0;
    return { count: monthEntries.length, liters, pct };
  }, [entries, stats]);

  // Year-wide totals derived from the existing monthly breakdown
  const totalYearLiters = useMemo(
    () => (stats?.monthlyBreakdown ?? []).reduce((sum, m) => sum + m.totalLiters, 0),
    [stats?.monthlyBreakdown]
  );

  const monthsLogged = stats?.monthlyBreakdown.length ?? 0;
  const avgLogsPerMonth = monthsLogged > 0 ? entryCount / monthsLogged : 0;
  const avgLitersPerFill = entryCount > 0 ? totalYearLiters / entryCount : 0;
  const avgPricePerLiter = totalYearLiters > 0 ? (stats?.totalSpent ?? 0) / totalYearLiters : 0;

  // Chart data fed from stats.monthlyBreakdown (spend or volume)
  const chartData = useMemo(() => {
    if (!stats || stats.monthlyBreakdown.length === 0) {
      return null;
    }

    const labels = stats.monthlyBreakdown.map((item) => {
      try {
        return format(parseISO(`${item.month}-01`), 'MMM');
      } catch {
        return item.month.slice(5);
      }
    });

    const data = stats.monthlyBreakdown.map((item) =>
      chartMode === 'spend'
        ? Math.round(item.totalSpent)
        : Math.round(item.totalLiters * 10) / 10
    );

    return {
      labels,
      datasets: [
        {
          data,
        },
      ],
    };
  }, [stats, chartMode]);

  // Dynamic width for horizontal scrolling if many months exist
  const barChartWidth = useMemo(() => {
    const count = stats?.monthlyBreakdown.length ?? 0;
    const baseWidth = screenWidth - 40 - 32; // screen inset + card padding
    return Math.max(baseWidth, count * 56);
  }, [stats?.monthlyBreakdown.length, screenWidth]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
        <Text style={styles.loaderText}>Loading statistics…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.textSecondary}
          colors={[colors.textSecondary]}
        />
      }
    >
      {/* Year selector + sync status */}
      <View style={styles.toolbarRow}>
        <View style={styles.yearSelector}>
          <Pressable style={styles.yearArrow} onPress={handlePrevYear} hitSlop={12}>
            <Ionicons name="chevron-back-outline" size={18} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.yearCenter}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.yearNumber}>{selectedYear}</Text>
            {selectedYear === CURRENT_YEAR && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
          </View>

          <Pressable
            style={[styles.yearArrow, selectedYear >= CURRENT_YEAR && styles.yearArrowDisabled]}
            onPress={handleNextYear}
            disabled={selectedYear >= CURRENT_YEAR}
            hitSlop={12}
          >
            <Ionicons
              name="chevron-forward-outline"
              size={18}
              color={selectedYear >= CURRENT_YEAR ? colors.textTertiary : colors.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.syncChip}>
          <View style={styles.syncDot} />
          <Text style={styles.syncText}>Local SQLite Sync</Text>
        </View>
      </View>

      {/* KPI grid */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiTile}>
          <View style={styles.kpiLabelRow}>
            <Text style={styles.kpiLabel} numberOfLines={1}>
              Total Spent
            </Text>
            <Ionicons name="wallet-outline" size={20} color={colors.textSecondary} />
          </View>
          <View style={styles.kpiValueBlock}>
            <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              ₹
              {(stats?.totalSpent ?? 0).toLocaleString('en-IN', {
                maximumFractionDigits: 0,
              })}
            </Text>
            <Text style={styles.kpiSub}>{entryCount} entries recorded</Text>
          </View>
        </View>

        <View style={styles.kpiTile}>
          <View style={styles.kpiLabelRow}>
            <Text style={styles.kpiLabel} numberOfLines={1}>
              Fill-ups
            </Text>
            <Ionicons name="car-outline" size={20} color={colors.textSecondary} />
          </View>
          <View style={styles.kpiValueBlock}>
            <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {entryCount}
            </Text>
            <Text style={styles.kpiSub}>~{avgLogsPerMonth.toFixed(1)} logs / month</Text>
          </View>
        </View>

        <View style={styles.kpiTile}>
          <View style={styles.kpiLabelRow}>
            <Text style={styles.kpiLabel} numberOfLines={1}>
              Avg / Fill-up
            </Text>
            <Ionicons name="receipt-outline" size={20} color={colors.textSecondary} />
          </View>
          <View style={styles.kpiValueBlock}>
            <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              ₹
              {(stats?.avgCostPerFillup ?? 0).toLocaleString('en-IN', {
                maximumFractionDigits: 0,
              })}
            </Text>
            <Text style={styles.kpiSub}>~{avgLitersPerFill.toFixed(1)} L / tank</Text>
          </View>
        </View>

        <View style={styles.kpiTile}>
          <View style={styles.kpiLabelRow}>
            <Text style={styles.kpiLabel} numberOfLines={1}>
              Avg Price/L
            </Text>
            <Ionicons name="speedometer-outline" size={20} color={colors.textSecondary} />
          </View>
          <View style={styles.kpiValueBlock}>
            <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              ₹{avgPricePerLiter.toFixed(2)}
            </Text>
            <Text style={styles.kpiSub}>{totalYearLiters.toFixed(1)} L measured</Text>
          </View>
        </View>
      </View>

      {/* Peak expense month callout */}
      {formattedCostliestMonth && peakMonthData && (
        <LinearGradient
          colors={gradients.peakCallout}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.peakCard}
        >
          <View style={styles.peakBar} />
          <View style={styles.peakContent}>
            <View style={styles.peakLabelRow}>
              <Ionicons name="warning-outline" size={16} color={colors.metricPeak} />
              <Text style={styles.peakLabel}>Peak Expense Month</Text>
            </View>
            <Text style={styles.peakTitle}>
              {formattedCostliestMonth.monthName} — ₹
              {formattedCostliestMonth.amount.toLocaleString('en-IN', {
                maximumFractionDigits: 0,
              })}
            </Text>
            <Text style={styles.peakBody}>
              {peakMonthData.count} {peakMonthData.count === 1 ? 'fill-up' : 'fill-ups'}{' '}
              recorded · {peakMonthData.liters.toFixed(1)} L pumped
            </Text>
          </View>
          <View style={styles.peakBadge}>
            <Text style={styles.peakBadgeValue}>{peakMonthData.pct.toFixed(1)}%</Text>
            <Text style={styles.peakBadgeLabel}>of total</Text>
          </View>
        </LinearGradient>
      )}

      {/* Cadence & Trends chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeaderRow}>
          <View style={styles.chartHeaderText}>
            <Text style={styles.chartTitle}>Cadence &amp; Trends</Text>
            <Text style={styles.chartSubtitle}>Monthly totals across {selectedYear}</Text>
          </View>
          <View style={styles.segmented}>
            <Pressable
              style={[styles.segment, chartMode === 'spend' && styles.segmentActive]}
              onPress={() => setChartMode('spend')}
            >
              <Text
                style={[styles.segmentText, chartMode === 'spend' && styles.segmentTextActive]}
              >
                Spend (₹)
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segment, chartMode === 'volume' && styles.segmentActive]}
              onPress={() => setChartMode('volume')}
            >
              <Text
                style={[styles.segmentText, chartMode === 'volume' && styles.segmentTextActive]}
              >
                Volume (L)
              </Text>
            </Pressable>
          </View>
        </View>

        {chartData ? (
          <>
            <View style={styles.inspectorRow}>
              <View style={styles.inspectorLeft}>
                <View style={styles.inspectorDot} />
                <Text style={styles.inspectorLabel}>{selectedYear} overview</Text>
              </View>
              <View style={styles.inspectorRight}>
                <Text style={styles.inspectorMeta}>
                  Logged: {entryCount} {entryCount === 1 ? 'fill-up' : 'fill-ups'}
                </Text>
                <Text style={styles.inspectorValue}>
                  {chartMode === 'spend'
                    ? `₹${(stats?.totalSpent ?? 0).toLocaleString('en-IN', {
                        maximumFractionDigits: 0,
                      })}`
                    : `${totalYearLiters.toFixed(1)} L`}
                </Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={chartData}
                width={barChartWidth}
                height={220}
                yAxisLabel={chartMode === 'spend' ? '₹' : ''}
                yAxisSuffix=""
                fromZero
                showValuesOnTopOfBars
                chartConfig={{
                  backgroundColor: colors.surfaceCard,
                  backgroundGradientFrom: colors.surfaceCard,
                  backgroundGradientTo: colors.surfaceCard,
                  decimalPlaces: chartMode === 'spend' ? 0 : 1,
                  color: () => 'rgba(155, 163, 175, 0.9)',
                  labelColor: () => 'rgba(96, 104, 119, 1)',
                  barPercentage: 0.55,
                  propsForLabels: {
                    fontSize: 10,
                    fontWeight: '500',
                  },
                }}
                style={styles.chartStyle}
              />
            </ScrollView>
          </>
        ) : (
          <View style={styles.chartEmpty}>
            <Ionicons name="bar-chart-outline" size={24} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No monthly data for {selectedYear}</Text>
            <Text style={styles.emptySubtitle}>
              Add fuel fill-ups dated in {selectedYear} to view the monthly expense chart.
            </Text>
          </View>
        )}
      </View>

      {/* All Entries */}
      <View>
        <View style={styles.entriesHeader}>
          <Text style={styles.sectionTitle}>Recorded Fill-Ups</Text>
          <Text style={styles.entriesSubtitle}>
            {entries.length} {entries.length === 1 ? 'record' : 'records'} in SQLite storage
          </Text>
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="clipboard" size={24} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptySubtitle}>
              Your fuel log history will appear here once you add your first receipt.
            </Text>
            <Link href="/add-entry" asChild>
              <Pressable style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>+ Add First Entry</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {entries.map((entry) => {
              const isPeakEntry =
                stats?.costliestMonth != null &&
                entry.date.startsWith(`${stats.costliestMonth.month}-`);
              const isToday = entry.date === format(new Date(), 'yyyy-MM-dd');

              let dayLabel = entry.date;
              let monthLabel = '';
              let yearLabel = '';
              try {
                const parsed = parseISO(entry.date);
                dayLabel = format(parsed, 'dd');
                monthLabel = format(parsed, 'MMM');
                yearLabel = format(parsed, 'yyyy');
              } catch {
                dayLabel = entry.date;
              }

              return (
                <View key={entry.id} style={styles.entryRow}>
                  {/* Date tile */}
                  <View style={styles.dateTile}>
                    <Text style={styles.dateTileMonth}>{monthLabel}</Text>
                    <Text style={styles.dateTileDay}>{dayLabel}</Text>
                  </View>

                  {/* Volume + vehicle, rate + notes */}
                  <View style={styles.entryMiddle}>
                    <View style={styles.entryTitleRow}>
                      <Text style={styles.entryLiters}>{entry.liters.toFixed(2)} L</Text>
                      {entry.vehicle ? (
                        <View
                          style={[styles.vehicleChip, isPeakEntry && styles.vehicleChipPeak]}
                        >
                          <Text
                            style={[
                              styles.vehicleChipText,
                              isPeakEntry && styles.vehicleChipTextPeak,
                            ]}
                            numberOfLines={1}
                          >
                            {entry.vehicle}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.entryMetaText} numberOfLines={1}>
                      {yearLabel} · ₹{entry.price_per_liter.toFixed(2)} / L
                      {entry.notes ? ` · ${entry.notes}` : ''}
                    </Text>
                  </View>

                  {/* Cost, tag, delete */}
                  <View style={styles.entryRight}>
                    <Text style={styles.entryCost}>₹{entry.total_cost.toFixed(2)}</Text>
                    {isPeakEntry ? (
                      <View style={styles.peakTag}>
                        <Text style={styles.peakTagText}>Peak Record</Text>
                      </View>
                    ) : isToday ? (
                      <View style={styles.todayTag}>
                        <Text style={styles.todayTagText}>Today</Text>
                      </View>
                    ) : null}
                    <Pressable
                      style={styles.entryTrash}
                      onPress={() => handleDelete(entry.id)}
                      hitSlop={10}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.metricDanger} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
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
    paddingTop: spacing.md,
    paddingBottom: 48,
    gap: spacing.lg,
  },

  // ─── Toolbar ────────────────────────────────────────────────────────────
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  yearSelector: {
    ...elevation.level1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.md,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  yearArrow: {
    width: 30,
    height: 30,
    borderRadius: radius.default,
    backgroundColor: colors.surfaceInteractive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearArrowDisabled: {
    opacity: 0.4,
  },
  yearCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  yearNumber: {
    ...t(typography.headlineSm),
    ...tabular,
    color: colors.textPrimary,
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceInteractive,
  },
  currentBadgeText: {
    ...t(typography.labelSm),
    color: colors.textSecondary,
  },
  syncChip: {
    ...elevation.level1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.default,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.metricPositive,
  },
  syncText: {
    ...t(typography.labelSm),
    color: colors.textSecondary,
  },

  // ─── KPI grid ───────────────────────────────────────────────────────────
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gutter,
  },
  kpiTile: {
    ...elevation.level1,
    width: '47%',
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  kpiLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  kpiLabel: {
    ...t(typography.labelSm),
    color: colors.textTertiary,
    flexShrink: 1,
  },
  kpiValueBlock: {
    gap: spacing.xs,
  },
  kpiValue: {
    ...t(typography.metricXl),
    ...tabular,
    color: colors.textPrimary,
  },
  kpiSub: {
    ...t(typography.labelMd),
    color: colors.textTertiary,
  },

  // ─── Peak expense callout ───────────────────────────────────────────────
  peakCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    overflow: 'hidden',
  },
  peakBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: colors.metricPeak,
  },
  peakContent: {
    flex: 1,
    gap: spacing.xs,
  },
  peakLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  peakLabel: {
    ...t(typography.labelSm),
    color: colors.metricPeak,
  },
  peakTitle: {
    ...t(typography.headlineSm),
    color: colors.textPrimary,
  },
  peakBody: {
    ...t(typography.bodyMd),
    color: colors.textSecondary,
  },
  peakBadge: {
    backgroundColor: colors.metricPeakTint,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignItems: 'flex-end',
  },
  peakBadgeValue: {
    ...t(typography.labelMd),
    ...tabular,
    color: colors.metricPeak,
  },
  peakBadgeLabel: {
    ...t(typography.labelSm),
    color: colors.textTertiary,
  },

  // ─── Chart card ─────────────────────────────────────────────────────────
  chartCard: {
    ...elevation.level1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  chartHeaderText: {
    flexShrink: 1,
    gap: 2,
  },
  chartTitle: {
    ...t(typography.titleMd),
    color: colors.textPrimary,
  },
  chartSubtitle: {
    ...t(typography.labelMd),
    color: colors.textTertiary,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceBase,
    borderRadius: radius.default,
    padding: 4,
    gap: 4,
  },
  segment: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.surfaceInteractive,
  },
  segmentText: {
    ...t(typography.labelMd),
    color: colors.textTertiary,
  },
  segmentTextActive: {
    color: colors.textPrimary,
  },
  inspectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceBase,
    borderRadius: radius.default,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexWrap: 'wrap',
  },
  inspectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  inspectorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
  },
  inspectorLabel: {
    ...t(typography.labelMd),
    color: colors.textPrimary,
  },
  inspectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inspectorMeta: {
    ...t(typography.labelSm),
    color: colors.textTertiary,
  },
  inspectorValue: {
    ...t(typography.titleMd),
    ...tabular,
    color: colors.textPrimary,
  },
  chartStyle: {
    borderRadius: radius.default,
  },
  chartEmpty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },

  // ─── Entries ────────────────────────────────────────────────────────────
  entriesHeader: {
    gap: 2,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...t(typography.headlineSm),
    color: colors.textPrimary,
  },
  entriesSubtitle: {
    ...t(typography.labelMd),
    color: colors.textTertiary,
  },
  entriesList: {
    gap: spacing.gutter,
  },
  entryRow: {
    ...elevation.level1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  dateTile: {
    width: 44,
    height: 44,
    borderRadius: radius.default,
    backgroundColor: colors.surfaceBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTileMonth: {
    ...t(typography.labelSm),
    color: colors.textTertiary,
  },
  dateTileDay: {
    ...t(typography.titleMd),
    ...tabular,
    color: colors.textPrimary,
  },
  entryMiddle: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  entryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  entryLiters: {
    ...t(typography.metricMd),
    ...tabular,
    color: colors.textPrimary,
  },
  vehicleChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceBase,
    maxWidth: 120,
  },
  vehicleChipPeak: {
    backgroundColor: colors.metricPeakTint,
  },
  vehicleChipText: {
    ...t(typography.labelSm),
    color: colors.textSecondary,
  },
  vehicleChipTextPeak: {
    color: colors.metricPeak,
  },
  entryMetaText: {
    ...t(typography.labelMd),
    ...tabular,
    color: colors.textTertiary,
  },
  entryRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  entryCost: {
    ...t(typography.titleMd),
    ...tabular,
    color: colors.textPrimary,
  },
  peakTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.metricPeakTint,
    marginTop: 2,
  },
  peakTagText: {
    ...t(typography.labelSm),
    color: colors.metricPeak,
  },
  todayTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceInteractive,
    marginTop: 2,
  },
  todayTagText: {
    ...t(typography.labelSm),
    color: colors.textSecondary,
  },
  entryTrash: {
    marginTop: spacing.xs,
    padding: 6,
    borderRadius: radius.default,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Empty states / loader ──────────────────────────────────────────────
  loaderScreen: {
    flex: 1,
    backgroundColor: colors.surfaceCanvas,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loaderText: {
    ...t(typography.bodyMd),
    color: colors.textTertiary,
  },
  emptyCard: {
    ...elevation.level1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    ...t({ ...typography.titleMd, fontWeight: '600' }),
    color: colors.textPrimary,
  },
  emptySubtitle: {
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
});
