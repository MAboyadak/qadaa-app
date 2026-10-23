import { View } from 'react-native';

import { Heatmap } from '@/components/heatmap';
import { AppText, Card, Icon, Screen } from '@/components/ui';
import { milestonesFor, nextMilestone } from '@/domain/milestones';
import { useI18n } from '@/i18n';
import { useAppData } from '@/state/app-data';
import { spacing, useColors } from '@/theme';

export default function HistoryScreen() {
  const data = useAppData();
  const { t, n, np } = useI18n();
  const c = useColors();
  const milestones = milestonesFor(data.totalDebt, data.prayersPerDay);
  const next = nextMilestone(data.madeUpTotal, data.totalDebt, data.prayersPerDay);

  return (
    <Screen>
      <AppText variant="title">{t('history.title')}</AppText>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Stat label={t('history.streak')} value={n(data.streak)} />
        <Stat label={t('history.bestStreak')} value={n(data.bestStreak)} />
        <Stat label={t('history.totalMadeUp')} value={n(data.madeUpTotal)} />
        <Stat
          label={t('history.daysMadeUp')}
          value={n(Math.floor(data.madeUpTotal / Math.max(1, data.prayersPerDay)))}
        />
      </View>

      <Card>
        <AppText variant="heading">{t('history.last12Weeks')}</AppText>
        <Heatmap byDay={data.byDay} target={data.target} />
      </Card>

      {next ? (
        <Card tone="primary">
          <AppText variant="label" muted>
            {t('history.nextMilestone')}
          </AppText>
          <AppText variant="heading">{t(`milestones.${next.id}`)}</AppText>
          <AppText muted>{t('history.remainingToNext', { n: np(next.threshold - data.madeUpTotal) })}</AppText>
        </Card>
      ) : null}

      <Card>
        <AppText variant="heading">{t('history.milestones')}</AppText>
        {milestones.map((m) => {
          const reached = data.madeUpTotal >= m.threshold;
          return (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 40 }}>
              <Icon
                name={reached ? 'check-decagram' : 'circle-outline'}
                color={reached ? c.accent : c.border}
              />
              <AppText style={{ flex: 1 }} muted={!reached}>
                {t(`milestones.${m.id}`)}
              </AppText>
              <AppText variant="caption" muted>
                {n(m.threshold)}
              </AppText>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', padding: spacing.md }}>
      <AppText variant="title" color="primary">
        {value}
      </AppText>
      <AppText variant="caption" muted center>
        {label}
      </AppText>
    </Card>
  );
}
