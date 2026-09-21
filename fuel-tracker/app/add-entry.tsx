import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { insertFuelEntry } from '~/lib/db';

export default function AddEntryScreen() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [date, setDate] = useState(today);
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  /** Compute total_cost from the live field values */
  const totalCost =
    parseFloat(liters) > 0 && parseFloat(pricePerLiter) > 0
      ? (parseFloat(liters) * parseFloat(pricePerLiter)).toFixed(2)
      : '—';

  const handleSave = async () => {
    // Validation
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid date', 'Please enter the date as YYYY-MM-DD.');
      return;
    }
    const litersNum = parseFloat(liters);
    const priceNum = parseFloat(pricePerLiter);
    if (isNaN(litersNum) || litersNum <= 0) {
      Alert.alert('Invalid liters', 'Please enter a valid amount of liters.');
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Invalid price', 'Please enter a valid price per liter.');
      return;
    }

    setSaving(true);
    try {
      await insertFuelEntry({
        date,
        liters: litersNum,
        price_per_liter: priceNum,
        total_cost: litersNum * priceNum,
        vehicle: vehicle.trim() || null,
        notes: notes.trim() || null,
      });
      router.back();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Date (YYYY-MM-DD)" required>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="2024-09-21"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </Field>

        <Field label="Liters filled" required>
          <TextInput
            style={styles.input}
            value={liters}
            onChangeText={setLiters}
            placeholder="e.g. 35.50"
            keyboardType="decimal-pad"
          />
        </Field>

        <Field label="Price per liter (₹)" required>
          <TextInput
            style={styles.input}
            value={pricePerLiter}
            onChangeText={setPricePerLiter}
            placeholder="e.g. 104.72"
            keyboardType="decimal-pad"
          />
        </Field>

        {/* Live total cost preview */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total cost</Text>
          <Text style={styles.totalValue}>
            {totalCost === '—' ? '—' : `₹${totalCost}`}
          </Text>
        </View>

        <Field label="Vehicle (optional)">
          <TextInput
            style={styles.input}
            value={vehicle}
            onChangeText={setVehicle}
            placeholder="e.g. Honda City, Bike"
          />
        </Field>

        <Field label="Notes (optional)">
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes…"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Field>

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving…' : 'Save Entry'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569' },
  required: { color: '#EF4444' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
  },
  textArea: { minHeight: 80 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#1E40AF' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#2563EB' },
  saveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
