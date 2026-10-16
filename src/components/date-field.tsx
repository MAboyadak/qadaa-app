import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { useI18n } from '@/i18n';
import { formatDate } from '@/lib/format';
import { radius, spacing, touchTarget, useColors } from '@/theme';

import { AppText, Icon } from './ui';

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate = new Date(),
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const c = useColors();
  const { locale } = useI18n();
  const [iosOpen, setIosOpen] = useState(false);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(date);
        },
      });
    } else {
      setIosOpen((v) => !v);
    }
  };

  return (
    <View style={{ gap: spacing.xs, flex: 1 }}>
      <AppText variant="label" muted>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDate(value, locale)}`}
        onPress={open}
        style={{
          minHeight: touchTarget,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
          paddingHorizontal: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}>
        <Icon name="calendar-month-outline" color={c.primary} size={20} />
        <AppText style={{ flex: 1 }} numberOfLines={1}>
          {formatDate(value, locale)}
        </AppText>
      </Pressable>
      {iosOpen && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="inline"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(_, d) => d && onChange(d)}
        />
      ) : null}
    </View>
  );
}

/** Opens a native time picker (Android dialog) and returns `HH:MM`. */
export function pickTime(initial: string, onPick: (hhmm: string) => void) {
  const [h, m] = initial.split(':').map(Number);
  const value = new Date();
  value.setHours(h, m, 0, 0);
  DateTimePickerAndroid.open({
    value,
    mode: 'time',
    is24Hour: false,
    onChange: (event, date) => {
      if (event.type === 'set' && date) {
        onPick(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
      }
    },
  });
}
