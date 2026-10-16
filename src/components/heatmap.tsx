import { View } from 'react-native';

import { addDays, toDayKey, type DayKey } from '@/domain/dates';
import { useI18n } from '@/i18n';
import { spacing, useColors } from '@/theme';

import { AppText } from './ui';

const WEEKS = 12;

/** GitHub-style grid of the last 12 weeks; columns are weeks, rows are weekdays. */
export function Heatmap({ byDay, target, today = new Date() }: { byDay: Map<DayKey, number>; target: number; today?: Date }) {
  const c = useColors();
  const { t } = useI18n();
  const levels = [c.surfaceMuted, c.heat1, c.heat2, c.primary];
  const full = Math.max(1, target);
  const level = (n: number) => (n <= 0 ? 0 : n < full / 2 ? 1 : n < full ? 2 : 3);

  // start on the first day of the week 11 weeks ago (weeks start Saturday)
  const start = addDays(today, -((today.getDay() + 1) % 7) - (WEEKS - 1) * 7);
  const columns = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)),
  );

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
        {columns.map((days, w) => (
          <View key={w} style={{ gap: 4 }}>
            {days.map((d) => {
              const key = toDayKey(d);
              const future = d > today;
              return (
                <View
                  key={key}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    backgroundColor: future ? 'transparent' : levels[level(byDay.get(key) ?? 0)],
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
        <AppText variant="caption" muted>
          {t('history.less')}
        </AppText>
        {levels.map((bg) => (
          <View key={bg} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: bg }} />
        ))}
        <AppText variant="caption" muted>
          {t('history.more')}
        </AppText>
      </View>
    </View>
  );
}
