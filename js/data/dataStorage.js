import {notifyBackgroundCurrentGroupUpdated, notify} from "./events.js"

import {tabGroupsName, getData, getAllData, saveData, deleteData} from "./database.js"

export class TabsGroup {
    constructor(name, icon) {
        this.id = new Date().getTime();
        this.windowId = 0;
        this.name = name;
        this.icon = icon;
        this.tabs = [];
    }
}

export class Tab {
    constructor(id, url) {
        this.id = id;
        this.url = url;
    }
}

const activeGroupName = "activeGroup";
const editGroupName = "editGroup";
const windowIdName = "windowId";
const enableBackupName = "enableBackup";
const backupHoursName = "backupHours";
const lastBackupTimeName = "lastBackupTime";

export async function getAllOpenedTabs() {
    return await browser.tabs.query({});
}



/**
 * @returns {Promise<unknown>} group/null
 */
export async function getGroup(groupId) {
    return await getData(tabGroupsName, groupId);
}

/**
 * @returns {Promise<unknown>} true/false
 */
export async function saveGroup(group) {
    return await saveData(tabGroupsName, group);
}

/**
 * @returns {Promise<unknown>} true/false
 */
export async function deleteGroup(groupId) {
    return await deleteData(tabGroupsName, groupId);
}

/**
 * @returns {Promise<unknown>} array/null
 */
export async function getAllGroups() {
    return await getAllData(tabGroupsName);
}



export async function getActiveGroup() {
    return await getFromLocalStorage(activeGroupName);
}

export async function saveActiveGroup(group, notifyBackground) {
    await saveToLocalStorage(activeGroupName, group);
    if (notifyBackground) {
        notify(notifyBackgroundCurrentGroupUpdated, group);
    }
}

export async function deleteActiveGroup(notifyBackground) {
    await saveToLocalStorage(activeGroupName, null);
    if (notifyBackground) {
        notify(notifyBackgroundCurrentGroupUpdated, null);
    }
}



export async function saveGroupToEdit(group) {
    await saveToLocalStorage(editGroupName, group)
}

export async function getGroupToEdit() {
    return await getFromLocalStorage(editGroupName);
}

export async function deleteGroupToEdit() {
    await saveToLocalStorage(editGroupName, null);
}



export async function saveWindowId(id) {
    await saveToLocalStorage(windowIdName, id);
}

export async function getWindowId() {
    return await getFromLocalStorage(windowIdName);
}


export async function getEnableBackup() {
    return await getFromLocalStorage(enableBackupName);
}

export async function saveEnableBackup(enableBackup) {
    await saveToLocalStorage(enableBackupName, enableBackup);
}

export async function getBackupMinutes() {
    return await getFromLocalStorage(backupHoursName)
}

export async function saveBackupMinutes(hours) {
    await saveToLocalStorage(backupHoursName, hours);
}

export async function saveLastBackupTime(time) {
    await saveToLocalStorage(lastBackupTimeName, time);
}

export async function getLastBackupTime() {
    return await getFromLocalStorage(lastBackupTimeName)
}


async function getFromLocalStorage(key) {
    return (await browser.storage.local.get(key))[key];
}

async function saveToLocalStorage(key, value) {
    await browser.storage.local.set({ [key]: value });
}
