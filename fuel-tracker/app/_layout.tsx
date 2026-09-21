import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { initDB } from '~/lib/db';

/**
 * Root layout for the entire app.
 *
 * Responsibilities:
 *  1. Call `initDB()` before rendering any screens so the SQLite table is
 *     guaranteed to exist for every route.
 *  2. Show a loading indicator while the DB is initialising.
 *  3. Wrap all screens in an expo-router `<Stack>` navigator.
 */
export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to initialise database:{'\n'}{error}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2563EB' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Fuel Tracker' }} />
      <Stack.Screen name="add-entry" options={{ title: 'Add Entry' }} />
      <Stack.Screen name="stats" options={{ title: 'Statistics' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    paddingHorizontal: 24,
    fontSize: 14,
    lineHeight: 20,
  },
});
