import { useEffect, useRef, useState } from 'react';

import { PacePicker } from '@/components/pace-picker';
import { AppText, Card, Screen, Stepper } from '@/components/ui';
import { diffDays } from '@/domain/dates';
import { splitDuration, type Pace } from '@/domain/plan';
import { useI18n } from '@/i18n';
import { formatDate, formatHijri } from '@/lib/format';
import { useAppData } from '@/state/app-data';

export default function PlanScreen() {
  const data = useAppData();
  const { t, locale, nc } = useI18n();
  const [draft, setDraft] = useState<{ source: Pace | null; pace: Pace }>({
    source: data.plan, pace: data.plan ?? { type: 'with_each', value: 1 },
  });
  // An external plan replaces the displayed draft immediately, before effects run.
  const pace = draft.source === data.plan ? draft.pace : data.plan ?? { type: 'with_each' as const, value: 1 };
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
  }, [data.plan]);

  // persist pace changes after a short pause (steppers fire many changes)
  const onPace = (p: Pace) => {
    setDraft({ source: data.plan, pace: p });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void data.setPace(p);
    }, 400);
  };
  useEffect(() => () => void (saveTimer.current && clearTimeout(saveTimer.current)), []);

  const finish = data.finishDate;
  const days = finish ? diffDays(new Date(), finish) : null;
  const dur = days !== null ? splitDuration(days) : null;

  return (
    <Screen>
      <AppText variant="title">{t('plan.title')}</AppText>

      <Card tone="primary">
        <AppText variant="label" muted>
          {t('plan.finish')}
        </AppText>
        {finish ? (
          <>
            <AppText variant="title" color="primary">
              {formatDate(finish, locale)}
            </AppText>
            {formatHijri(finish, locale) ? <AppText muted>{formatHijri(finish, locale)}</AppText> : null}
          </>
        ) : (
          <AppText>{t('plan.noFinish')}</AppText>
        )}
        {dur ? (
          <AppText variant="label">
            {t('plan.remainingTime')}:{' '}
            {dur.years > 0
              ? dur.months > 0
                ? t('plan.duration', { y: dur.years, m: dur.months })
                : t('plan.durationYears', { y: dur.years })
              : t('plan.durationShort', { m: dur.months, d: dur.days })}
          </AppText>
        ) : null}
      </Card>

      <PacePicker
        pace={pace}
        onChange={onPace}
        remainingTotal={data.remainingTotal}
        prayersPerDay={data.prayersPerDay}
        minutesPerQadaDay={data.profile?.minutesPerQadaDay ?? 12}
      />

      <Card>
        <Stepper
          label={t('pace.minutesPerQadaDay')}
          value={data.profile?.minutesPerQadaDay ?? 12}
          min={5}
          max={40}
          onChange={(v) => data.updateProfile({ minutesPerQadaDay: v })}
          format={(v) => nc(v, 'minute')}
        />
      </Card>
    </Screen>
  );
}
