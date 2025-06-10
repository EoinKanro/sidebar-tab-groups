
//----------------------------------------------------------
//--------------------- Temp Data --------------------------
//----------------------------------------------------------

const lastBackupTimeName = "lastBackupTime";
export const groupToEditIdName = "groupToEditId";
export const updatedGroupName = "updatedGroup";
export const deletedGroupName = "deletedGroup";
export const windowIdGroupIdName = "windowIdGroupId";

//----------------------- Backup ---------------------------
export async function saveLastBackupTime(time) {
  await saveToLocalStorage(lastBackupTimeName, time);
}

export async function getLastBackupTime() {
  return await getFromLocalStorage(lastBackupTimeName)
}

//------------------ Group to edit id -------------------
export async function saveGroupToEditId(groupId) {
  await saveToLocalStorage(groupToEditIdName, groupId);
}

export async function getGroupToEditId() {
  return await getFromLocalStorage(groupToEditIdName);
}

//------------------ Updated group --------------------
export async function saveUpdatedGroup(changes, group) {
  return await saveToLocalStorage(updatedGroupName, new UpdatedTabsGroup(changes, group));
}

//------------------ Deleted group --------------------
export async function saveDeletedGroup(groupId) {
  return await saveToLocalStorage(deletedGroupName, new UpdatedTabsGroup(null, groupId));
}

//---------------- Window Id Group Id -----------------
export async function saveWindowIdGroupId(idMap) {
  await saveToLocalStorage(windowIdGroupIdName, idMap);
}

export async function getWindowIdGroupId() {
  return await getFromLocalStorage(windowIdGroupIdName);
}

export async function deleteWindowIdGroupId() {
  await saveToLocalStorage(windowIdGroupIdName, null);
}

//----------------------------------------------------------
//---------------------- Settings --------------------------
//----------------------------------------------------------

const enableBackupName = "enableBackup";
const backupMinutesName = "backupMinutes";
const tabsBehaviorOnChangeGroupName = "tabsBehaviorOnChangeGroup";
export const sidebarButtonsPaddingPxName = "sidebarButtonsPaddingPx";
export const enableDebugLogsName = "enableLogs";

//---------------------- Backup -----------------------
export async function getEnableBackup() {
  return await getFromLocalStorage(enableBackupName);
}

export async function saveEnableBackup(enableBackup) {
  await saveToLocalStorage(enableBackupName, enableBackup);
}

export async function getBackupMinutes() {
  return await getFromLocalStorage(backupMinutesName)
}

export async function saveBackupMinutes(minutes) {
  await saveToLocalStorage(backupMinutesName, minutes);
}

//---------------------- Style ---------------------------
export async function getSidebarButtonsPaddingPx() {
  return await getFromLocalStorage(sidebarButtonsPaddingPxName);
}

export async function saveSidebarButtonsPaddingPx(px) {
  await saveToLocalStorage(sidebarButtonsPaddingPxName, px);
}

//------------------------ Tabs ---------------------------
export async function getTabsBehaviorOnChangeGroup() {
  return await getFromLocalStorage(tabsBehaviorOnChangeGroupName);
}

export async function saveTabsBehaviorOnChangeGroup(str) {
  await saveToLocalStorage(tabsBehaviorOnChangeGroupName, str);
}

//--------------------- Enable logs ------------------------
export async function getEnableDebugLogs() {
  return await getFromLocalStorage(enableDebugLogsName);
}

export async function saveEnableDebugLogs(bool) {
  await saveToLocalStorage(enableDebugLogsName, bool);
}

//----------------------------------------------------------
//----------------------- Utils ----------------------------
//----------------------------------------------------------

async function getFromLocalStorage(key) {
  console.log(`Getting ${key} from local storage...`);
  return (await browser.storage.local.get(key))[key];
}

async function saveToLocalStorage(key, value) {
  console.log(`Saving ${key} to local storage...`, value);
  await browser.storage.local.set({ [key]: value });
}


export class UpdatedTabsGroup {
  constructor(changes = [], data = {}) {
    this.changes = changes;
    this.data = data;
    this.date = new Date().getTime();
  }
}
