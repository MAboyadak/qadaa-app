import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';
import { radius, spacing, touchTarget, type, useColors, type Colors, type TypeVariant } from '@/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const c = useColors();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? c.text} />;
}

export function AppText({
  variant = 'body',
  color,
  muted,
  center,
  style,
  children,
  numberOfLines,
}: {
  variant?: TypeVariant;
  color?: keyof Colors;
  muted?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  const c = useColors();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        type[variant],
        { color: color ? c[color] : muted ? c.textMuted : c.text },
        center && { textAlign: 'center' },
        style,
      ]}>
      {children}
    </Text>
  );
}

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  footer,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const content = [{ padding: spacing.lg, gap: spacing.lg }, contentStyle];
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.background }}>
      {scroll ? (
        <ScrollView contentContainerStyle={[content, { paddingBottom: spacing.xxxl }]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, content]}>{children}</View>
      )}
      {footer ? <View style={{ padding: spacing.lg, gap: spacing.sm }}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  tone = 'surface',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'primary' | 'accent' | 'muted';
}) {
  const c = useColors();
  const bg = { surface: c.surface, primary: c.primarySoft, accent: c.accentSoft, muted: c.surfaceMuted }[tone];
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius.lg,
          padding: spacing.lg,
          gap: spacing.sm,
          borderWidth: tone === 'surface' ? 1 : 0,
          borderColor: c.border,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const fg = variant === 'primary' ? c.onPrimary : c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: touchTarget + 4,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.xl,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          opacity: disabled ? 0.45 : 1,
          backgroundColor:
            variant === 'primary' ? (pressed ? c.primaryPressed : c.primary) : variant === 'secondary' ? c.primarySoft : 'transparent',
        },
        pressed && variant !== 'primary' && { opacity: 0.7 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} color={fg} size={20} /> : null}
      <Text style={[type.bodyStrong, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  variant = 'soft',
  size = touchTarget,
  disabled,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  variant?: 'solid' | 'soft' | 'plain';
  size?: number;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.75 : 1,
        backgroundColor: variant === 'solid' ? c.primary : variant === 'soft' ? c.primarySoft : 'transparent',
      })}>
      <Icon name={icon} color={variant === 'solid' ? c.onPrimary : c.primary} size={size * 0.5} />
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={{
              minHeight: 40,
              paddingHorizontal: spacing.lg,
              borderRadius: radius.pill,
              justifyContent: 'center',
              backgroundColor: selected ? c.primary : c.surfaceMuted,
            }}>
            <Text style={[type.label, { color: selected ? c.onPrimary : c.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  label,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  format?: (v: number) => string;
}) {
  const { n } = useI18n();
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
  return (
    <View style={{ gap: spacing.sm }}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <IconButton icon="minus" label="-" disabled={value <= min} onPress={() => onChange(clamp(value - step))} />
        <AppText variant="title" style={{ minWidth: 72 }} center>
          {format ? format(value) : n(value)}
        </AppText>
        <IconButton icon="plus" label="+" disabled={value >= max} onPress={() => onChange(clamp(value + step))} />
      </View>
    </View>
  );
}

export function SwitchRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touchTarget }}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? <AppText variant="caption" muted>{hint}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: c.primary, false: c.border }}
        thumbColor={c.surface}
        accessibilityLabel={label}
      />
    </View>
  );
}

export function ListRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon?: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const c = useColors();
  const { rtl } = useI18n();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: touchTarget,
        opacity: pressed ? 0.6 : 1,
      })}>
      {icon ? <Icon name={icon} color={c.primary} /> : null}
      <AppText style={{ flex: 1 }}>{label}</AppText>
      {value ? <AppText muted>{value}</AppText> : null}
      {onPress ? <Icon name={rtl ? 'chevron-left' : 'chevron-right'} color={c.textMuted} /> : null}
    </Pressable>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: 1, backgroundColor: c.border }} />;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <AppText variant="label" muted style={{ marginTop: spacing.sm }}>
      {children}
    </AppText>
  );
}
