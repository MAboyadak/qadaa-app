import { Pressable, View } from 'react-native';

import { dailyTarget, projectedFinish, type Pace, type PaceType } from '@/domain/plan';
import { useI18n } from '@/i18n';
import { formatDate } from '@/lib/format';
import { radius, spacing, useColors } from '@/theme';

import { AppText, Icon, Stepper } from './ui';

const DEFAULT_VALUES: Record<PaceType, number> = { with_each: 1, days_per_day: 2, minutes_per_day: 20 };

export function PacePicker({
  pace,
  onChange,
  remainingTotal,
  prayersPerDay,
  minutesPerQadaDay,
}: {
  pace: Pace;
  onChange: (p: Pace) => void;
  remainingTotal: number;
  prayersPerDay: number;
  minutesPerQadaDay: number;
}) {
  const c = useColors();
  const { t, locale } = useI18n();
  const today = new Date();

  const option = (type: PaceType) => {
    const candidate: Pace = type === pace.type ? pace : { type, value: DEFAULT_VALUES[type] };
    const target = dailyTarget(candidate, prayersPerDay, minutesPerQadaDay);
    const finish = projectedFinish(remainingTotal, target, today);
    const selected = pace.type === type;
    const hint =
      type === 'with_each'
        ? t('pace.with_eachHint')
        : type === 'days_per_day'
          ? t('pace.days_per_dayHint', { n: candidate.value })
          : t('pace.minutes_per_dayHint', { n: candidate.value });
    return (
      <Pressable
        key={type}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        onPress={() => onChange(candidate)}
        style={{
          borderRadius: radius.lg,
          borderWidth: 2,
          borderColor: selected ? c.primary : c.border,
          backgroundColor: selected ? c.primarySoft : c.surface,
          padding: spacing.lg,
          gap: spacing.xs,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Icon name={selected ? 'radiobox-marked' : 'radiobox-blank'} color={c.primary} />
          <AppText variant="heading" style={{ flex: 1 }}>
            {t(`pace.${type}`)}
          </AppText>
        </View>
        <AppText muted>{hint}</AppText>
        <AppText variant="label" color="primary">
          {t('pace.target', { n: target })}
          {finish ? ` · ${t('onboarding.pace.finish', { date: formatDate(finish, locale) })}` : ''}
        </AppText>
        {selected && type === 'days_per_day' ? (
          <Stepper
            label={t('pace.daysPerDayLabel')}
            value={pace.value}
            min={1}
            max={10}
            onChange={(value) => onChange({ type, value })}
          />
        ) : null}
        {selected && type === 'minutes_per_day' ? (
          <Stepper
            label={t('pace.minutesPerDayLabel')}
            value={pace.value}
            min={3}
            max={240}
            step={pace.value < 30 ? 3 : 10}
            onChange={(value) => onChange({ type, value })}
          />
        ) : null}
      </Pressable>
    );
  };

  return <View style={{ gap: spacing.md }}>{(['with_each', 'days_per_day', 'minutes_per_day'] as const).map(option)}</View>;
}
