import * as Notifications from 'expo-notifications';
import { openDatabaseAsync } from 'expo-sqlite';
import * as TaskManager from 'expo-task-manager';

import { DATABASE_NAME, migrate } from '@/db/schema';

import { handleResponse } from './index';

/**
 * Lets the "Prayed it ✓" notification button log a prayer while the app is
 * backgrounded or killed (Android). Must be imported from the entry file.
 */
export const BACKGROUND_NOTIFICATION_TASK = 'qadaa-notification-response';

TaskManager.defineTask<Notifications.NotificationTaskPayload>(BACKGROUND_NOTIFICATION_TASK, async ({ data }) => {
  if (!data || !('actionIdentifier' in data)) return;
  const db = await openDatabaseAsync(DATABASE_NAME);
  await migrate(db);
  await handleResponse(db, data);
});

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(() => {
  // Not available in Expo Go; the foreground listener still handles taps.
});
