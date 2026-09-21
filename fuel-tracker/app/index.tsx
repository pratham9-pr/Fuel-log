import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { deleteFuelEntry, getAllFuelEntries, type FuelEntry } from '~/lib/db';

export default function HomeScreen() {
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAllFuelEntries();
      setEntries(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload the list every time this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void loadEntries();
    }, [loadEntries])
  );

  const handleDelete = (id: number) => {
    Alert.alert('Delete entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFuelEntry(id);
          setEntries((prev) => prev.filter((e) => e.id !== id));
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: FuelEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.dateText}>{item.date}</Text>
        {item.vehicle ? (
          <Text style={styles.vehicleText}>{item.vehicle}</Text>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Stat label="Liters" value={`${item.liters.toFixed(2)} L`} />
        <Stat label="Price/L" value={`₹${item.price_per_liter.toFixed(2)}`} />
        <Stat label="Total" value={`₹${item.total_cost.toFixed(2)}`} highlight />
      </View>

      {item.notes ? (
        <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
      ) : null}

      <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
        <Text style={styles.deleteBtnText}>Delete</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Link href="/stats" asChild>
          <Pressable style={styles.navBtn}>
            <Text style={styles.navBtnText}>📊 Stats</Text>
          </Pressable>
        </Link>
        <Link href="/add-entry" asChild>
          <Pressable style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add Entry</Text>
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={loadEntries}
        contentContainerStyle={
          entries.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              No fuel entries yet.{'\n'}Tap "Add Entry" to get started.
            </Text>
          ) : null
        }
      />
    </View>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  navBtnText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
  addBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listContent: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateText: { fontWeight: '700', fontSize: 15, color: '#1E293B' },
  vehicleText: {
    fontSize: 13,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between' },
  statCell: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 2 },
  statValue: { fontSize: 15, fontWeight: '600', color: '#334155' },
  statValueHighlight: { color: '#2563EB' },
  notes: { marginTop: 10, fontSize: 13, color: '#64748B', fontStyle: 'italic' },
  deleteBtn: { marginTop: 12, alignSelf: 'flex-end' },
  deleteBtnText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
});
