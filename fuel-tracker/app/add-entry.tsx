import { format, isAfter, parseISO, startOfDay, subDays } from 'date-fns';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { addFuelEntry, getLastPrice } from '~/lib/fuelRepository';
import { colors, elevation, radius, spacing, t, tabular, typography } from '~/lib/theme';

/** Sanity ceiling for price/liter (₹) — catches fat-finger typos like 1101. */
const MAX_PRICE_PER_LITER = 500;

export default function AddEntryScreen() {
  const todayDate = new Date();
  const todayISO = format(todayDate, 'yyyy-MM-dd');
  const yesterdayISO = format(subDays(todayDate, 1), 'yyyy-MM-dd');

  const [date, setDate] = useState(todayISO);
  const [amountSpent, setAmountSpent] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Normalize string for decimal parsing (replace commas with dot)
  const parsedAmount = parseFloat(amountSpent.replace(',', '.'));
  const parsedPrice = parseFloat(pricePerLiter.replace(',', '.'));

  // Live auto-calculated volume: liters = amount spent ÷ price per liter
  const computedLiters = useMemo(() => {
    if (!isNaN(parsedAmount) && parsedAmount > 0 && !isNaN(parsedPrice) && parsedPrice > 0) {
      return (parsedAmount / parsedPrice).toFixed(2);
    }
    return null;
  }, [parsedAmount, parsedPrice]);

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
  const amountError = useMemo(() => {
    if (!amountSpent) return null;
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return 'Amount spent must be a positive number greater than 0.';
    }
    return null;
  }, [amountSpent, parsedAmount]);

  const priceError = useMemo(() => {
    if (!pricePerLiter) return null;
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return 'Price per liter must be a positive number greater than 0.';
    }
    if (parsedPrice > MAX_PRICE_PER_LITER) {
      return `Price per liter must be ₹${MAX_PRICE_PER_LITER} or less — check for typos.`;
    }
    return null;
  }, [pricePerLiter, parsedPrice]);

  // ── Price pre-fill: last price used for this vehicle (or most recent overall)
  // priceTouchedRef remembers manual edits so an auto-fill never overwrites a
  // price the user deliberately changed; prefillSeqRef drops stale async
  // responses when the vehicle text changes faster than queries resolve.
  const priceTouchedRef = useRef(false);
  const prefillSeqRef = useRef(0);

  const refreshPrefillPrice = useCallback(async (vehicleText: string) => {
    const seq = ++prefillSeqRef.current;
    try {
      const price = await getLastPrice(vehicleText);
      if (seq !== prefillSeqRef.current || priceTouchedRef.current) return;
      if (price !== null) setPricePerLiter(price.toFixed(2));
    } catch (err) {
      console.warn('Failed to pre-fill price per liter:', err);
    }
  }, []);

  // Prefill from the most recent fill-up overall when the screen opens.
  // The .then callback keeps setState out of the effect's synchronous body
  // (this is an async DB fetch, not a derived-state sync update); `active`
  // cancels the update if the screen unmounts before the query resolves.
  useEffect(() => {
    let active = true;
    getLastPrice('')
      .then((price) => {
        if (!active || priceTouchedRef.current || price === null) return;
        setPricePerLiter(price.toFixed(2));
      })
      .catch((err) => {
        console.warn('Failed to pre-fill price per liter:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  const handlePriceChange = (text: string) => {
    priceTouchedRef.current = true;
    setPricePerLiter(text);
  };

  const handleVehicleChange = (text: string) => {
    setVehicle(text);
    if (!priceTouchedRef.current) void refreshPrefillPrice(text);
  };

  const handleSave = async () => {
    // 1. Date validation
    if (dateError) {
      Alert.alert('Invalid Date', dateError);
      return;
    }

    // 2. Amount spent validation
    if (!amountSpent || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a positive amount spent (greater than 0).');
      return;
    }

    // 3. Price validation (positive, plus a typo-sanity ceiling)
    if (!pricePerLiter || isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Invalid Price', 'Please enter a positive price per liter (greater than 0).');
      return;
    }
    if (parsedPrice > MAX_PRICE_PER_LITER) {
      Alert.alert(
        'Invalid Price',
        `Price per liter cannot exceed ₹${MAX_PRICE_PER_LITER}.00 — you entered ₹${parsedPrice.toFixed(2)}. Please check for typos.`
      );
      return;
    }

    setSaving(true);
    try {
      // The amount spent is the authoritative spend; volume is derived from
      // it and rounded to the same 2dp shown in the computed readout.
      const liters = Math.round((parsedAmount / parsedPrice) * 100) / 100;

      await addFuelEntry({
        date: date.trim(),
        liters,
        pricePerLiter: parsedPrice,
        totalCost: parsedAmount,
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
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Computed liters (live readout) */}
        <View style={styles.totalCard}>
          <View style={styles.totalLabelRow}>
            <Ionicons
              name="water-outline"
              size={16}
              color={computedLiters !== null ? colors.metricPositive : colors.textTertiary}
            />
            <Text style={styles.totalLabelText}>Computed Liters</Text>
          </View>

          <View style={styles.totalValueRow}>
            <Text style={styles.totalValue}>{computedLiters ?? '0.00'}</Text>
            <Text style={styles.totalUnit}>L</Text>
          </View>

          {computedLiters !== null ? (
            <View style={styles.formulaPill}>
              <Text style={styles.formulaAmount}>₹{parsedAmount.toFixed(2)}</Text>
              <Text style={styles.formulaOperator}>÷</Text>
              <Text style={styles.formulaPrice}>₹{parsedPrice.toFixed(2)} / L</Text>
            </View>
          ) : (
            <Text style={styles.totalHint}>
              Enter amount spent and price per liter to calculate
            </Text>
          )}
        </View>

        {/* Date Field */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>Date</Text>
            <View style={styles.quickDateRow}>
              <Pressable
                style={[styles.quickChip, date === todayISO ? styles.quickChipActive : styles.quickChipIdle]}
                onPress={() => setDate(todayISO)}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    date === todayISO ? styles.quickChipTextActive : styles.quickChipTextIdle,
                  ]}
                >
                  Today
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.quickChip,
                  date === yesterdayISO ? styles.quickChipActive : styles.quickChipIdle,
                ]}
                onPress={() => setDate(yesterdayISO)}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    date === yesterdayISO ? styles.quickChipTextActive : styles.quickChipTextIdle,
                  ]}
                >
                  Yesterday
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.textInput, styles.textInputDate, dateError && styles.textInputError]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <Ionicons
              name="calendar-outline"
              size={20}
              color={colors.textTertiary}
              style={styles.inputIcon}
              pointerEvents="none"
            />
          </View>
          {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}
        </View>

        {/* Amount Spent & Price per Liter */}
        <View style={styles.twoColRow}>
          <View style={styles.colField}>
            <Text style={styles.fieldLabel}>Amount Spent (₹)</Text>
            <TextInput
              style={[styles.textInputCenter, amountError && styles.textInputError]}
              value={amountSpent}
              onChangeText={setAmountSpent}
              placeholder="e.g. 2000"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
            {amountError ? <Text style={styles.errorText}>{amountError}</Text> : null}
          </View>

          <View style={styles.colField}>
            <Text style={styles.fieldLabel}>Price / Liter (₹)</Text>
            <TextInput
              style={[styles.textInputCenter, priceError && styles.textInputError]}
              value={pricePerLiter}
              onChangeText={handlePriceChange}
              placeholder="e.g. 102.50"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
            {priceError ? <Text style={styles.errorText}>{priceError}</Text> : null}
          </View>
        </View>

        {/* Optional Vehicle Input */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>Vehicle</Text>
            <Text style={styles.optionalLabel}>Optional</Text>
          </View>
          <TextInput
            style={styles.textInput}
            value={vehicle}
            onChangeText={handleVehicleChange}
            placeholder="e.g. Honda City, Hunter 350"
            placeholderTextColor={colors.textTertiary}
            maxLength={40}
          />
        </View>

        {/* Optional Notes Input */}
        <View style={styles.fieldContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>Notes</Text>
            <Text style={styles.optionalLabel}>Optional</Text>
          </View>
          <TextInput
            style={styles.textAreaInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Station name, highway stop, or odometer…"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Actions */}
        <View style={styles.actionsBlock}>
          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <View style={styles.buttonLoadingRow}>
                <ActivityIndicator color={colors.onPrimary} size="small" />
                <Text style={styles.saveButtonText}>Saving Entry…</Text>
              </View>
            ) : (
              <>
                <Ionicons name="car-outline" size={20} color={colors.onPrimary} />
                <Text style={styles.saveButtonText}>Save Fill-Up</Text>
              </>
            )}
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={() => router.back()} disabled={saving}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <View style={styles.footerRow}>
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>Saved locally on device (SQLite)</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Shared input surface: obsidian card + hairline border + Inter regular
const inputSurface = {
  borderRadius: radius.default,
  borderWidth: 1,
  borderColor: colors.borderSubtle,
  backgroundColor: colors.surfaceCard,
  paddingHorizontal: 14,
  color: colors.textPrimary,
  ...t(typography.bodyLg),
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    backgroundColor: colors.surfaceCanvas,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.margin,
    paddingVertical: spacing.md,
    paddingBottom: 44,
    gap: spacing.lg,
  },

  // ─── Computed liters ─────────────────────────────────────────────────────
  totalCard: {
    ...elevation.level1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  totalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalLabelText: {
    ...t(typography.labelSm),
    color: colors.textSecondary,
  },
  totalValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: spacing.sm,
  },
  totalUnit: {
    ...t(typography.headlineMd),
    color: colors.textSecondary,
  },
  totalValue: {
    ...t(typography.displayLg),
    ...tabular,
    color: colors.textPrimary,
  },
  formulaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  formulaAmount: {
    ...t(typography.labelMd),
    ...tabular,
    color: colors.textPrimary,
  },
  formulaOperator: {
    ...t(typography.labelMd),
    color: colors.textTertiary,
  },
  formulaPrice: {
    ...t(typography.labelMd),
    ...tabular,
    color: colors.textPrimary,
  },
  totalHint: {
    ...t(typography.bodyMd),
    color: colors.textTertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // ─── Fields ─────────────────────────────────────────────────────────────
  fieldContainer: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 20,
  },
  fieldLabel: {
    ...t(typography.labelMd),
    color: colors.textSecondary,
  },
  optionalLabel: {
    ...t(typography.labelSm),
    color: colors.textTertiary,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.default,
  },
  quickChipIdle: {
    backgroundColor: colors.surfaceInteractive,
  },
  quickChipActive: {
    backgroundColor: colors.primary,
  },
  quickChipText: {
    ...t(typography.labelMd),
  },
  quickChipTextIdle: {
    color: colors.textSecondary,
  },
  quickChipTextActive: {
    color: colors.onPrimary,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  textInput: {
    ...inputSurface,
    height: 48,
  },
  textInputDate: {
    paddingRight: 40,
  },
  textInputCenter: {
    ...inputSurface,
    ...t(typography.metricMd),
    height: 48,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  textAreaInput: {
    ...inputSurface,
    ...t(typography.bodyMd),
    minHeight: 96,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  inputIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  textInputError: {
    borderColor: colors.metricDanger,
    backgroundColor: colors.metricDangerTint,
  },
  errorText: {
    ...t(typography.labelMd),
    color: colors.metricDanger,
    marginTop: 2,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: spacing.gutter,
  },
  colField: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },

  // ─── Actions ────────────────────────────────────────────────────────────
  actionsBlock: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  saveButton: {
    minHeight: 48,
    borderRadius: radius.default,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...t(typography.headlineSm),
    color: colors.onPrimary,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cancelButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...t({ ...typography.bodyMd, fontWeight: '500' }),
    color: colors.textSecondary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.metricPositive,
  },
  footerText: {
    ...t(typography.labelMd),
    color: colors.textTertiary,
  },
});
