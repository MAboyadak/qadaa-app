import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';

import type { IconName } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useAppData } from '@/state/app-data';
import { fonts, useColors } from '@/theme';

export default function TabsLayout() {
  const { profile } = useAppData();
  const { t } = useI18n();
  const c = useColors();

  if (!profile?.onboardedAt) return <Redirect href="/onboarding" />;

  const icon = (name: IconName) =>
    function TabIcon({ color, size }: { color: unknown; size: number }) {
      return <MaterialCommunityIcons name={name} color={color as string} size={size} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
      }}>
      <Tabs.Screen name="index" options={{ title: t('appName'), tabBarIcon: icon('home-variant-outline') }} />
      <Tabs.Screen name="plan" options={{ title: t('plan.title'), tabBarIcon: icon('calendar-check-outline') }} />
      <Tabs.Screen name="history" options={{ title: t('history.title'), tabBarIcon: icon('chart-timeline-variant') }} />
      <Tabs.Screen name="settings" options={{ title: t('settings.title'), tabBarIcon: icon('cog-outline') }} />
    </Tabs>
  );
}
