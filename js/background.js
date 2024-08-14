import {
    Tab,
    saveGroup,
    deleteActiveGroup,
    deleteGroupToEdit,
    getAllGroups,
    saveActiveGroup, saveWindowId, getEnableBackup, getBackupMinutes, getLastBackupTime
} from "./data/dataStorage.js";

import {
    notify,
    notifyBackgroundCurrentGroupUpdated,
    notifyBackgroundUpdateBackup,
    notifySidebarReloadGroups
} from "./data/events.js"
import {backupGroups, getLatestWindow, openTabs} from "./data/utils.js";

let activeGroup;
let backupInterval = null;

//clear temp data and open tabs of first group
await init();
async function init() {
    //clear temp data
    await deleteActiveGroup(false);
    await deleteGroupToEdit();
    const windowId = (await getLatestWindow()).id
    await saveWindowId(windowId);

    const allGroups = await getAllGroups();
    //open first group on load addon
    if (allGroups && allGroups.length > 0) {
        activeGroup = allGroups[0];

        activeGroup.windowId = windowId;
        await saveActiveGroup(activeGroup, false);
        await openTabs(activeGroup, false);
        notify(notifySidebarReloadGroups, false);
        console.log("Initialized current group", activeGroup);
    }

    await initBackupInterval();
}

browser.runtime.onInstalled.addListener(() => {
    console.log("Tab Manager Extension Installed");
});

//save currentGroup to temp variable on update
browser.runtime.onMessage.addListener( async (message, sender, sendResponse) => {
    if (message.command === notifyBackgroundCurrentGroupUpdated) {
        activeGroup = message.data;
        console.log("Current group received:", activeGroup);

    }
    if (message.command === notifyBackgroundUpdateBackup) {
        await initBackupInterval();
    }
});

//save tab to current group when opened
browser.tabs.onCreated.addListener(async (tab) => {
    if (isAvailableToUpdate(tab.windowId)) {
        console.log(`Saving new tab to current group: `, activeGroup)

        activeGroup.tabs.push(new Tab(tab.id, tab.url));
        await save()
    }
});

//save tab if it was updated
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (isAvailableToUpdate(tab.windowId) && changeInfo.url) {
        const tabToChange = activeGroup.tabs.filter(tabF => tabF.id === tab.id)[0];
        if (!tabToChange || tabToChange.url === tab.url) {
            return
        }

        console.log(`Updating tab info in current group: `, tab, activeGroup);
        tabToChange.url = tab.url;

        await save()
    }
});

//remove tab from current group when closed
browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    if (isAvailableToUpdate(removeInfo.windowId)) {
        console.log(`Deleting tab from current group: `, tabId, activeGroup)

        activeGroup.tabs = activeGroup.tabs.filter((tab) => tab.id !== tabId);
        await save()
    }
});

function isAvailableToUpdate(windowId) {
    return activeGroup && activeGroup.windowId === windowId;
}

async function save() {
    await saveGroup(activeGroup)
}

//remove custom context menu items
browser.contextMenus.onHidden.addListener(() => {
    browser.contextMenus.removeAll();
});

//set schedule task to backup
async function initBackupInterval() {
    const enableBackup = await getEnableBackup();
    const backupMinutes = await getBackupMinutes();

    if (!enableBackup && backupInterval) {
        clearInterval(backupInterval);
        console.log("Backup turned off");
    } else if (enableBackup && backupMinutes && backupMinutes > 0) {
        console.log(`Starting backup every ${backupMinutes} minutes`);

        if (backupInterval) {
            clearInterval(backupInterval);
        }
        backupInterval = setInterval(backupGroupsWithCheck, backupMinutes * 60 * 1000);
        await backupGroupsWithCheck();
    }
}

export async function backupGroupsWithCheck() {
    const lastBackupTime = await getLastBackupTime();
    const now = new Date().getTime();

    if (!lastBackupTime) {
        await backupGroups();
        return;
    }

    const diff = (now - lastBackupTime) / 1000 / 60;
    const backupMinutes = await getBackupMinutes();

    if (diff >= backupMinutes || backupMinutes - diff < 0.1) {
        await backupGroups();
    }
}
