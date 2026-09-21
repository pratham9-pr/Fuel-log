import { format, isAfter, parseISO, startOfDay, subDays } from 'date-fns';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { addFuelEntry } from '~/lib/fuelRepository';

export default function AddEntryScreen() {
  const todayDate = new Date();
  const todayISO = format(todayDate, 'yyyy-MM-dd');
  const yesterdayISO = format(subDays(todayDate, 1), 'yyyy-MM-dd');

  const [date, setDate] = useState(todayISO);
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Normalize string for decimal parsing (replace commas with dot)
  const parsedLiters = parseFloat(liters.replace(',', '.'));
  const parsedPrice = parseFloat(pricePerLiter.replace(',', '.'));

  // Live auto-calculated total cost
  const calculatedTotal = useMemo(() => {
    if (!isNaN(parsedLiters) && parsedLiters > 0 && !isNaN(parsedPrice) && parsedPrice > 0) {
      return (parsedLiters * parsedPrice).toFixed(2);
    }
    return null;
  }, [parsedLiters, parsedPrice]);

  // Date validation: format & future check
  const dateError = useMemo(() => {
    const trimmed = date.trim();
    if (!trimmed) return 'Date is required.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return 'Format must be YYYY-MM-DD.';
    }

    try {
      const parsed = parseISO(trimmed);
      if (isNaN(parsed.getTime())) {
        return 'Please enter a valid calendar date.';
      }
      if (isAfter(startOfDay(parsed), startOfDay(todayDate))) {
        return 'Date cannot be in the future.';
      }
    } catch {
      return 'Invalid date.';
    }

    return null;
  }, [date, todayDate]);

  // Field-level error messages
  const litersError = useMemo(() => {
    if (!liters) return null;
    if (isNaN(parsedLiters) || parsedLiters <= 0) {
      return 'Liters must be a positive number greater than 0.';
    }
    return null;
  }, [liters, parsedLiters]);

  const priceError = useMemo(() => {
    if (!pricePerLiter) return null;
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return 'Price per liter must be a positive number greater than 0.';
    }
    return null;
  }, [pricePerLiter, parsedPrice]);

  const handleSave = async () => {
    // 1. Date validation
    if (dateError) {
      Alert.alert('Invalid Date', dateError);
      return;
    }

    // 2. Liters validation
    if (!liters || isNaN(parsedLiters) || parsedLiters <= 0) {
      Alert.alert('Invalid Volume', 'Please enter a positive amount of liters (greater than 0).');
      return;
    }

    // 3. Price validation
    if (!pricePerLiter || isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Invalid Price', 'Please enter a positive price per liter (greater than 0).');
      return;
    }

    setSaving(true);
    try {
      await addFuelEntry({
        date: date.trim(),
        liters: parsedLiters,
        pricePerLiter: parsedPrice,
        vehicle: vehicle.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Navigate back to Home screen. Home screen's useFocusEffect will automatically re-fetch
      // and refresh today's status, monthly spend, and recent entries.
      router.back();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Save Failed', `Could not save fuel entry: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date Field */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>
              Date <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.quickDateRow}>
              <Pressable
                style={[styles.quickDateChip, date === todayISO && styles.quickDateChipActive]}
                onPress={() => setDate(todayISO)}
              >
                <Text
                  style={[
                    styles.quickDateChipText,
                    date === todayISO && styles.quickDateChipTextActive,
                  ]}
                >
                  Today
                </Text>
              </Pressable>
              <Pressable
                style={[styles.quickDateChip, date === yesterdayISO && styles.quickDateChipActive]}
                onPress={() => setDate(yesterdayISO)}
              >
                <Text
                  style={[
                    styles.quickDateChipText,
                    date === yesterdayISO && styles.quickDateChipTextActive,
                  ]}
                >
                  Yesterday
                </Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            style={[styles.textInput, dateError && styles.textInputError]}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}
        </View>

        {/* Liters Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            Liters Filled <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.inputWithSuffix}>
            <TextInput
              style={[
                styles.textInput,
                styles.inputFlex,
                litersError && styles.textInputError,
              ]}
              value={liters}
              onChangeText={setLiters}
              placeholder="e.g. 35.50"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
            />
            <View style={styles.suffixBadge}>
              <Text style={styles.suffixText}>L</Text>
            </View>
          </View>
          {litersError ? <Text style={styles.errorText}>{litersError}</Text> : null}
        </View>

        {/* Price Per Liter Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            Price per Liter <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.inputWithPrefix}>
            <View style={styles.prefixBadge}>
              <Text style={styles.prefixText}>₹</Text>
            </View>
            <TextInput
              style={[
                styles.textInput,
                styles.inputFlex,
                priceError && styles.textInputError,
              ]}
              value={pricePerLiter}
              onChangeText={setPricePerLiter}
              placeholder="e.g. 102.50"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
            />
          </View>
          {priceError ? <Text style={styles.errorText}>{priceError}</Text> : null}
        </View>

        {/* Live Auto-Calculated Read-Only Total Cost */}
        <View style={styles.totalCostCard}>
          <View style={styles.totalCostHeader}>
            <Text style={styles.totalCostTitle}>Total Cost</Text>
            <View style={styles.readOnlyBadge}>
              <Text style={styles.readOnlyBadgeText}>Auto-calculated</Text>
            </View>
          </View>

          <Text style={styles.totalCostValue}>
            {calculatedTotal !== null ? `₹${calculatedTotal}` : '₹0.00'}
          </Text>

          <Text style={styles.totalCostFormula}>
            {calculatedTotal !== null
              ? `${parsedLiters.toFixed(2)} L × ₹${parsedPrice.toFixed(2)} / L`
              : 'Enter liters and price per liter to calculate'}
          </Text>
        </View>

        {/* Optional Vehicle Input */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Vehicle (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={vehicle}
            onChangeText={setVehicle}
            placeholder="e.g. Honda City, Hunter 350"
            placeholderTextColor="#94A3B8"
            maxLength={40}
          />
        </View>

        {/* Optional Notes Input */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Full tank at Shell station, highway trip"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Save Submit Button */}
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          android_ripple={{ color: '#1D4ED8' }}
        >
          {saving ? (
            <View style={styles.buttonLoadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.saveButtonText}>Saving Entry…</Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>Save Entry</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 44,
    gap: 18,
  },
  fieldContainer: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  requiredStar: {
    color: '#EF4444',
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickDateChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  quickDateChipActive: {
    backgroundColor: '#DBEAFE',
  },
  quickDateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  quickDateChipTextActive: {
    color: '#1D4ED8',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  textInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    marginTop: 2,
  },
  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputFlex: {
    flex: 1,
  },
  suffixBadge: {
    position: 'absolute',
    right: 14,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  suffixText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  prefixBadge: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  textAreaInput: {
    minHeight: 85,
    paddingTop: 12,
  },
  /* Read-only Live Total Card */
  totalCostCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    padding: 16,
    marginVertical: 4,
  },
  totalCostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  totalCostTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readOnlyBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  readOnlyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  totalCostValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1D4ED8',
    marginVertical: 2,
  },
  totalCostFormula: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  /* Button */
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
