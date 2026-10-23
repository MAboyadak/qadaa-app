import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, View } from 'react-native';

import { CountInput } from '@/components/count-input';
import { DateField } from '@/components/date-field';
import { LocationPicker, locationLabel, type PickedLocation } from '@/components/location-picker';
import { PacePicker } from '@/components/pace-picker';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, Icon, Screen, Segmented, Stepper, SwitchRow } from '@/components/ui';
import { BackupError, getEstimateInputs, saveEstimate, setPlan } from '@/db/repo';
import { addDays, addYears, fromDayKey } from '@/domain/dates';
import { estimateMissed, overlappingPeriods, MISSED_LEVELS, type EstimatePeriod, type MissedLevel } from '@/domain/estimate';
import type { Pace } from '@/domain/plan';
import { activePrayers, sumCounts, type Prayer, type PrayerCounts } from '@/domain/prayers';
import { useI18n, type Locale } from '@/i18n';
import { pickAndRestoreBackup } from '@/lib/backup';
import { requestPermission } from '@/notifications';
import { useAppData } from '@/state/app-data';
import { radius, spacing, useColors } from '@/theme';

type Step = 'language' | 'intro' | 'about' | 'periods' | 'women' | 'result' | 'pace' | 'permissions';
const LEVELS = Object.keys(MISSED_LEVELS) as MissedLevel[];

export default function Onboarding() {
  const db = useSQLiteContext();
  const data = useAppData();
  const { t, locale } = useI18n();
  const toast = useToast();
  const reestimate = useLocalSearchParams<{ mode?: string }>().mode === 'reestimate';
  const profile = data.profile;

  const [stepIndex, setStepIndex] = useState(0);
  const [gender, setGender] = useState<'m' | 'f'>(profile?.gender ?? 'm');
  const [birthDate, setBirthDate] = useState<Date>(
    profile?.birthDate ? fromDayKey(profile.birthDate) : addYears(new Date(), -30),
  );
  const [pubertyAge, setPubertyAge] = useState(profile?.pubertyAge ?? 14);
  const [includeWitr, setIncludeWitr] = useState(profile?.includeWitr ?? false);
  const [periods, setPeriods] = useState<EstimatePeriod[] | null>(null);
  const [cycleDays, setCycleDays] = useState(7);
  const [nifasDays, setNifasDays] = useState(0);
  const [counts, setCounts] = useState<PrayerCounts | null>(null);
  const [pace, setPace] = useState<Pace>({ type: 'with_each', value: 1 });
  const [place, setPlace] = useState<PickedLocation | null>(null);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  // re-estimate: start from the saved inputs
  useEffect(() => {
    if (!reestimate) return;
    getEstimateInputs(db).then((inputs) => {
      if (inputs.periods.length) {
        setPeriods(inputs.periods.map((p) => ({ ...p, start: fromDayKey(p.start), end: fromDayKey(p.end) })));
      }
      if (inputs.women) {
        setCycleDays(inputs.women.avgCycleDays);
        setNifasDays(inputs.women.nifasDaysTotal);
      }
    });
  }, [db, reestimate]);

  const pubertyDate = addYears(birthDate, pubertyAge);
  // until the user edits periods, the first one follows birth date + puberty age
  const effectivePeriods: EstimatePeriod[] = periods ?? [{ start: pubertyDate, end: new Date(), level: 'all' }];

  const steps: Step[] = useMemo(() => {
    const core: Step[] = ['about', 'periods', ...(gender === 'f' ? (['women'] as Step[]) : []), 'result'];
    return reestimate ? core : ['language', 'intro', ...core, 'pace', 'permissions'];
  }, [gender, reestimate]);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  const back = () => {
    if (stepIndex === 0) {
      if (reestimate) router.back();
      return;
    }
    setStepIndex((i) => i - 1);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stepIndex === 0 && !reestimate) return false;
      back();
      return true;
    });
    return () => sub.remove();
  });

  const computeEstimate = () =>
    estimateMissed({
      gender,
      includeWitr,
      periods: effectivePeriods,
      avgCycleDays: cycleDays,
      nifasDaysTotal: nifasDays,
    });

  const next = async () => {
    if (step === 'periods' && overlappingPeriods(effectivePeriods)) return;
    if (steps[stepIndex + 1] === 'result') setCounts(computeEstimate());
    if (!isLast) return setStepIndex((i) => i + 1);
    await finish();
  };

  const finish = async () => {
    if (!counts || overlappingPeriods(effectivePeriods)) return;
    setSaving(true);
    const prayers = activePrayers(includeWitr);
    await saveEstimate(db, effectivePeriods, gender === 'f' ? { avgCycleDays: cycleDays, nifasDaysTotal: nifasDays } : null, counts, prayers, { gender, birthDate: dayKey(birthDate), pubertyAge, includeWitr, locale });
    await data.refresh();
    if (reestimate) {
      router.back();
      return;
    }
    await setPlan(db, pace);
    const granted = notify ? await requestPermission() : false;
    await data.updateProfile(
      {
        locale,
        gender,
        birthDate: dayKey(birthDate),
        pubertyAge,
        includeWitr,
        nudgesEnabled: granted,
        ...(place ? { lat: place.lat, lng: place.lng, locationLabel: place.label, calcMethod: place.method } : {}),
        onboardedAt: new Date().toISOString(),
      },
      { reschedule: true },
    );
    router.replace('/');
  };

  const restore = async () => {
    try {
      if (await pickAndRestoreBackup(db)) {
        await data.refresh();
        await data.reschedule();
        toast({ message: t('settings.importDone') });
        router.replace('/');
      }
    } catch (e) {
      console.warn('Backup restore failed', e);
      toast({ message: e instanceof BackupError ? t('settings.importFailed') : t('common.error') });
    }
  };

  const hasOverlap = overlappingPeriods(effectivePeriods);
  const canContinue = (step !== 'periods' || !hasOverlap) && (step !== 'result' || (counts !== null && sumCounts(counts, includeWitr) > 0));

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {stepIndex > 0 || reestimate ? (
            <Button title={t('common.back')} variant="ghost" onPress={back} style={{ flex: 1 }} />
          ) : null}
          <Button
            title={
              step === 'intro'
                ? t('onboarding.intro.start')
                : isLast
                  ? reestimate
                    ? t('common.save')
                    : t('onboarding.permissions.finish')
                  : t('common.next')
            }
            onPress={next}
            disabled={!canContinue}
            loading={saving}
            style={{ flex: 2 }}
          />
        </View>
      }>
      <StepDots count={steps.length} index={stepIndex} />

      {step === 'language' ? <LanguageStep onRestore={restore} /> : null}

      {step === 'intro' ? (
        <>
          <AppText variant="title">{t('onboarding.intro.title')}</AppText>
          <AppText>{t('onboarding.intro.body')}</AppText>
          <Card tone="muted">
            <AppText variant="bodyStrong">{t('onboarding.intro.noteTitle')}</AppText>
            <AppText>{t('onboarding.intro.note')}</AppText>
            <Button title={t('onboarding.intro.sources')} variant="ghost" icon="book-open-variant" onPress={() => router.push('/sources')} />
          </Card>
        </>
      ) : null}

      {step === 'about' ? (
        <>
          <AppText variant="title">{t('onboarding.about.title')}</AppText>
          <AppText muted>{t('onboarding.about.subtitle')}</AppText>
          <Card>
            <AppText variant="label">{t('onboarding.about.gender')}</AppText>
            <Segmented
              value={gender}
              onChange={setGender}
              options={[
                { value: 'm', label: t('onboarding.about.male') },
                { value: 'f', label: t('onboarding.about.female') },
              ]}
            />
          </Card>
          <Card>
            <DateField label={t('onboarding.about.birthDate')} value={birthDate} onChange={setBirthDate} />
          </Card>
          <Card>
            <Stepper label={t('onboarding.about.pubertyAge')} value={pubertyAge} min={8} max={18} step={0.5} onChange={setPubertyAge} />
            <AppText variant="caption" muted>
              {t('onboarding.about.pubertyHint')}
            </AppText>
          </Card>
          <Card>
            <SwitchRow
              label={t('onboarding.about.witr')}
              hint={t('onboarding.about.witrHint')}
              value={includeWitr}
              onChange={setIncludeWitr}
            />
          </Card>
        </>
      ) : null}

      {step === 'periods' ? (
        <>
          <AppText variant="title">{t('onboarding.periods.title')}</AppText>
          <AppText muted>{t('onboarding.periods.subtitle')}</AppText>
          {effectivePeriods.map((p, i) => (
            <PeriodCard
              key={i}
              index={i}
              period={p}
              includeWitr={includeWitr}
              minDate={birthDate}
              onChange={(np) => setPeriods(effectivePeriods.map((x, j) => (j === i ? np : x)))}
              onRemove={i > 0 ? () => setPeriods(effectivePeriods.filter((_, j) => j !== i)) : undefined}
            />
          ))}
          {hasOverlap ? <AppText muted>{t('onboarding.periods.overlap')}</AppText> : null}
          <Button
            title={t('onboarding.periods.addPeriod')}
            icon="plus"
            variant="secondary"
            onPress={() => {
              const earliest = effectivePeriods.reduce((a, p) => p.start < a ? p.start : a, effectivePeriods[0].start);
              const end = addDays(earliest, -1);
              setPeriods([...effectivePeriods, { start: addDays(addYears(end, -1), 1), end, level: 'some' }]);
            }}
          />
        </>
      ) : null}

      {step === 'women' ? (
        <>
          <AppText variant="title">{t('onboarding.women.title')}</AppText>
          <AppText muted>{t('onboarding.women.subtitle')}</AppText>
          <Card>
            <Stepper label={t('onboarding.women.cycle')} value={cycleDays} min={0} max={15} onChange={setCycleDays} />
          </Card>
          <Card>
            <Stepper label={t('onboarding.women.nifas')} value={nifasDays} min={0} max={600} step={5} onChange={setNifasDays} />
          </Card>
        </>
      ) : null}

      {step === 'result' && counts ? (
        <ResultStep counts={counts} includeWitr={includeWitr} onChange={setCounts} />
      ) : null}

      {step === 'pace' && counts ? (
        <>
          <AppText variant="title">{t('onboarding.pace.title')}</AppText>
          <AppText muted>{t('onboarding.pace.subtitle')}</AppText>
          <PacePicker
            pace={pace}
            onChange={setPace}
            remainingTotal={sumCounts(counts, includeWitr)}
            prayersPerDay={activePrayers(includeWitr).length}
            minutesPerQadaDay={profile?.minutesPerQadaDay ?? 12}
          />
        </>
      ) : null}

      {step === 'permissions' ? (
        <>
          <AppText variant="title">{t('onboarding.permissions.title')}</AppText>
          <AppText muted>{t('onboarding.permissions.subtitle')}</AppText>
          <Card>
            {place ? (
              <AppText variant="bodyStrong" color="primary">
                {t('onboarding.permissions.locationSet', { place: locationLabel(place.label, locale, t('location.gps')) })}
              </AppText>
            ) : null}
            <LocationPicker value={place?.label ?? null} onPick={setPlace} />
          </Card>
          <Card>
            <SwitchRow
              label={t('onboarding.permissions.notifications')}
              hint={t('onboarding.permissions.notificationsHint')}
              value={notify}
              onChange={setNotify}
            />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function StepDots({ count, index }: { count: number; index: number }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: count, now: index + 1 }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= index ? c.primary : c.border }}
        />
      ))}
    </View>
  );
}

function LanguageStep({ onRestore }: { onRestore: () => void }) {
  const { locale, t } = useI18n();
  const data = useAppData();
  const c = useColors();
  const choose = (l: Locale) => data.updateProfile({ locale: l });
  return (
    <>
      <View style={{ alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxl }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: c.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="star-crescent" size={48} color={c.primary} />
        </View>
        <AppText variant="display" color="primary">
          {t('appName')}
        </AppText>
        <AppText variant="heading">{t('onboarding.language.title')}</AppText>
        <AppText muted>{t('onboarding.language.subtitle')}</AppText>
      </View>
      {(['ar', 'en'] as const).map((l) => (
        <Pressable
          key={l}
          accessibilityRole="radio"
          accessibilityState={{ selected: locale === l }}
          onPress={() => choose(l)}
          style={{
            borderRadius: radius.lg,
            borderWidth: 2,
            borderColor: locale === l ? c.primary : c.border,
            backgroundColor: locale === l ? c.primarySoft : c.surface,
            padding: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}>
          <Icon name={locale === l ? 'radiobox-marked' : 'radiobox-blank'} color={c.primary} />
          <AppText variant="heading">{l === 'ar' ? 'العربية' : 'English'}</AppText>
        </Pressable>
      ))}
      <Button title={t('onboarding.language.restore')} variant="ghost" icon="backup-restore" onPress={onRestore} />
    </>
  );
}

function PeriodCard({
  index,
  period,
  includeWitr,
  minDate,
  onChange,
  onRemove,
}: {
  index: number;
  period: EstimatePeriod;
  includeWitr: boolean;
  minDate: Date;
  onChange: (p: EstimatePeriod) => void;
  onRemove?: () => void;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(!!period.perPrayer);
  const levelOptions = LEVELS.map((l) => ({ value: l, label: t(`levels.${l}`) }));

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppText variant="heading" style={{ flex: 1 }}>
          {t('onboarding.periods.period', { n: index + 1 })}
        </AppText>
        {onRemove ? <Button title={t('common.remove')} variant="ghost" onPress={onRemove} /> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <DateField
          label={t('onboarding.periods.from')}
          value={period.start}
          minimumDate={minDate}
          maximumDate={period.end}
          onChange={(start) => onChange({ ...period, start })}
        />
        <DateField
          label={t('onboarding.periods.to')}
          value={period.end}
          minimumDate={period.start}
          onChange={(end) => onChange({ ...period, end })}
        />
      </View>
      <AppText variant="label">{t('onboarding.periods.howMuch')}</AppText>
      <Segmented value={period.level} onChange={(level) => onChange({ ...period, level })} options={levelOptions} />
      <Button
        title={t('onboarding.periods.perPrayer')}
        variant="ghost"
        icon={expanded ? 'chevron-up' : 'chevron-down'}
        onPress={() => setExpanded((v) => !v)}
      />
      {expanded ? (
        <View style={{ gap: spacing.md }}>
          <AppText variant="caption" muted>
            {t('onboarding.periods.perPrayerHint')}
          </AppText>
          {activePrayers(includeWitr).map((p: Prayer) => (
            <View key={p} style={{ gap: spacing.xs }}>
              <AppText variant="label">{t(`prayers.${p}`)}</AppText>
              <Segmented
                value={period.perPrayer?.[p] ?? period.level}
                onChange={(level) => onChange({ ...period, perPrayer: { ...period.perPrayer, [p]: level } })}
                options={levelOptions}
              />
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function ResultStep({
  counts,
  includeWitr,
  onChange,
}: {
  counts: PrayerCounts;
  includeWitr: boolean;
  onChange: (c: PrayerCounts) => void;
}) {
  const { t, np, nc } = useI18n();
  const prayers = activePrayers(includeWitr);
  const total = sumCounts(counts, includeWitr);
  const days = Math.ceil(total / prayers.length);
  return (
    <>
      <AppText variant="title">{t('onboarding.result.title')}</AppText>
      <AppText muted>{t('onboarding.result.subtitle')}</AppText>
      <Card tone="primary" style={{ alignItems: 'center' }}>
        <AppText variant="title" color="primary" center>
          {t('onboarding.result.total', { days: nc(days, 'day') })}
        </AppText>
        <AppText muted>{t('onboarding.result.totalPrayers', { n: np(total) })}</AppText>
      </Card>
      <Card>
        {prayers.map((p) => (
          <CountInput key={p} label={t(`prayers.${p}`)} value={counts[p]} onChange={(v) => onChange({ ...counts, [p]: v })} />
        ))}
      </Card>
      <Card tone="accent">
        <AppText>{t('onboarding.result.reassure')}</AppText>
      </Card>
    </>
  );
}
