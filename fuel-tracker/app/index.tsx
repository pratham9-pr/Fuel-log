import { format, parseISO } from 'date-fns';
import { Link, useRouter, useFocusEffect } from 'expo-router';
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
import {
  deleteEntry,
  getAllEntries,
  getEntryForDate,
  getMonthSpend,
} from '~/lib/fuelRepository';
import { useAppTheme } from '~/lib/theme';
import type { FuelEntry } from '~/lib/types';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

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
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {formattedToday}
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Fuel Log</Text>
        </View>

        <View style={styles.headerActions}>
          <Link href="/stats" asChild>
            <Pressable
              style={[
                styles.headerIconButton,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.headerIconText, { color: colors.text }]}>📊 Stats</Text>
            </Pressable>
          </Link>
          <Link href="/add-entry" asChild>
            <Pressable
              style={[styles.headerPrimaryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.headerPrimaryButtonText}>+ Add</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Prominent Daily Top-Up Prompt Card */}
      {shouldShowPrompt && (
        <View
          style={[
            styles.promptCard,
            {
              backgroundColor: colors.primaryLight,
              borderColor: colors.primaryBorder,
            },
          ]}
        >
          <View style={styles.promptHeader}>
            <View
              style={[
                styles.promptIconBadge,
                { backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE' },
              ]}
            >
              <Text style={styles.promptIcon}>⛽</Text>
            </View>
            <View style={styles.promptTextContainer}>
              <Text style={[styles.promptTitle, { color: isDark ? '#93C5FD' : '#1E3A8A' }]}>
                Did you top up fuel today?
              </Text>
              <Text
                style={[styles.promptDescription, { color: isDark ? '#BFDBFE' : '#3B82F6' }]}
              >
                Keep your fuel expenses up to date by recording today's fill-up.
              </Text>
            </View>
          </View>

          <View style={styles.promptButtons}>
            <Pressable
              style={[
                styles.promptNoButton,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
              onPress={handleDismissPrompt}
            >
              <Text style={[styles.promptNoButtonText, { color: colors.textSecondary }]}>
                No
              </Text>
            </Pressable>
            <Pressable
              style={[styles.promptYesButton, { backgroundColor: colors.primary }]}
              onPress={handleAcceptPrompt}
            >
              <Text style={styles.promptYesButtonText}>Yes, Add Entry</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Loading state */}
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.textMuted }]}>
            Loading fuel log…
          </Text>
        </View>
      ) : (
        <>
          {/* Month's Spend Summary Card */}
          <View style={styles.summarySection}>
            <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
              This Month's Spend
            </Text>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.summaryTopRow}>
                <View>
                  <Text style={[styles.summaryMonthLabel, { color: colors.textMuted }]}>
                    {currentMonthLabel}
                  </Text>
                  <Text style={[styles.summaryAmount, { color: colors.text }]}>
                    ₹
                    {monthSpend.totalSpent.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
                <View
                  style={[
                    styles.summaryBadge,
                    { backgroundColor: colors.subtleBg },
                  ]}
                >
                  <Text style={[styles.summaryBadgeText, { color: colors.textSecondary }]}>
                    {monthSpend.count} {monthSpend.count === 1 ? 'fill-up' : 'fill-ups'}
                  </Text>
                </View>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />

              <View style={styles.summaryDetailsRow}>
                <View style={styles.summaryStatItem}>
                  <Text style={[styles.summaryStatLabel, { color: colors.textMuted }]}>
                    Total Volume
                  </Text>
                  <Text style={[styles.summaryStatValue, { color: colors.text }]}>
                    {monthSpend.totalLiters.toFixed(2)} L
                  </Text>
                </View>
                <View
                  style={[styles.summaryStatDivider, { backgroundColor: colors.divider }]}
                />
                <View style={styles.summaryStatItem}>
                  <Text style={[styles.summaryStatLabel, { color: colors.textMuted }]}>
                    Avg / Fill-up
                  </Text>
                  <Text style={[styles.summaryStatValue, { color: colors.text }]}>
                    ₹
                    {monthSpend.count > 0
                      ? (monthSpend.totalSpent / monthSpend.count).toFixed(2)
                      : '0.00'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3 Most Recent Entries */}
          <View style={styles.recentSection}>
            <View style={styles.recentHeaderRow}>
              <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
                Recent Entries
              </Text>
              {totalEntriesCount > 0 && (
                <Text style={[styles.recentCountBadge, { color: colors.textMuted }]}>
                  Showing {recentEntries.length} of {totalEntriesCount}
                </Text>
              )}
            </View>

            {recentEntries.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <Text style={styles.emptyStateIcon}>📋</Text>
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                  No entries recorded yet
                </Text>
                <Text style={[styles.emptyStateMessage, { color: colors.textMuted }]}>
                  Tap "+ Add" above or respond to the top-up prompt to record your first fuel receipt.
                </Text>
                <Link href="/add-entry" asChild>
                  <Pressable
                    style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.emptyStateButtonText}>Add First Entry</Text>
                  </Pressable>
                </Link>
              </View>
            ) : (
              <View style={styles.entriesList}>
                {recentEntries.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.entryCard,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    ]}
                  >
                    <View style={styles.entryHeader}>
                      <View style={styles.entryDateGroup}>
                        <Text style={[styles.entryDate, { color: colors.text }]}>
                          {formatDateLabel(item.date)}
                        </Text>
                        {item.date === todayISO && (
                          <View
                            style={[
                              styles.todayBadge,
                              { backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.todayBadgeText,
                                { color: isDark ? '#93C5FD' : '#1D4ED8' },
                              ]}
                            >
                              Today
                            </Text>
                          </View>
                        )}
                      </View>
                      {item.vehicle ? (
                        <View
                          style={[
                            styles.vehicleBadge,
                            {
                              backgroundColor: colors.subtleBg,
                              borderColor: colors.cardBorder,
                            },
                          ]}
                        >
                          <Text style={[styles.vehicleBadgeText, { color: colors.textSecondary }]}>
                            🚗 {item.vehicle}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View
                      style={[
                        styles.entryMetrics,
                        { backgroundColor: colors.subtleBg },
                      ]}
                    >
                      <View style={styles.entryMetricColumn}>
                        <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                          Volume
                        </Text>
                        <Text style={[styles.metricValue, { color: colors.text }]}>
                          {item.liters.toFixed(2)} L
                        </Text>
                      </View>
                      <View style={styles.entryMetricColumn}>
                        <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                          Rate
                        </Text>
                        <Text style={[styles.metricValue, { color: colors.text }]}>
                          ₹{item.price_per_liter.toFixed(2)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.entryMetricColumn,
                          styles.entryMetricHighlight,
                          { borderLeftColor: colors.cardBorder },
                        ]}
                      >
                        <Text style={[styles.metricLabelHighlight, { color: colors.primary }]}>
                          Total Cost
                        </Text>
                        <Text style={[styles.metricValueHighlight, { color: colors.primary }]}>
                          ₹{item.total_cost.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {item.notes ? (
                      <View style={styles.entryNotesContainer}>
                        <Text style={[styles.entryNotesText, { color: colors.textSecondary }]}>
                          💬 {item.notes}
                        </Text>
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.entryFooter,
                        { borderTopColor: colors.divider },
                      ]}
                    >
                      <Pressable
                        style={[
                          styles.deleteButton,
                          { backgroundColor: colors.dangerBg },
                        ]}
                        onPress={() => handleDeleteEntry(item.id)}
                        hitSlop={8}
                      >
                        <Text style={[styles.deleteButtonText, { color: colors.dangerText }]}>
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  headerIconText: {
    fontWeight: '600',
    fontSize: 13,
  },
  headerPrimaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerPrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  promptCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    elevation: 3,
  },
  promptHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  promptIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptIcon: {
    fontSize: 22,
  },
  promptTextContainer: {
    flex: 1,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  promptDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  promptButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  promptNoButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  promptNoButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  promptYesButton: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  promptYesButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  summarySection: {
    marginTop: 4,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    elevation: 2,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryMonthLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  summaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 14,
  },
  summaryDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  summaryStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryStatDivider: {
    width: 1,
    height: 28,
  },
  recentSection: {
    marginTop: 8,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentCountBadge: {
    fontSize: 12,
  },
  entriesList: {
    gap: 12,
  },
  entryCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    elevation: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryDateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryDate: {
    fontSize: 15,
    fontWeight: '700',
  },
  todayBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  vehicleBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vehicleBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  entryMetrics: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-between',
  },
  entryMetricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  entryMetricHighlight: {
    borderLeftWidth: 1,
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  metricLabelHighlight: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricValueHighlight: {
    fontSize: 15,
    fontWeight: '800',
  },
  entryNotesContainer: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
  entryNotesText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  deleteButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyStateCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 4,
  },
  emptyStateIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyStateMessage: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyStateButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  loaderContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
  },
});
