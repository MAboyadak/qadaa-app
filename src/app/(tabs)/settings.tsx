import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { pickTime } from '@/components/date-field';
import { LocationPicker, locationLabel } from '@/components/location-picker';
import { useToast } from '@/components/toast';
import {
  AppText,
  Button,
  Card,
  Divider,
  IconButton,
  ListRow,
  Screen,
  Segmented,
  SectionTitle,
  Stepper,
  SwitchRow,
} from '@/components/ui';
import { addDhikrReminder, BackupError, removeDhikrReminder, setDebt } from '@/db/repo';
import type { Locale } from '@/i18n';
import { useI18n } from '@/i18n';
import { pickAndRestoreBackup, shareBackup } from '@/lib/backup';
import { estimateFromStored } from '@/lib/estimate-store';
import { formatTime } from '@/lib/format';
import { CALC_METHODS } from '@/lib/prayer-times';
import { hasExactAlarms, requestExactAlarms, requestPermission, sendTestNudge } from '@/notifications';
import { useAppData } from '@/state/app-data';
import { spacing } from '@/theme';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const data = useAppData();
  const { t, locale, nc } = useI18n();
  const toast = useToast();
  const profile = data.profile!;
  const [showLocation, setShowLocation] = useState(false);
  const [exact, setExact] = useState(true);

  useEffect(() => {
    hasExactAlarms().then(setExact);
  }, []);

  const enableExact = async () => {
    const granted = await requestExactAlarms();
    setExact(granted);
    if (granted) await data.reschedule();
  };

  const testNudge = async () => {
    if (!(await requestPermission())) return;
    await sendTestNudge(locale);
    toast({ message: t('settings.testSent'), durationMs: 3000 });
  };

  const setLocale = (next: Locale) => {
    if (next === locale) return;
    data.updateProfile({ locale: next }, { reschedule: true });
  };

  const setWitr = async (on: boolean) => {
    if (on && data.summary.debt.witr === 0) {
      const counts = await estimateFromStored(db, true);
      if (counts) await setDebt(db, counts, ['witr']);
    }
    await data.updateProfile({ includeWitr: on });
  };

  const addReminder = () =>
    pickTime('21:00', async (hhmm) => {
      if (!(await requestPermission())) return;
      await addDhikrReminder(db, hhmm, null);
      await data.refresh();
      await data.reschedule();
    });

  const removeReminder = async (id: number) => {
    await removeDhikrReminder(db, id);
    await data.refresh();
    await data.reschedule();
  };

  const onImport = () =>
    Alert.alert(t('settings.import'), t('settings.importWarn'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (await pickAndRestoreBackup(db)) {
              await data.refresh();
              await data.reschedule();
              toast({ message: t('settings.importDone') });
            }
          } catch (e) {
            console.warn('Backup restore failed', e);
            toast({ message: e instanceof BackupError ? t('settings.importFailed') : t('common.error') });
          }
        },
      },
    ]);

  const onReestimate = () =>
    Alert.alert(t('settings.reestimate'), t('settings.reestimateWarn'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), onPress: () => router.push('/onboarding?mode=reestimate') },
    ]);

  const timeLabel = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return formatTime(d, locale);
  };

  return (
    <Screen>
      <AppText variant="title">{t('settings.title')}</AppText>

      <Card>
        <AppText variant="heading">{t('settings.language')}</AppText>
        <Segmented<Locale>
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' },
          ]}
        />
        <Divider />
        <SwitchRow label={t('settings.witr')} hint={t('onboarding.about.witrHint')} value={profile.includeWitr} onChange={setWitr} />
      </Card>

      <SectionTitle>{t('settings.location')}</SectionTitle>
      <Card>
        <ListRow
          icon="map-marker-outline"
          label={t('settings.location')}
          value={locationLabel(profile.locationLabel, locale, t('location.gps'))}
          onPress={() => setShowLocation((v) => !v)}
        />
        {showLocation ? (
          <LocationPicker
            value={profile.locationLabel}
            onPick={(l) => {
              setShowLocation(false);
              data.updateProfile({ lat: l.lat, lng: l.lng, locationLabel: l.label, calcMethod: l.method }, { reschedule: true });
            }}
          />
        ) : null}
        <Divider />
        <AppText variant="label" muted>
          {t('settings.method')}
        </AppText>
        <Segmented
          value={profile.calcMethod}
          onChange={(m) => data.updateProfile({ calcMethod: m }, { reschedule: true })}
          options={CALC_METHODS.map((m) => ({ value: m, label: t(`methods.${m}`) }))}
        />
      </Card>

      <SectionTitle>{t('settings.reminders')}</SectionTitle>
      <Card>
        <SwitchRow
          label={t('settings.qadaNudges')}
          hint={t('settings.quietHint')}
          value={profile.nudgesEnabled}
          onChange={async (on) => {
            if (on && !(await requestPermission())) return;
            data.updateProfile({ nudgesEnabled: on }, { reschedule: true });
          }}
        />
        {profile.nudgesEnabled ? (
          <Stepper
            label={t('settings.nudgeOffset')}
            value={profile.nudgeOffsetMin}
            min={5}
            max={90}
            step={5}
            format={(v) => nc(v, 'minute')}
            onChange={(v) => data.updateProfile({ nudgeOffsetMin: v }, { reschedule: true })}
          />
        ) : null}
        {profile.nudgesEnabled ? (
          <SwitchRow label={t('settings.exact')} hint={t('settings.exactHint')} value={exact} onChange={(on) => on && enableExact()} />
        ) : null}
        <Button title={t('settings.test')} icon="bell-ring-outline" variant="ghost" onPress={testNudge} />
        <Divider />
        <AppText variant="bodyStrong">{t('settings.dhikr')}</AppText>
        {data.dhikr.map((r) => (
          <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <AppText style={{ flex: 1 }}>{timeLabel(r.timeOfDay)}</AppText>
            <IconButton icon="trash-can-outline" variant="plain" label={t('common.remove')} onPress={() => removeReminder(r.id)} />
          </View>
        ))}
        <Button title={t('settings.dhikrAdd')} icon="bell-plus-outline" variant="secondary" onPress={addReminder} />
      </Card>

      <SectionTitle>{t('settings.data')}</SectionTitle>
      <Card>
        <ListRow icon="pencil-outline" label={t('settings.adjust')} onPress={() => router.push('/adjust')} />
        <ListRow icon="calculator-variant-outline" label={t('settings.reestimate')} onPress={onReestimate} />
        <ListRow icon="export-variant" label={t('settings.export')} onPress={() => shareBackup(db, t('settings.backupTitle')).catch((e) => {
          console.warn('Backup export failed', e);
          toast({ message: t('common.error') });
        })} />
        <ListRow icon="import" label={t('settings.import')} onPress={onImport} />
      </Card>

      <SectionTitle>{t('settings.about')}</SectionTitle>
      <Card>
        <ListRow icon="book-open-variant" label={t('settings.sources')} onPress={() => router.push('/sources')} />
        <Divider />
        <AppText variant="bodyStrong">{t('settings.dedication')}</AppText>
        <AppText muted>{t('settings.dedicationBody')}</AppText>
        <AppText variant="caption" muted>
          {t('settings.privacy')}
        </AppText>
        <AppText variant="caption" muted>
          {t('settings.disclaimer')}
        </AppText>
        <AppText variant="caption" muted>
          {t('settings.version', { v: Constants.expoConfig?.version ?? '1.0.0' })}
        </AppText>
      </Card>
    </Screen>
  );
}
