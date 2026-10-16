import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/toast';
import { DATABASE_NAME, migrate } from '@/db/schema';
import { applyDirection, deviceLocale, I18nProvider } from '@/i18n';
import { handleResponse, setupNotifications } from '@/notifications';
import { AppDataProvider, useAppData } from '@/state/app-data';
import { palette } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
          <AppDataProvider>
            <LocaleGate />
          </AppDataProvider>
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Applies the saved language (and its RTL direction) before showing any screen. */
function LocaleGate() {
  const { profile } = useAppData();
  const locale = profile?.locale ?? deviceLocale();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    applyDirection(locale).then((reloading) => {
      if (cancelled || reloading) return;
      setupNotifications(locale).catch(() => {});
      setReady(true);
      SplashScreen.hideAsync();
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (!ready) return null;
  return (
    <I18nProvider locale={locale}>
      <ToastProvider>
        <NotificationResponses />
        <Navigator />
      </ToastProvider>
    </I18nProvider>
  );
}

/** "Prayed it ✓" pressed while the app is in the foreground. */
function NotificationResponses() {
  const db = useSQLiteContext();
  const { refresh } = useAppData();
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      if (await handleResponse(db, response)) await refresh();
    });
    return () => sub.remove();
  }, [db, refresh]);
  return null;
}

function Navigator() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? palette.dark : palette.light;
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          background: colors.background,
          card: colors.surface,
          primary: colors.primary,
          text: colors.text,
          border: colors.border,
        },
      }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="sources" options={{ presentation: 'modal' }} />
        <Stack.Screen name="adjust" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
