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

export async function saveActiveGroup(group, isNotify) {
    await saveToLocalStorage(activeGroupName, group);
    if (isNotify) {
        notify(notifyBackgroundCurrentGroupUpdated, group);
    }
}

export async function deleteActiveGroup(isNotify) {
    await saveToLocalStorage(activeGroupName, null);
    if (isNotify) {
        notify(notifyBackgroundCurrentGroupUpdated, null);
    }
}



export async function saveGroupToEdit(group) {
    await saveToLocalStorage(editGroupName, group)
}

export async function getGroupToEdit() {
    return getFromLocalStorage(editGroupName);
}

export async function deleteGroupToEdit() {
    await saveToLocalStorage(editGroupName, null);
}



export async function saveWindowId(id) {
    await saveToLocalStorage(windowIdName, id);
}

export async function getWindowId() {
    return getFromLocalStorage(windowIdName);
}



async function getFromLocalStorage(key) {
    return (await browser.storage.local.get(key))[key];
}

async function saveToLocalStorage(key, value) {
    await browser.storage.local.set({ [key]: value });
}
