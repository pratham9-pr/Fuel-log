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
import type { FuelEntry } from '~/lib/types';

export default function HomeScreen() {
  const router = useRouter();

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

  // Refresh data every time the Home screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void loadDashboardData();
    }, [loadDashboardData])
  );

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

  // Show prominent card if:
  // 1. Data has loaded
  // 2. No entry exists for today
  // 3. User hasn't dismissed the card in this session
  const shouldShowPrompt = !loading && hasTodayEntry === false && !promptDismissed;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>{formattedToday}</Text>
          <Text style={styles.headerTitle}>Fuel Log</Text>
        </View>

        <View style={styles.headerActions}>
          <Link href="/stats" asChild>
            <Pressable style={styles.headerIconButton}>
              <Text style={styles.headerIconText}>📊 Stats</Text>
            </Pressable>
          </Link>
          <Link href="/add-entry" asChild>
            <Pressable style={styles.headerPrimaryButton}>
              <Text style={styles.headerPrimaryButtonText}>+ Add</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Prominent Daily Top-Up Prompt Card */}
      {shouldShowPrompt && (
        <View style={styles.promptCard}>
          <View style={styles.promptHeader}>
            <View style={styles.promptIconBadge}>
              <Text style={styles.promptIcon}>⛽</Text>
            </View>
            <View style={styles.promptTextContainer}>
              <Text style={styles.promptTitle}>Did you top up fuel today?</Text>
              <Text style={styles.promptDescription}>
                Keep your fuel expenses up to date by recording today's fill-up.
              </Text>
            </View>
          </View>

          <View style={styles.promptButtons}>
            <Pressable
              style={styles.promptNoButton}
              onPress={handleDismissPrompt}
              android_ripple={{ color: '#E2E8F0' }}
            >
              <Text style={styles.promptNoButtonText}>No</Text>
            </Pressable>
            <Pressable
              style={styles.promptYesButton}
              onPress={handleAcceptPrompt}
              android_ripple={{ color: '#1D4ED8' }}
            >
              <Text style={styles.promptYesButtonText}>Yes, Add Entry</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Loading state for initial load */}
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loaderText}>Loading fuel log…</Text>
        </View>
      ) : (
        <>
          {/* Month's Spend Summary Card */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionHeading}>This Month's Spend</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View>
                  <Text style={styles.summaryMonthLabel}>{currentMonthLabel}</Text>
                  <Text style={styles.summaryAmount}>
                    ₹{monthSpend.totalSpent.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
                <View style={styles.summaryBadge}>
                  <Text style={styles.summaryBadgeText}>
                    {monthSpend.count} {monthSpend.count === 1 ? 'fill-up' : 'fill-ups'}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryDetailsRow}>
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatLabel}>Total Volume</Text>
                  <Text style={styles.summaryStatValue}>
                    {monthSpend.totalLiters.toFixed(2)} L
                  </Text>
                </View>
                <View style={styles.summaryStatDivider} />
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatLabel}>Avg / Fill-up</Text>
                  <Text style={styles.summaryStatValue}>
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
              <Text style={styles.sectionHeading}>Recent Entries</Text>
              {totalEntriesCount > 0 && (
                <Text style={styles.recentCountBadge}>
                  Showing {recentEntries.length} of {totalEntriesCount}
                </Text>
              )}
            </View>

            {recentEntries.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateIcon}>📋</Text>
                <Text style={styles.emptyStateTitle}>No entries recorded yet</Text>
                <Text style={styles.emptyStateMessage}>
                  Tap "+ Add" above or respond to the top-up prompt to record your first fuel receipt.
                </Text>
                <Link href="/add-entry" asChild>
                  <Pressable style={styles.emptyStateButton}>
                    <Text style={styles.emptyStateButtonText}>Add First Entry</Text>
                  </Pressable>
                </Link>
              </View>
            ) : (
              <View style={styles.entriesList}>
                {recentEntries.map((item) => (
                  <View key={item.id} style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                      <View style={styles.entryDateGroup}>
                        <Text style={styles.entryDate}>{formatDateLabel(item.date)}</Text>
                        {item.date === todayISO && (
                          <View style={styles.todayBadge}>
                            <Text style={styles.todayBadgeText}>Today</Text>
                          </View>
                        )}
                      </View>
                      {item.vehicle ? (
                        <View style={styles.vehicleBadge}>
                          <Text style={styles.vehicleBadgeText}>🚗 {item.vehicle}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.entryMetrics}>
                      <View style={styles.entryMetricColumn}>
                        <Text style={styles.metricLabel}>Volume</Text>
                        <Text style={styles.metricValue}>{item.liters.toFixed(2)} L</Text>
                      </View>
                      <View style={styles.entryMetricColumn}>
                        <Text style={styles.metricLabel}>Rate</Text>
                        <Text style={styles.metricValue}>
                          ₹{item.price_per_liter.toFixed(2)}
                        </Text>
                      </View>
                      <View style={[styles.entryMetricColumn, styles.entryMetricHighlight]}>
                        <Text style={styles.metricLabelHighlight}>Total Cost</Text>
                        <Text style={styles.metricValueHighlight}>
                          ₹{item.total_cost.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {item.notes ? (
                      <View style={styles.entryNotesContainer}>
                        <Text style={styles.entryNotesText}>💬 {item.notes}</Text>
                      </View>
                    ) : null}

                    <View style={styles.entryFooter}>
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => handleDeleteEntry(item.id)}
                        hitSlop={8}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
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
    backgroundColor: '#F8FAFC',
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
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
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
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  headerIconText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  headerPrimaryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerPrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  /* Prominent Card */
  promptCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    padding: 16,
    shadowColor: '#2563EB',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
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
    backgroundColor: '#DBEAFE',
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
    color: '#1E3A8A',
    marginBottom: 4,
  },
  promptDescription: {
    fontSize: 13,
    color: '#3B82F6',
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
    borderColor: '#BFDBFE',
    backgroundColor: '#FFFFFF',
  },
  promptNoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  promptYesButton: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  promptYesButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  /* Section Headings */
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  /* Summary Card */
  summarySection: {
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryMonthLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  summaryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
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
    color: '#94A3B8',
    marginBottom: 2,
  },
  summaryStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  summaryStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  /* Recent Section */
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
    color: '#94A3B8',
  },
  entriesList: {
    gap: 12,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
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
    color: '#1E293B',
  },
  todayBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  vehicleBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vehicleBadgeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  entryMetrics: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
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
    borderLeftColor: '#E2E8F0',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  metricLabelHighlight: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  metricValueHighlight: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563EB',
  },
  entryNotesContainer: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
  entryNotesText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  deleteButton: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  /* Empty State */
  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  emptyStateIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptyStateMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  /* Loader */
  loaderContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: '#64748B',
  },
});
