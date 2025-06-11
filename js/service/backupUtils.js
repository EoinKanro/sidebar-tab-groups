import {getAllGroups} from "../data/databaseStorage.js";
import {
  getBackupMinutes,
  getEnableBackup,
  getEnableDebugLogs,
  getSidebarButtonsPaddingPx,
  getTabsBehaviorOnChangeGroup,
  saveLastBackupTime
} from "../data/localStorage.js";

export async function backupGroups() {
  console.log("Backupping to downloads...")
  const allGroups = await getAllGroups();
  const enableBackup = await getEnableBackup();
  const backupMinutes = await getBackupMinutes();
  const sidebarButtonsPaddingPx = await getSidebarButtonsPaddingPx();
  const tabsBehaviorOnChangeGroup = await getTabsBehaviorOnChangeGroup();
  const enableDebugLogs = await getEnableDebugLogs();

  const result = {
    allGroups: allGroups,
    enableBackup: enableBackup,
    backupMinutes: backupMinutes,
    sidebarButtonsPaddingPx: sidebarButtonsPaddingPx,
    tabsBehaviorOnChangeGroup: tabsBehaviorOnChangeGroup,
    enableDebugLogs: enableDebugLogs
  }

  const blob = new Blob([JSON.stringify(result)], {type: 'text/plain'});

  const url = URL.createObjectURL(blob);
  const now = new Date().getTime();

  const name = `SidebarTabGroups/${now}.json`;

  let error;

  // Use the downloads API to create the file in the Downloads folder
  await browser.downloads.download({
    url: url,
    filename: name,
    saveAs: false  // Ask where to save the file
  }).then(async (downloadId) => {
    console.log(`Saved new backup: ${name}`);
    await saveLastBackupTime(now);
  }).catch((e) => {
    console.error(`Error on backup: ${error}`);
    error = e;
  });

  return !error;
}
