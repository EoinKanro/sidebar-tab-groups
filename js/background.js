import {
    backgroundId,
    EditGroupActiveGroupChangedEvent,
    notify,
    notifyBackgroundActiveGroupDeleted,
    notifyBackgroundActiveGroupUpdated,
    notifyBackgroundOpenFirstGroupTabs,
    notifyBackgroundReinitBackup,
    notifyBackgroundOpenTabs,
    SidebarUpdateActiveGroupButtonEvent, notifyBackgroundRestoreBackup, SidebarReloadGroupButtonsEvent
} from "./service/events.js";
import {
    deleteActiveGroupId, deleteActiveWindowId, deleteGroupToEditId,
    getBackupMinutes,
    getEnableBackup,
    getLastBackupTime,
    saveActiveGroupId,
    saveActiveWindowId, saveBackupMinutes, saveEnableBackup
} from "./data/localStorage.js";
import {Tab} from "./data/tabs.js";
import {deleteAllGroups, getAllGroups, saveGroup} from "./data/databaseStorage.js";
import {backupGroups, getLatestWindow, isUrlEmpty, openTabs} from "./service/utils.js";

/**
 * Responsible for:
 * - any tabs manipulations. active group saves only here
 * - backup
 * - removing context elements
 */

let activeGroup;
let backupInterval;

//---------------------------- Init ---------------------------
await cleanTempData();
await saveActiveWindowId((await getLatestWindow()).id);
await openFirstGroup();
await initDefaultBackupValues();
await cleanInitBackupInterval();

async function cleanTempData() {
    await deleteActiveGroupId();
    await deleteActiveWindowId();
    await deleteGroupToEditId();
}

//init on install
async function initDefaultBackupValues() {
    const backupMinutes = await getBackupMinutes();
    if (backupMinutes) {
        return;
    }

    await saveBackupMinutes(1440);
    await saveEnableBackup(true);
}

//------------------------- Runtime messages listener --------------------------------

browser.runtime.onMessage.addListener( async (message, sender, sendResponse) => {
    if (!message.target.includes(backgroundId)) {
        return;
    }

    if (message.actionId === notifyBackgroundOpenTabs) {
        await processOpenTabs(message.groupId);
    } else if (message.actionId === notifyBackgroundOpenFirstGroupTabs) {
        await openFirstGroup();
    } else if (message.actionId === notifyBackgroundActiveGroupUpdated) {
        await processUpdateActiveGroup(message.group);
    } else if (message.actionId === notifyBackgroundActiveGroupDeleted) {
        activeGroup = null;
    } else if (message.actionId === notifyBackgroundReinitBackup) {
        await cleanInitBackupInterval();
    } else if (message.actionId === notifyBackgroundRestoreBackup) {
        await processRestoreBackup(message.json);
    }
})

async function processOpenTabs(groupId) {
    const previousActiveGroup = activeGroup;

    activeGroup = null;
    try {
        activeGroup = await openTabs(groupId);
    } catch (e) {
        console.error("Can't open group ", groupId)
    }

    if (!activeGroup) {
        activeGroup = previousActiveGroup;
    } else {
        await save();
    }

    if (activeGroup) {
        await saveActiveGroupId(activeGroup.id);
    }
    notify(new EditGroupActiveGroupChangedEvent());
    notify(new SidebarReloadGroupButtonsEvent());
}

async function openFirstGroup() {
    const allGroups = await getAllGroups();
    if (allGroups && allGroups.length > 0) {
        const firstGroup = allGroups[0];
        await processOpenTabs(firstGroup.id);
    } else {
        await saveActiveGroupId(null);
        notify(new EditGroupActiveGroupChangedEvent());
        notify(new SidebarReloadGroupButtonsEvent());
    }
}

async function processUpdateActiveGroup(group) {
    if (activeGroup) {
        activeGroup.name = group.name;
        activeGroup.icon = group.icon;
        activeGroup.index = group.index;
        await save();
    } else {
        activeGroup = group;
        await saveActiveGroupId(group.id);
        notify(new SidebarUpdateActiveGroupButtonEvent());
    }
}

//set schedule backup task
async function cleanInitBackupInterval() {
    const enableBackup = await getEnableBackup();
    const backupMinutes = await getBackupMinutes();

    if (backupInterval) {
        clearInterval(backupInterval);
    }

    if (!enableBackup) {
        console.log("Backup turned off");
        return
    }

    if (backupMinutes) {
        console.log(`Starting backup every ${backupMinutes} minutes`);
        backupInterval = setInterval(backupGroupsWithCheck, backupMinutes * 60 * 1000);
        await backupGroupsWithCheck();
    } else {
        console.log("Can't start backup with empty minutes");
    }
}

async function backupGroupsWithCheck() {
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

async function processRestoreBackup(json) {
    await backupGroups();

    await deleteAllGroups()
    await cleanTempData();

    for (const item of json) {
        await saveGroup(item);
    }

    await openFirstGroup();
}

//----------------------- Tabs CUD listeners ------------------------

//save tab to active group when opened
browser.tabs.onCreated.addListener(async (tab) => {
    if (isAvailableToUpdate(tab.windowId)) {
        console.log(`Saving new tab to current group: `, tab, activeGroup)

        activeGroup.tabs.splice(tab.index, 0, new Tab(tab.id, tab.url))
        await save()
    }
});

//save tab if it was updated
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (isAvailableToUpdate(tab.windowId) && !isUrlEmpty(changeInfo.url)) {
        const tabToChange = activeGroup.tabs.filter(tabF => tabF.id === tab.id)[0];
        if (!tabToChange || tabToChange.url === changeInfo.url) {
            return
        }

        console.log(`Updating tab info in current group: `, changeInfo, activeGroup);
        tabToChange.url = changeInfo.url;

        await save()
    }
});

//save moved tab
browser.tabs.onMoved.addListener(async (tabId, changeInfo) => {
    if (isAvailableToUpdate(changeInfo.windowId) && activeGroup.tabs.filter(tabF => tabF.id === tabId).length > 0) {
        const fromIndex = changeInfo.fromIndex;
        const toIndex = changeInfo.toIndex;

        const tabs = activeGroup.tabs;
        const tab = tabs.splice(fromIndex, 1)[0];

        tabs.splice(toIndex, 0, tab);

        activeGroup.tabs = tabs;
        await save();
    }
})

//remove tab from active group when closed
browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    if (!removeInfo.isWindowClosing && isAvailableToUpdate(removeInfo.windowId)) {
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

//-------------------------- Listener for removing context menu items -----------------------

//remove custom context menu items
browser.contextMenus.onHidden.addListener(() => {
    browser.contextMenus.removeAll();
});
