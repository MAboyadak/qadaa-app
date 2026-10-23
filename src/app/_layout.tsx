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
import { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/toast';
import { DATABASE_NAME, migrate } from '@/db/schema';
import { deviceLocale, I18nProvider, isRtlLocale, persistDirection } from '@/i18n';
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

  useEffect(() => {
    persistDirection(locale);
    setupNotifications(locale).catch(() => {});
    SplashScreen.hideAsync();
  }, [locale]);

  return (
    <I18nProvider locale={locale}>
      {/* `direction` flips every row and start/end style for the chosen language, live */}
      <View style={{ flex: 1, direction: isRtlLocale(locale) ? 'rtl' : 'ltr' }}>
        <ToastProvider>
          <NotificationResponses />
          <Navigator />
        </ToastProvider>
      </View>
    </I18nProvider>
  );
}

/** "Prayed it ✓" pressed while the app is in the foreground. */
function NotificationResponses() {
  const db = useSQLiteContext();
  const { refresh } = useAppData();
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      if ((await handleResponse(db, response)).prayerAction) await refresh();
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
