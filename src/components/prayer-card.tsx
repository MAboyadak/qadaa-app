import { View } from 'react-native';

import type { Prayer } from '@/domain/prayers';
import { useI18n } from '@/i18n';
import { radius, spacing, useColors } from '@/theme';

import { AppText, Icon, IconButton, type IconName } from './ui';

const ICONS: Record<Prayer, IconName> = {
  fajr: 'weather-sunset-up',
  dhuhr: 'white-balance-sunny',
  asr: 'weather-partly-cloudy',
  maghrib: 'weather-sunset-down',
  isha: 'weather-night',
  witr: 'star-crescent',
};

export function PrayerCard({
  prayer,
  remaining,
  madeUp,
  onAdd,
  onUndo,
}: {
  prayer: Prayer;
  remaining: number;
  madeUp: number;
  onAdd: () => void;
  onUndo: () => void;
}) {
  const c = useColors();
  const { t, n } = useI18n();
  const name = t(`prayers.${prayer}`);
  const done = remaining === 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: c.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.border,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
      }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: done ? c.accentSoft : c.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={ICONS[prayer]} color={done ? c.accent : c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{name}</AppText>
        <AppText variant="caption" muted>
          {t('home.remaining')} {n(remaining)} · {t('home.madeUp')} {n(madeUp)}
        </AppText>
      </View>
      <IconButton
        icon="undo-variant"
        variant="plain"
        size={40}
        label={t('home.undoOne', { prayer: name })}
        disabled={madeUp === 0}
        onPress={onUndo}
      />
      <IconButton
        icon={done ? 'check' : 'plus'}
        variant="solid"
        size={52}
        label={t('home.markOne', { prayer: name })}
        disabled={done}
        onPress={onAdd}
      />
    </View>
  );
}

