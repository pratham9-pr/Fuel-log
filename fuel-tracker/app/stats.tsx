import { format, parseISO } from 'date-fns';
import { useFocusEffect, Link } from 'expo-router';
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
import { BarChart } from 'react-native-chart-kit';
import { deleteEntry, getAllEntries, getYearlyStats } from '~/lib/fuelRepository';
import { useAppTheme } from '~/lib/theme';
import type { FuelEntry, YearlyStats } from '~/lib/types';

const CURRENT_YEAR = new Date().getFullYear();

export default function StatsScreen() {
  const { colors, isDark } = useAppTheme();
  const screenWidth = Dimensions.get('window').width;

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [stats, setStats] = useState<YearlyStats | null>(null);
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  // Format month for costliest month card
  const formattedCostliestMonth = useMemo(() => {
    if (!stats?.costliestMonth) return null;
    try {
      const date = parseISO(`${stats.costliestMonth.month}-01`);
      return {
        monthName: format(date, 'MMMM'),
        amount: stats.costliestMonth.amount,
      };
    } catch {
      return {
        monthName: stats.costliestMonth.month,
        amount: stats.costliestMonth.amount,
      };
    }
  }, [stats?.costliestMonth]);

  // Chart data fed from stats.monthlyBreakdown
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

    const data = stats.monthlyBreakdown.map((item) => Math.round(item.totalSpent));

    return {
      labels,
      datasets: [
        {
          data,
        },
      ],
    };
  }, [stats]);

  // Dynamic width for horizontal scrolling if many months exist
  const barChartWidth = useMemo(() => {
    const count = stats?.monthlyBreakdown.length ?? 0;
    const baseWidth = screenWidth - 48;
    return Math.max(baseWidth, count * 56);
  }, [stats?.monthlyBreakdown.length, screenWidth]);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.refreshColor}
          colors={[colors.refreshColor]}
        />
      }
    >
      {/* Year Selector with Left/Right Arrows */}
      <View
        style={[
          styles.yearSelectorCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <Pressable
          style={[styles.yearArrowButton, { backgroundColor: colors.subtleBg }]}
          onPress={handlePrevYear}
          hitSlop={12}
        >
          <Text style={[styles.yearArrowText, { color: colors.text }]}>◀</Text>
        </Pressable>

        <View style={styles.yearDisplay}>
          <Text style={[styles.yearLabelText, { color: colors.textMuted }]}>
            Viewing Year
          </Text>
          <Text style={[styles.yearNumberText, { color: colors.text }]}>
            {selectedYear}
          </Text>
          {selectedYear === CURRENT_YEAR && (
            <View
              style={[
                styles.currentYearBadge,
                { backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE' },
              ]}
            >
              <Text
                style={[
                  styles.currentYearBadgeText,
                  { color: isDark ? '#93C5FD' : '#1D4ED8' },
                ]}
              >
                Current
              </Text>
            </View>
          )}
        </View>

        <Pressable
          style={[
            styles.yearArrowButton,
            { backgroundColor: colors.subtleBg },
            selectedYear >= CURRENT_YEAR && styles.yearArrowDisabled,
          ]}
          onPress={handleNextYear}
          disabled={selectedYear >= CURRENT_YEAR}
          hitSlop={12}
        >
          <Text
            style={[
              styles.yearArrowText,
              { color: selectedYear >= CURRENT_YEAR ? colors.textMuted : colors.text },
            ]}
          >
            ▶
          </Text>
        </Pressable>
      </View>

      {/* 4 Overview Metric Cards */}
      <View style={styles.metricsGrid}>
        {/* Total Spent */}
        <View style={[styles.statCard, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <Text style={styles.statCardIcon}>💰</Text>
          <Text style={styles.statCardValueWhite}>
            ₹{(stats?.totalSpent ?? 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text style={styles.statCardLabelWhite}>Total Spent ({selectedYear})</Text>
        </View>

        {/* Number of Fill-ups */}
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={styles.statCardIcon}>⛽</Text>
          <Text style={[styles.statCardValue, { color: colors.text }]}>
            {stats?.entryCount ?? 0}
          </Text>
          <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>
            Fill-ups
          </Text>
        </View>

        {/* Average Cost per Fill-up */}
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={styles.statCardIcon}>🧾</Text>
          <Text style={[styles.statCardValue, { color: colors.text }]}>
            ₹{(stats?.avgCostPerFillup ?? 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>
            Avg / Fill-up
          </Text>
        </View>

        {/* Costliest Month Highlighted Card */}
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.highlightBg,
              borderColor: colors.highlightBorder,
            },
          ]}
        >
          <View
            style={[
              styles.highlightBadge,
              {
                backgroundColor: isDark ? '#451A03' : '#FEF3C7',
                borderColor: colors.highlightBorder,
              },
            ]}
          >
            <Text style={[styles.highlightBadgeText, { color: colors.highlightText }]}>
              Peak Month
            </Text>
          </View>
          <Text style={styles.statCardIcon}>🔥</Text>
          {formattedCostliestMonth ? (
            <>
              <Text
                style={[styles.costliestMonthName, { color: colors.highlightText }]}
                numberOfLines={1}
              >
                {formattedCostliestMonth.monthName}
              </Text>
              <Text style={[styles.costliestAmount, { color: colors.highlightText }]}>
                ₹
                {formattedCostliestMonth.amount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </>
          ) : (
            <Text style={[styles.noDataText, { color: colors.textMuted }]}>
              None yet
            </Text>
          )}
          <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>
            Costliest Month
          </Text>
        </View>
      </View>

      {/* Monthly Spend Bar Chart Section */}
      <View style={styles.chartSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            Monthly Spend ({selectedYear})
          </Text>
          {stats?.monthlyBreakdown && stats.monthlyBreakdown.length > 0 && (
            <Text style={[styles.chartSubtext, { color: colors.textMuted }]}>
              {stats.monthlyBreakdown.length}{' '}
              {stats.monthlyBreakdown.length === 1 ? 'month' : 'months'}
            </Text>
          )}
        </View>

        {chartData ? (
          <View
            style={[
              styles.chartWrapper,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={chartData}
                width={barChartWidth}
                height={220}
                yAxisLabel="₹"
                yAxisSuffix=""
                fromZero
                showValuesOnTopOfBars
                chartConfig={{
                  backgroundColor: colors.card,
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) =>
                    isDark
                      ? `rgba(96, 165, 250, ${opacity})`
                      : `rgba(37, 99, 235, ${opacity})`,
                  labelColor: (opacity = 1) =>
                    isDark
                      ? `rgba(148, 163, 184, ${opacity})`
                      : `rgba(100, 116, 139, ${opacity})`,
                  barPercentage: 0.55,
                  propsForLabels: {
                    fontSize: 10,
                    fontWeight: '600',
                  },
                }}
                style={styles.chartStyle}
              />
            </ScrollView>
          </View>
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No monthly data for {selectedYear}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Add fuel fill-ups dated in {selectedYear} to view the monthly expense chart.
            </Text>
          </View>
        )}
      </View>

      {/* All Entries Section */}
      <View style={styles.entriesSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            All Entries
          </Text>
          <Text
            style={[
              styles.entryCountBadge,
              { backgroundColor: colors.subtleBg, color: colors.textSecondary },
            ]}
          >
            {entries.length} {entries.length === 1 ? 'record' : 'records'}
          </Text>
        </View>

        {entries.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No entries yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Your fuel log history will appear here once you add your first receipt.
            </Text>
            <Link href="/add-entry" asChild>
              <Pressable
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.emptyButtonText}>+ Add First Entry</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {entries.map((entry) => {
              let displayDate = entry.date;
              try {
                displayDate = format(parseISO(entry.date), 'MMM d, yyyy');
              } catch {
                displayDate = entry.date;
              }

              return (
                <View
                  key={entry.id}
                  style={[
                    styles.entryItemCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  ]}
                >
                  {/* Left: Date & Vehicle */}
                  <View style={styles.entryLeft}>
                    <Text style={[styles.entryDate, { color: colors.text }]}>
                      {displayDate}
                    </Text>
                    {entry.vehicle ? (
                      <View
                        style={[
                          styles.vehicleTag,
                          { backgroundColor: colors.subtleBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.vehicleTagText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          🚗 {entry.vehicle}
                        </Text>
                      </View>
                    ) : null}
                    {entry.notes ? (
                      <Text
                        style={[styles.entryNotes, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        💬 {entry.notes}
                      </Text>
                    ) : null}
                  </View>

                  {/* Middle: Liters & Total Cost */}
                  <View style={styles.entryRightMetrics}>
                    <View style={styles.metricRow}>
                      <Text style={[styles.metricLitersLabel, { color: colors.textMuted }]}>
                        Volume:
                      </Text>
                      <Text style={[styles.metricLiters, { color: colors.text }]}>
                        {entry.liters.toFixed(2)} L
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={[styles.metricCostLabel, { color: colors.textMuted }]}>
                        Total:
                      </Text>
                      <Text style={[styles.metricCost, { color: colors.primary }]}>
                        ₹{entry.total_cost.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Right: Trash Delete Button */}
                  <Pressable
                    style={[styles.deleteIconButton, { backgroundColor: colors.dangerBg }]}
                    onPress={() => handleDelete(entry.id)}
                    hitSlop={10}
                  >
                    <Text style={styles.deleteIconText}>🗑️</Text>
                  </Pressable>
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
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 18,
  },
  /* Year Selector Card */
  yearSelectorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    elevation: 2,
  },
  yearArrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearArrowDisabled: {
    opacity: 0.35,
  },
  yearArrowText: {
    fontSize: 14,
    fontWeight: '700',
  },
  yearDisplay: {
    alignItems: 'center',
    gap: 2,
  },
  yearLabelText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  yearNumberText: {
    fontSize: 22,
    fontWeight: '800',
  },
  currentYearBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  currentYearBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  /* 4 Overview Metric Cards */
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    borderRadius: 14,
    padding: 14,
    width: '48%',
    borderWidth: 1,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  highlightBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statCardIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  statCardValueWhite: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  statCardLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  statCardLabelWhite: {
    fontSize: 11,
    color: '#BFDBFE',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  costliestMonthName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  costliestAmount: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chartSubtext: {
    fontSize: 12,
    fontWeight: '600',
  },
  /* Chart Section */
  chartSection: {
    marginTop: 2,
  },
  chartWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    elevation: 2,
    alignItems: 'center',
  },
  chartStyle: {
    borderRadius: 12,
  },
  /* Entries Section */
  entriesSection: {
    marginTop: 2,
  },
  entryCountBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  entriesList: {
    gap: 10,
  },
  entryItemCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 1,
  },
  entryLeft: {
    flex: 1.3,
    gap: 4,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: '700',
  },
  vehicleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vehicleTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  entryNotes: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  entryRightMetrics: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
    paddingRight: 8,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLitersLabel: {
    fontSize: 11,
  },
  metricLiters: {
    fontSize: 13,
    fontWeight: '600',
  },
  metricCostLabel: {
    fontSize: 11,
  },
  metricCost: {
    fontSize: 15,
    fontWeight: '800',
  },
  deleteIconButton: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  deleteIconText: {
    fontSize: 16,
  },
  /* Empty States */
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyIcon: {
    fontSize: 34,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  emptyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
