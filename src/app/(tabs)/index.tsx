import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PrayerCard } from '@/components/prayer-card';
import { ProgressRing } from '@/components/progress-ring';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, Screen } from '@/components/ui';
import hope from '@/content/hope.json';
import type { Prayer } from '@/domain/prayers';
import { useI18n } from '@/i18n';
import { formatDate, formatHijri, formatTime } from '@/lib/format';
import { nextPrayer } from '@/lib/prayer-times';
import { useAppData } from '@/state/app-data';
import { spacing, useColors } from '@/theme';

export default function Home() {
  const data = useAppData();
  const { t, n, locale } = useI18n();
  const toast = useToast();
  const today = new Date();

  const pct = data.totalDebt > 0 ? (data.madeUpTotal / data.totalDebt) * 100 : 0;
  const hijri = formatHijri(today, locale);

  // one hope line per day, rotating
  const [hopeLine] = useState(() => hope.items[Math.floor(Date.now() / 86_400_000) % hope.items.length]);

  const next =
    data.profile?.lat != null && data.profile.lng != null
      ? nextPrayer(today, data.profile.lat, data.profile.lng, data.profile.calcMethod)
      : null;

  const onAdd = async (prayer: Prayer) => {
    const { logged, milestone } = await data.logOne(prayer);
    if (!logged) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const name = t(`prayers.${prayer}`);
    if (milestone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast({
        tone: 'celebrate',
        durationMs: 6000,
        message: t('milestones.celebrate', { name: t(`milestones.${milestone.id}`) }),
      });
    } else {
      toast({
        message: t('home.logged', { prayer: name }),
        actionLabel: t('common.undo'),
        onAction: () => onUndo(prayer),
      });
    }
  };

  const onUndo = async (prayer: Prayer) => {
    if (await data.undoOne(prayer)) toast({ message: t('home.undone'), durationMs: 2000 });
  };

  const allDone = data.totalDebt > 0 && data.remainingTotal === 0;
  const targetMet = data.target > 0 && data.todayDone >= data.target;

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <AppText variant="title">{t('appName')}</AppText>
        <AppText muted>
          {hijri ? `${hijri} · ` : ''}
          {formatDate(today, locale)}
        </AppText>
      </View>

      <Card style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
        <ProgressRing progress={pct / 100} size={190}>
          <AppText variant="display" color="primary">
            {n(data.remainingTotal)}
          </AppText>
          <AppText muted>{t('home.remaining')}</AppText>
        </ProgressRing>
        <AppText variant="label" color="primary">
          {t('home.percentDone', { pct: Math.floor(pct * 10) / 10 })}
        </AppText>
        <AppText muted center>
          {allDone
            ? t('home.allDone')
            : data.finishDate
              ? t('home.finishBy', { date: formatDate(data.finishDate, locale) })
              : t('home.noPlan')}
        </AppText>
      </Card>

      {data.target > 0 && !allDone ? (
        <Card tone={targetMet ? 'accent' : 'primary'} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" muted>
              {t('home.today')}
            </AppText>
            <AppText variant="heading">
              {targetMet ? t('home.todayDone') : t('home.todayProgress', { done: data.todayDone, target: data.target })}
            </AppText>
          </View>
          <TodayDots done={data.todayDone} target={data.target} />
        </Card>
      ) : null}

      {data.idleDays !== null && data.idleDays >= 3 && !allDone ? (
        <Card tone="muted">
          <AppText>{t('home.gentleNudge')}</AppText>
          <Button title={t('home.adjustPace')} variant="secondary" onPress={() => router.push('/plan')} />
        </Card>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        {data.prayers.map((p) => (
          <PrayerCard
            key={p}
            prayer={p}
            remaining={data.summary.remaining[p]}
            madeUp={data.summary.madeUp[p]}
            onAdd={() => onAdd(p)}
            onUndo={() => onUndo(p)}
          />
        ))}
      </View>

      {next ? (
        <AppText muted center>
          {t('home.nextPrayer', { prayer: t(`prayers.${next.prayer}`), time: formatTime(next.time, locale) })}
        </AppText>
      ) : null}

      <Card tone="accent">
        <AppText variant="bodyStrong" style={{ lineHeight: 30 }}>
          {hopeLine.ar}
        </AppText>
        {locale === 'en' ? <AppText>{hopeLine.en}</AppText> : null}
        <AppText variant="caption" muted>
          {locale === 'ar' ? hopeLine.source : hopeLine.sourceEn}
        </AppText>
      </Card>
    </Screen>
  );
}

function TodayDots({ done, target }: { done: number; target: number }) {
  const c = useColors();
  const shown = Math.min(target, 10);
  const filled = Math.round((Math.min(done, target) / target) * shown);
  return (
    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', maxWidth: 120, justifyContent: 'flex-end' }}>
      {Array.from({ length: shown }, (_, i) => (
        <View
          key={i}
          style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: i < filled ? c.primary : c.surface }}
        />
      ))}
    </View>
  );
}
