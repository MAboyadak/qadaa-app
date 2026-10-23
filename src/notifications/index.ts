import { AndroidImportance } from 'expo-notifications';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import adhkar from '@/content/adhkar.json';
import { getDhikrReminders, getProfile, getSummary, logMadeUp } from '@/db/repo';
import { addDays } from '@/domain/dates';
import { FARD_PRAYERS, isPrayer } from '@/domain/prayers';
import { translate } from '@/i18n';
import { prayerTimesFor } from '@/lib/prayer-times';

export const CHANNEL_QADA = 'qada';
export const CHANNEL_DHIKR = 'dhikr';
export const CATEGORY_QADA = 'qada_nudge';
export const ACTION_DONE = 'qada_done';
export const ACTION_LATER = 'qada_later';
/** Days of prayer-time nudges scheduled ahead; refreshed every time the app opens. */
const DAYS_AHEAD = 7;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Channels and the action-button category. Safe to call repeatedly (names update with locale). */
export async function setupNotifications(locale: 'ar' | 'en'): Promise<void> {
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k);
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_QADA, {
      name: t('notifications.channelQada'),
      importance: AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_DHIKR, {
      name: t('notifications.channelDhikr'),
      importance: AndroidImportance.DEFAULT,
    });
  }
  await Notifications.setNotificationCategoryAsync(CATEGORY_QADA, [
    { identifier: ACTION_DONE, buttonTitle: t('notifications.actionDone'), options: { opensAppToForeground: false } },
    { identifier: ACTION_LATER, buttonTitle: t('notifications.actionLater'), options: { opensAppToForeground: false } },
  ]);
}

export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

/** Exact alarms keep prayer-time nudges on time (Android 12+ may otherwise delay them ~1h). */
export async function hasExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  return (await Notifications.getExactAlarmPermissionsAsync()).granted;
}

export async function requestExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  return (await Notifications.requestExactAlarmPermissionsAsync()).granted;
}

/** A qada nudge in a few seconds, so users can check reminders work on their phone. */
export async function sendTestNudge(locale: 'ar' | 'en'): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: translate(locale, 'notifications.qadaTitle', { prayer: translate(locale, 'prayers.dhuhr') }),
      body: translate(locale, 'notifications.qadaBody'),
      data: { kind: 'test' },
      categoryIdentifier: CATEGORY_QADA,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_QADA },
  });
}

export async function hasPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Cancels and re-creates every scheduled notification from the current settings. */
let rescheduleQueue: Promise<unknown> = Promise.resolve();

/**
 * Serialized: each run cancels everything and schedules again, so two overlapping runs
 * (e.g. logging several prayers quickly) could leave duplicate or stale reminders.
 */
export function rescheduleAll(db: SQLiteDatabase, now = new Date()): Promise<number> {
  const run = rescheduleQueue.then(() => rescheduleNow(db, now));
  rescheduleQueue = run.catch(() => undefined);
  return run;
}

async function rescheduleNow(db: SQLiteDatabase, now: Date): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const profile = await getProfile(db);
  if (!profile?.onboardedAt || !(await hasPermission())) return 0;

  const { remaining } = await getSummary(db);
  const locale = profile.locale;
  let count = 0;

  if (profile.nudgesEnabled && profile.lat != null && profile.lng != null) {
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const day = addDays(now, i);
      const times = prayerTimesFor(day, profile.lat, profile.lng, profile.calcMethod);
      for (const prayer of FARD_PRAYERS) {
        if (remaining[prayer] === 0) continue;
        const at = new Date(times[prayer].getTime() + profile.nudgeOffsetMin * 60_000);
        if (at <= now) continue;
        const name = translate(locale, `prayers.${prayer}`);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: translate(locale, 'notifications.qadaTitle', { prayer: name }),
            body: translate(locale, 'notifications.qadaBody'),
            data: { kind: 'qada', prayer },
            categoryIdentifier: CATEGORY_QADA,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_QADA },
        });
        count++;
      }
    }
  }

  const reminders = await getDhikrReminders(db);
  for (const [index, r] of reminders.filter((x) => x.enabled).entries()) {
    const [hour, minute] = r.timeOfDay.split(':').map(Number);
    const item = adhkar.items.find((a) => a.id === r.dhikrId) ?? adhkar.items[index % adhkar.items.length];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: translate(locale, 'notifications.dhikrTitle'),
        body: locale === 'ar' ? item.ar : `${item.ar}\n${item.en}`,
        data: { kind: 'dhikr', id: item.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_DHIKR },
    });
    count++;
  }
  return count;
}

/**
 * The background task receives Android's raw payload, where a local notification's
 * data arrives as a JSON `dataString`; only the foreground listener maps it to `data`.
 */
function responseData(content: Notifications.NotificationContent): { kind?: string; prayer?: string } | undefined {
  if (content.data) return content.data as { kind?: string; prayer?: string };
  const raw = (content as { dataString?: unknown }).dataString;
  if (typeof raw !== 'string') return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Handles a notification response (foreground listener or background task).
 * Identifies prayer actions even when another handler already logged them.
 */
export async function handleResponse(
  db: SQLiteDatabase,
  response: Pick<Notifications.NotificationResponse, 'actionIdentifier' | 'notification'>,
): Promise<{ logged: boolean; prayerAction: boolean }> {
  const data = responseData(response.notification.request.content);
  if (response.actionIdentifier !== ACTION_DONE || data?.kind !== 'qada' || !data.prayer || !isPrayer(data.prayer)) {
    if (response.actionIdentifier === ACTION_DONE || response.actionIdentifier === ACTION_LATER) {
      await Notifications.dismissNotificationAsync(response.notification.request.identifier);
    }
    return { logged: false, prayerAction: false };
  }
  const id = response.notification.request.identifier;
  // Both the background task and the foreground listener may see the same response.
  const source = `notif:${id}`;
  const logged = await logMadeUp(db, data.prayer, source);
  if (logged) {
    try {
      await rescheduleAll(db);
    } catch (e) {
      console.warn('reschedule failed', e);
    }
  }
  await Notifications.dismissNotificationAsync(id);
  return { logged, prayerAction: true };
}
