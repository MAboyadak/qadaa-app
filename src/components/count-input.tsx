import { TextInput, View } from 'react-native';

import { useI18n } from '@/i18n';
import { radius, spacing, type, useColors } from '@/theme';

import { AppText } from './ui';

/** Numeric field that accepts both Arabic-Indic and Latin digits. */
export function CountInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const c = useColors();
  const { locale } = useI18n();
  const shown = locale === 'ar' ? String(value).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]) : String(value);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 }}>
      <AppText variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        keyboardType="number-pad"
        selectTextOnFocus
        value={shown}
        onChangeText={(text) => {
          const latin = text.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
          const num = parseInt(latin.replace(/\D/g, ''), 10);
          onChange(Number.isFinite(num) ? num : 0);
        }}
        style={[
          type.heading,
          {
            minWidth: 120,
            textAlign: 'center',
            color: c.text,
            backgroundColor: c.surfaceMuted,
            borderRadius: radius.md,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
          },
        ]}
      />
    </View>
  );
}
