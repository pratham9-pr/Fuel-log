import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { initDB } from '~/lib/db';
import { colors, interFamilies } from '~/lib/theme';

/**
 * Root layout for the entire app.
 *
 * Responsibilities:
 *  1. Call `initDB()` before rendering any screens so SQLite table is ready.
 *  2. Load the Inter typeface (Obsidian Fuel design system) before first paint.
 *  3. Show a loading indicator while DB/fonts are initializing.
 *  4. Wrap all screens in an expo-router `<Stack>` navigator with dark headers.
 */
export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

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
      <View style={[styles.center, { backgroundColor: colors.surfaceCanvas }]}>
        <StatusBar style="light" />
        <Text style={[styles.errorText, { color: colors.metricDanger }]}>
          Failed to initialise database:{'\n'}{error}
        </Text>
      </View>
    );
  }

  // Gate the UI until SQLite is ready and Inter is registered (fall back to the
  // system font if font loading itself fails, rather than blocking the app).
  if (!dbReady || (!fontsLoaded && !fontError)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.surfaceCanvas }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surfaceBase },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: interFamilies['700'] },
          contentStyle: { backgroundColor: colors.surfaceCanvas },
        }}
      >
        {/* Home renders its own Obsidian Fuel app bar */}
        <Stack.Screen name="index" options={{ title: 'Fuel Tracker', headerShown: false }} />
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
