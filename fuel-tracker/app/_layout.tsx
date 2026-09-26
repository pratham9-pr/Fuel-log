import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { initDB } from '~/lib/db';
import { useAppTheme } from '~/lib/theme';

/**
 * Root layout for the entire app.
 *
 * Responsibilities:
 *  1. Call `initDB()` before rendering any screens so SQLite table is ready.
 *  2. Show a loading indicator while DB is initializing.
 *  3. Dynamic light/dark theme header styles using system appearance.
 *  4. Wrap all screens in an expo-router `<Stack>` navigator.
 */
export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { colors, isDark } = useAppTheme();

  useEffect(() => {
    initDB()
      .then(() => setDbReady(true))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      });
  }, []);

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Text style={[styles.errorText, { color: colors.dangerText }]}>
          Failed to initialise database:{'\n'}{error}
        </Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'light'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.headerTint,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Fuel Tracker' }} />
        <Stack.Screen name="add-entry" options={{ title: 'Add Entry' }} />
        <Stack.Screen name="stats" options={{ title: 'Statistics' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    paddingHorizontal: 24,
    fontSize: 14,
    lineHeight: 20,
  },
});
