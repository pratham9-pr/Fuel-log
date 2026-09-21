import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getFuelStats, getAllFuelEntries, type FuelEntry } from '~/lib/db';

interface Stats {
  totalEntries: number;
  totalLiters: number;
  totalSpend: number;
  avgPricePerLiter: number;
}

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEntries, setRecentEntries] = useState<FuelEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [s, entries] = await Promise.all([
        getFuelStats(),
        getAllFuelEntries(),
      ]);
      setStats(s);
      // Keep last 5 entries for a mini-history view
      setRecentEntries(entries.slice(0, 5));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
    }, [loadStats])
  );

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const avgCostPerFill =
    stats && stats.totalEntries > 0
      ? stats.totalSpend / stats.totalEntries
      : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadStats} />
      }
    >
      <Text style={styles.sectionTitle}>Overview</Text>

      <View style={styles.grid}>
        <StatCard
          icon="⛽"
          label="Total Entries"
          value={String(stats?.totalEntries ?? 0)}
        />
        <StatCard
          icon="💧"
          label="Total Liters"
          value={`${(stats?.totalLiters ?? 0).toFixed(2)} L`}
        />
        <StatCard
          icon="💰"
          label="Total Spend"
          value={`₹${(stats?.totalSpend ?? 0).toFixed(2)}`}
          accent
        />
        <StatCard
          icon="📈"
          label="Avg Price/L"
          value={`₹${(stats?.avgPricePerLiter ?? 0).toFixed(2)}`}
        />
        <StatCard
          icon="🧾"
          label="Avg Cost/Fill"
          value={`₹${avgCostPerFill.toFixed(2)}`}
        />
      </View>

      {recentEntries.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
            Last 5 Fill-ups
          </Text>
          {recentEntries.map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <View>
                <Text style={styles.historyDate}>{entry.date}</Text>
                {entry.vehicle ? (
                  <Text style={styles.historyVehicle}>{entry.vehicle}</Text>
                ) : null}
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyLiters}>
                  {entry.liters.toFixed(2)} L
                </Text>
                <Text style={styles.historyCost}>
                  ₹{entry.total_cost.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}

      {stats?.totalEntries === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No data yet. Add your first fuel entry to see statistics here.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={[styles.cardLabel, accent && styles.cardLabelAccent]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardAccent: {
    backgroundColor: '#2563EB',
  },
  cardIcon: { fontSize: 26, marginBottom: 8 },
  cardValue: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  cardLabel: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  cardLabelAccent: { color: '#BFDBFE' },
  historyRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyDate: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  historyVehicle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  historyRight: { alignItems: 'flex-end' },
  historyLiters: { fontSize: 13, color: '#475569' },
  historyCost: { fontSize: 15, fontWeight: '700', color: '#2563EB' },
  emptyBox: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
});
