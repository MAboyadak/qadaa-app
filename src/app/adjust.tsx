import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { CountInput } from '@/components/count-input';
import { AppText, Button, Card, Screen } from '@/components/ui';
import { setRemaining } from '@/db/repo';
import type { PrayerCounts } from '@/domain/prayers';
import { useI18n } from '@/i18n';
import { useAppData } from '@/state/app-data';

export default function AdjustScreen() {
  const db = useSQLiteContext();
  const data = useAppData();
  const { t } = useI18n();
  const [values, setValues] = useState<PrayerCounts>({ ...data.summary.remaining });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const patch = Object.fromEntries(data.prayers.map((p) => [p, values[p]]));
    await setRemaining(db, patch);
    await data.refresh();
    await data.reschedule();
    router.back();
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <>
          <Button title={t('common.save')} onPress={save} loading={saving} />
          <Button title={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
        </>
      }>
      <AppText variant="title">{t('adjust.title')}</AppText>
      <AppText muted>{t('adjust.subtitle')}</AppText>
      <Card>
        {data.prayers.map((p) => (
          <CountInput
            key={p}
            label={t(`prayers.${p}`)}
            value={values[p]}
            onChange={(v) => setValues((s) => ({ ...s, [p]: v }))}
          />
        ))}
      </Card>
    </Screen>
  );
}
