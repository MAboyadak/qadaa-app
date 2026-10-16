import { getLocales } from 'expo-localization';
import { useState } from 'react';
import { View } from 'react-native';

import { useI18n } from '@/i18n';
import { currentCoords } from '@/lib/location';
import { CITIES, methodForRegion, type CalcMethod } from '@/lib/prayer-times';
import { spacing } from '@/theme';

import { AppText, Button, Segmented } from './ui';

export interface PickedLocation {
  lat: number;
  lng: number;
  label: string;
  method: CalcMethod;
}

/** GPS button + bundled city list. Method defaults from the city or the device region. */
export function LocationPicker({ value, onPick }: { value: string | null; onPick: (l: PickedLocation) => void }) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const useGps = async () => {
    setBusy(true);
    setFailed(false);
    const coords = await currentCoords();
    setBusy(false);
    if (!coords) return setFailed(true);
    onPick({ ...coords, label: 'gps', method: methodForRegion(getLocales()[0]?.regionCode) });
  };

  const selectedCity = CITIES.find((c) => c.id === value)?.id ?? '';

  return (
    <View style={{ gap: spacing.md }}>
      <Button
        title={t('onboarding.permissions.useLocation')}
        icon="crosshairs-gps"
        variant={value === 'gps' ? 'primary' : 'secondary'}
        loading={busy}
        onPress={useGps}
      />
      {failed ? <AppText color="accent">{t('onboarding.permissions.locationFailed')}</AppText> : null}
      <AppText variant="label" muted>
        {t('onboarding.permissions.orCity')}
      </AppText>
      <Segmented
        value={selectedCity}
        onChange={(id) => {
          const city = CITIES.find((c) => c.id === id)!;
          onPick({ lat: city.lat, lng: city.lng, label: city.id, method: city.method });
        }}
        options={CITIES.map((c) => ({ value: c.id, label: locale === 'ar' ? c.ar : c.en }))}
      />
    </View>
  );
}

export function locationLabel(label: string | null, locale: 'ar' | 'en', gpsText: string): string {
  if (!label) return '—';
  if (label === 'gps') return gpsText;
  const city = CITIES.find((c) => c.id === label);
  return city ? (locale === 'ar' ? city.ar : city.en) : label;
}
