import {UpdatedTabsGroup} from "./tabs.js";

//----------------------------------------------------------
//--------------------- Temp Data --------------------------
//----------------------------------------------------------

const lastBackupTimeName = "lastBackupTime";
export const groupToEditIdName = "groupToEditId";
export const updatedGroupName = "updatedGroup";
export const deletedGroupName = "deletedGroup";

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
export async function saveUpdatedGroup(groupId) {
  return await saveToLocalStorage(updatedGroupName, new UpdatedTabsGroup(groupId));
}

//------------------ Deleted group --------------------
export async function saveDeletedGroup(groupId) {
  return await saveToLocalStorage(deletedGroupName, new UpdatedTabsGroup(groupId));
}

//----------------------------------------------------------
//---------------------- Settings --------------------------
//----------------------------------------------------------

const enableBackupName = "enableBackup";
const backupMinutesName = "backupMinutes";
export const sidebarButtonsPaddingPxName = "sidebarButtonsPaddingPx";
export const tabsBehaviorOnChangeGroup = "tabsBehaviorOnChangeGroup";

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
  return await getFromLocalStorage(tabsBehaviorOnChangeGroup);
}

export async function saveTabsBehaviorOnChangeGroup(str) {
  await saveToLocalStorage(tabsBehaviorOnChangeGroup, str);
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
