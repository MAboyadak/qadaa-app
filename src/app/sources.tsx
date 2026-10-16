import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { AppText, Button, Card, ListRow, Screen } from '@/components/ui';
import { SOURCES } from '@/content/sources';
import { useI18n } from '@/i18n';

export default function SourcesScreen() {
  const { t, locale } = useI18n();
  return (
    <Screen
      edges={['top', 'bottom']}
      footer={<Button title={t('common.close')} variant="secondary" onPress={() => router.back()} />}>
      <AppText variant="title">{t('sources.title')}</AppText>
      <AppText muted>{t('sources.intro')}</AppText>
      <Card tone="muted">
        <AppText variant="bodyStrong">{t('onboarding.intro.noteTitle')}</AppText>
        <AppText>{t('onboarding.intro.note')}</AppText>
      </Card>
      <Card>
        {SOURCES.map((s) => (
          <ListRow
            key={s.id}
            icon="link-variant"
            label={locale === 'ar' ? s.ar : s.en}
            onPress={() => WebBrowser.openBrowserAsync(s.url)}
          />
        ))}
      </Card>
      <AppText variant="caption" muted>
        {t('settings.disclaimer')}
      </AppText>
    </Screen>
  );
}
