
const activeGroupIdName = "activeGroupId";
const activeWindowIdName = "activeWindowId";
const groupToEditIdName = "groupToEditId";
const enableBackupName = "enableBackup";
const backupMinutesName = "backupMinutes";
const lastBackupTimeName = "lastBackupTime";
const sidebarButtonsPaddingPxName = "sidebarButtonsPaddingPx";
const closeTabsOnChangeGroupName = "closeTabsOnChangeGroup";

//-------------------- Temp data --------------------
//------------------- Active group ------------------
export async function saveActiveGroupId(groupId) {
    await saveToLocalStorage(activeGroupIdName, groupId);
}

export async function getActiveGroupId() {
    return await getFromLocalStorage(activeGroupIdName);
}

export async function deleteActiveGroupId() {
    await saveToLocalStorage(activeGroupIdName, null);
}

//------------------- Window id ----------------

export async function saveActiveWindowId(windowId) {
    await saveToLocalStorage(activeWindowIdName, windowId);
}

export async function getActiveWindowId() {
    return await getFromLocalStorage(activeWindowIdName);
}

export async function deleteActiveWindowId() {
    await saveToLocalStorage(activeWindowIdName, null);
}

//---------------- Group to edit id -------------------

export async function saveGroupToEditId(groupId) {
    await saveToLocalStorage(groupToEditIdName, groupId);
}

export async function getGroupToEditId() {
    return await getFromLocalStorage(groupToEditIdName);
}

export async function deleteGroupToEditId() {
    await saveToLocalStorage(groupToEditIdName, null);
}

//--------------------- Settings ----------------------
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

export async function saveBackupMinutes(hours) {
    await saveToLocalStorage(backupMinutesName, hours);
}

export async function saveLastBackupTime(time) {
    await saveToLocalStorage(lastBackupTimeName, time);
}

export async function getLastBackupTime() {
    return await getFromLocalStorage(lastBackupTimeName)
}

//---------------------- Style ---------------------------
export async function getSidebarButtonsPaddingPx() {
    return await getFromLocalStorage(sidebarButtonsPaddingPxName);
}

export async function saveSidebarButtonsPaddingPx(px) {
    await saveToLocalStorage(sidebarButtonsPaddingPxName, px);
}

//------------------------ Tabs ---------------------------
export async function getCloseTabsOnChangeGroup() {
    return await getFromLocalStorage(closeTabsOnChangeGroupName);
}

export async function saveCloseTabsOnChangeGroup(bool) {
    await saveToLocalStorage(closeTabsOnChangeGroupName, bool);
}

async function getFromLocalStorage(key) {
    console.log(`Getting ${key} from local storage...`);
    return (await browser.storage.local.get(key))[key];
}

async function saveToLocalStorage(key, value) {
    console.log(`Saving ${key} to local storage...`, value);
    await browser.storage.local.set({ [key]: value });
}
