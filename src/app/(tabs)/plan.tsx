import { useEffect, useRef, useState } from 'react';

import { PacePicker } from '@/components/pace-picker';
import { AppText, Card, Screen, Stepper } from '@/components/ui';
import { diffDays } from '@/domain/dates';
import { reconcilePaceDraft, type PaceDraft } from '@/domain/pace-draft';
import { splitDuration, type Pace } from '@/domain/plan';
import { useI18n } from '@/i18n';
import { formatDate, formatHijri } from '@/lib/format';
import { useAppData } from '@/state/app-data';

export default function PlanScreen() {
  const data = useAppData();
  const { t, locale, nc } = useI18n();
  const [draft, setDraft] = useState<PaceDraft>({
    source: data.plan, pace: data.plan, local: [], externalRevision: 0,
  });
  const current = reconcilePaceDraft(draft, data.plan);
  if (current !== draft) setDraft(current);
  const pace = current.pace ?? { type: 'with_each' as const, value: 1 };
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; save: () => void } | null>(null);

  // Only external changes cancel a draft; fresh objects and save acknowledgements do not.
  useEffect(() => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
  }, [current.externalRevision]);

  const onPace = (p: Pace) => {
    setDraft((previous) => ({ ...previous, pace: p, local: [...previous.local, p] }));
    if (pending.current) clearTimeout(pending.current.timer);
    const save = () => { void data.setPace(p); };
    const timer = setTimeout(() => {
      pending.current = null;
      save();
    }, 400);
    pending.current = { timer, save };
  };
  useEffect(() => () => {
    if (pending.current) {
      clearTimeout(pending.current.timer);
      pending.current.save();
      pending.current = null;
    }
  }, []);

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
