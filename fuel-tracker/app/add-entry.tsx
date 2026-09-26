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
import { useAppTheme } from '~/lib/theme';

export default function AddEntryScreen() {
  const { colors, isDark } = useAppTheme();

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
      style={[styles.keyboardAvoid, { backgroundColor: colors.background }]}
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
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Date <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.quickDateRow}>
              <Pressable
                style={[
                  styles.quickDateChip,
                  {
                    backgroundColor:
                      date === todayISO ? colors.chipActiveBg : colors.chipBg,
                  },
                ]}
                onPress={() => setDate(todayISO)}
              >
                <Text
                  style={[
                    styles.quickDateChipText,
                    {
                      color:
                        date === todayISO
                          ? colors.chipActiveText
                          : colors.chipText,
                    },
                  ]}
                >
                  Today
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.quickDateChip,
                  {
                    backgroundColor:
                      date === yesterdayISO ? colors.chipActiveBg : colors.chipBg,
                  },
                ]}
                onPress={() => setDate(yesterdayISO)}
              >
                <Text
                  style={[
                    styles.quickDateChipText,
                    {
                      color:
                        date === yesterdayISO
                          ? colors.chipActiveText
                          : colors.chipText,
                    },
                  ]}
                >
                  Yesterday
                </Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.inputText,
              },
              dateError && {
                borderColor: colors.dangerText,
                backgroundColor: colors.dangerBg,
              },
            ]}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.placeholderText}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          {dateError ? (
            <Text style={[styles.errorText, { color: colors.dangerText }]}>
              {dateError}
            </Text>
          ) : null}
        </View>

        {/* Liters Field */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            Liters Filled <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.inputWithSuffix}>
            <TextInput
              style={[
                styles.textInput,
                styles.inputFlex,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                },
                litersError && {
                  borderColor: colors.dangerText,
                  backgroundColor: colors.dangerBg,
                },
              ]}
              value={liters}
              onChangeText={setLiters}
              placeholder="e.g. 35.50"
              placeholderTextColor={colors.placeholderText}
              keyboardType="decimal-pad"
            />
            <View style={[styles.suffixBadge, { backgroundColor: colors.subtleBg }]}>
              <Text style={[styles.suffixText, { color: colors.textSecondary }]}>L</Text>
            </View>
          </View>
          {litersError ? (
            <Text style={[styles.errorText, { color: colors.dangerText }]}>
              {litersError}
            </Text>
          ) : null}
        </View>

        {/* Price Per Liter Field */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            Price per Liter <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.inputWithPrefix}>
            <View style={styles.prefixBadge}>
              <Text style={[styles.prefixText, { color: colors.textSecondary }]}>₹</Text>
            </View>
            <TextInput
              style={[
                styles.textInput,
                styles.inputFlex,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                },
                priceError && {
                  borderColor: colors.dangerText,
                  backgroundColor: colors.dangerBg,
                },
              ]}
              value={pricePerLiter}
              onChangeText={setPricePerLiter}
              placeholder="e.g. 102.50"
              placeholderTextColor={colors.placeholderText}
              keyboardType="decimal-pad"
            />
          </View>
          {priceError ? (
            <Text style={[styles.errorText, { color: colors.dangerText }]}>
              {priceError}
            </Text>
          ) : null}
        </View>

        {/* Live Auto-Calculated Read-Only Total Cost */}
        <View
          style={[
            styles.totalCostCard,
            {
              backgroundColor: colors.primaryLight,
              borderColor: colors.primaryBorder,
            },
          ]}
        >
          <View style={styles.totalCostHeader}>
            <Text
              style={[
                styles.totalCostTitle,
                { color: isDark ? '#93C5FD' : '#1E40AF' },
              ]}
            >
              Total Cost
            </Text>
            <View
              style={[
                styles.readOnlyBadge,
                { backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE' },
              ]}
            >
              <Text
                style={[
                  styles.readOnlyBadgeText,
                  { color: isDark ? '#93C5FD' : '#1D4ED8' },
                ]}
              >
                Auto-calculated
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.totalCostValue,
              { color: isDark ? '#60A5FA' : '#1D4ED8' },
            ]}
          >
            {calculatedTotal !== null ? `₹${calculatedTotal}` : '₹0.00'}
          </Text>

          <Text
            style={[
              styles.totalCostFormula,
              { color: isDark ? '#93C5FD' : '#3B82F6' },
            ]}
          >
            {calculatedTotal !== null
              ? `${parsedLiters.toFixed(2)} L × ₹${parsedPrice.toFixed(2)} / L`
              : 'Enter liters and price per liter to calculate'}
          </Text>
        </View>

        {/* Optional Vehicle Input */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            Vehicle (Optional)
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.inputText,
              },
            ]}
            value={vehicle}
            onChangeText={setVehicle}
            placeholder="e.g. Honda City, Hunter 350"
            placeholderTextColor={colors.placeholderText}
            maxLength={40}
          />
        </View>

        {/* Optional Notes Input */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            Notes (Optional)
          </Text>
          <TextInput
            style={[
              styles.textInput,
              styles.textAreaInput,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.inputText,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Full tank at Shell station, highway trip"
            placeholderTextColor={colors.placeholderText}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Save Submit Button */}
        <Pressable
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
            saving && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
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
  },
  quickDateChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  suffixText: {
    fontSize: 13,
    fontWeight: '700',
  },
  prefixBadge: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '700',
  },
  textAreaInput: {
    minHeight: 85,
    paddingTop: 12,
  },
  totalCostCard: {
    borderRadius: 14,
    borderWidth: 1.5,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readOnlyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  readOnlyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  totalCostValue: {
    fontSize: 30,
    fontWeight: '800',
    marginVertical: 2,
  },
  totalCostFormula: {
    fontSize: 13,
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
