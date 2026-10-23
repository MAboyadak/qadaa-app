import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { exportBackup, importBackup } from '@/db/repo';
import { toDayKey } from '@/domain/dates';

/** Writes a JSON backup to the cache and opens the share sheet (Drive, WhatsApp, Files…). */
export async function shareBackup(db: SQLiteDatabase, dialogTitle: string): Promise<void> {
  const file = new File(Paths.cache, `qadaa-backup-${toDayKey(new Date())}.json`);
  if (file.exists) file.delete();
  file.create();
  await file.write(await exportBackup(db));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle });
}

/** Lets the user pick a backup file and restores it. Returns false if the user cancelled. */
export async function pickAndRestoreBackup(db: SQLiteDatabase): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return false;
  const json = await new File(result.assets[0].uri).text();
  await importBackup(db, json);
  return true;
}
