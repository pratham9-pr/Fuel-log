import { format, parseISO } from 'date-fns';
import { useFocusEffect } from 'expo-router';
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
import type { FuelEntry, YearlyStats } from '~/lib/types';

const CURRENT_YEAR = new Date().getFullYear();

export default function StatsScreen() {
  const [stats, setStats] = useState<YearlyStats | null>(null);
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  const loadData = useCallback(async () => {
    try {
      const [yearlyStats, allEntries] = await Promise.all([
        getYearlyStats(CURRENT_YEAR),
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void loadData();
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
            // Refresh stats and entry list
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
        monthName: format(date, 'MMMM yyyy'),
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
    const baseWidth = screenWidth - 32;
    return Math.max(baseWidth, count * 60);
  }, [stats?.monthlyBreakdown.length, screenWidth]);

  if (loading && !refreshing && !stats) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading {CURRENT_YEAR} stats…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Screen Title */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenSubtitle}>Analytics & History</Text>
        <Text style={styles.screenTitle}>{CURRENT_YEAR} Fuel Statistics</Text>
      </View>

      {/* 4 Overview Metric Cards */}
      <View style={styles.metricsGrid}>
        {/* Total Spent */}
        <View style={[styles.statCard, styles.statCardPrimary]}>
          <Text style={styles.statCardIcon}>💰</Text>
          <Text style={styles.statCardValueWhite}>
            ₹{(stats?.totalSpent ?? 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text style={styles.statCardLabelWhite}>Total Spent ({CURRENT_YEAR})</Text>
        </View>

        {/* Number of Fill-ups */}
        <View style={styles.statCard}>
          <Text style={styles.statCardIcon}>⛽</Text>
          <Text style={styles.statCardValue}>{stats?.entryCount ?? 0}</Text>
          <Text style={styles.statCardLabel}>Total Fill-ups</Text>
        </View>

        {/* Average Cost per Fill-up */}
        <View style={styles.statCard}>
          <Text style={styles.statCardIcon}>🧾</Text>
          <Text style={styles.statCardValue}>
            ₹{(stats?.avgCostPerFillup ?? 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text style={styles.statCardLabel}>Avg / Fill-up</Text>
        </View>

        {/* Costliest Month Highlighted Card */}
        <View style={[styles.statCard, styles.statCardHighlight]}>
          <View style={styles.highlightBadge}>
            <Text style={styles.highlightBadgeText}>Peak Month</Text>
          </View>
          <Text style={styles.statCardIcon}>🔥</Text>
          {formattedCostliestMonth ? (
            <>
              <Text style={styles.costliestMonthName} numberOfLines={1}>
                {formattedCostliestMonth.monthName}
              </Text>
              <Text style={styles.costliestAmount}>
                ₹{formattedCostliestMonth.amount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </>
          ) : (
            <Text style={styles.noDataText}>No data yet</Text>
          )}
          <Text style={styles.statCardLabel}>Costliest Month</Text>
        </View>
      </View>

      {/* Monthly Spend Bar Chart Section */}
      <View style={styles.chartSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Monthly Spend (₹)</Text>
          {stats?.monthlyBreakdown && stats.monthlyBreakdown.length > 0 && (
            <Text style={styles.chartSubtext}>
              {stats.monthlyBreakdown.length} {stats.monthlyBreakdown.length === 1 ? 'month' : 'months'}
            </Text>
          )}
        </View>

        {chartData ? (
          <View style={styles.chartWrapper}>
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
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
                  barPercentage: 0.55,
                  propsForLabels: {
                    fontSize: 11,
                    fontWeight: '600',
                  },
                }}
                style={styles.chartStyle}
              />
            </ScrollView>
          </View>
        ) : (
          <View style={styles.emptyChartCard}>
            <Text style={styles.emptyChartIcon}>📊</Text>
            <Text style={styles.emptyChartTitle}>No monthly data available</Text>
            <Text style={styles.emptyChartSubtitle}>
              Log fuel entries in {CURRENT_YEAR} to generate your monthly spend breakdown chart.
            </Text>
          </View>
        )}
      </View>

      {/* All Entries Section */}
      <View style={styles.entriesSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>All Fuel Entries</Text>
          <Text style={styles.entryCountBadge}>
            {entries.length} {entries.length === 1 ? 'record' : 'records'}
          </Text>
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyEntriesCard}>
            <Text style={styles.emptyEntriesIcon}>📋</Text>
            <Text style={styles.emptyEntriesTitle}>No records logged</Text>
            <Text style={styles.emptyEntriesSubtitle}>
              Your complete fuel history will appear here.
            </Text>
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
                <View key={entry.id} style={styles.entryItemCard}>
                  {/* Left: Date & Vehicle */}
                  <View style={styles.entryLeft}>
                    <Text style={styles.entryDate}>{displayDate}</Text>
                    {entry.vehicle ? (
                      <View style={styles.vehicleTag}>
                        <Text style={styles.vehicleTagText}>🚗 {entry.vehicle}</Text>
                      </View>
                    ) : null}
                    {entry.notes ? (
                      <Text style={styles.entryNotes} numberOfLines={1}>
                        💬 {entry.notes}
                      </Text>
                    ) : null}
                  </View>

                  {/* Middle: Liters & Total Cost */}
                  <View style={styles.entryRightMetrics}>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLitersLabel}>Volume:</Text>
                      <Text style={styles.metricLiters}>{entry.liters.toFixed(2)} L</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricCostLabel}>Total:</Text>
                      <Text style={styles.metricCost}>₹{entry.total_cost.toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Right: Trash Delete Button */}
                  <Pressable
                    style={styles.deleteIconButton}
                    onPress={() => handleDelete(entry.id)}
                    hitSlop={10}
                    android_ripple={{ color: '#FEE2E2', borderless: true }}
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
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  screenHeader: {
    paddingTop: 4,
  },
  screenSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  /* 4 Overview Metric Cards */
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    width: '48%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardPrimary: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  statCardHighlight: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    position: 'relative',
  },
  highlightBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  highlightBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  statCardIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
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
    color: '#64748B',
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
    color: '#92400E',
    textAlign: 'center',
    marginTop: 2,
  },
  costliestAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#B45309',
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 13,
    color: '#94A3B8',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chartSubtext: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  /* Chart Section */
  chartSection: {
    marginTop: 4,
  },
  chartWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
  },
  chartStyle: {
    borderRadius: 12,
  },
  emptyChartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyChartIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyChartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyChartSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  /* Entries Section */
  entriesSection: {
    marginTop: 4,
  },
  entryCountBadge: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  entriesList: {
    gap: 10,
  },
  entryItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  entryLeft: {
    flex: 1.3,
    gap: 4,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  vehicleTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vehicleTagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  entryNotes: {
    fontSize: 12,
    color: '#64748B',
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
    color: '#94A3B8',
  },
  metricLiters: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  metricCostLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  metricCost: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563EB',
  },
  deleteIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  deleteIconText: {
    fontSize: 16,
  },
  emptyEntriesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyEntriesIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyEntriesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyEntriesSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
});
