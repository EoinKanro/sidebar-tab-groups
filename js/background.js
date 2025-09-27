import {
    backgroundId,
    EditGroupActiveGroupChangedEvent,
    notify,
    notifyBackgroundActiveGroupDeleted,
    notifyBackgroundActiveGroupUpdated,
    notifyBackgroundOpenFirstGroupTabs,
    notifyBackgroundReinitBackup,
    notifyBackgroundOpenTabs,
    SidebarUpdateActiveGroupButtonEvent,
    notifyBackgroundRestoreBackup,
    SidebarReloadGroupButtonsEvent,
    SidebarUpdateButtonsPadding, TabsManagerReloadGroupsEvent
} from "./service/events.js";
import {
    deleteActiveGroupId,
    deleteActiveWindowId,
    deleteGroupToEditId,
    getBackupMinutes,
    getEnableBackup,
    getLastBackupTime,
    saveActiveGroupId,
    saveActiveWindowId,
    saveBackupMinutes,
    saveCloseTabsOnChangeGroup,
    saveEnableBackup,
    saveSidebarButtonsPaddingPx,
    saveStopTabsActivityOnChangeGroup
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
    try {
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
    } catch (e) {
        console.error(e);
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

    await deleteAllGroups();
    await cleanTempData();

    for (const item of json.allGroups) {
        await saveGroup(item);
    }

    await openFirstGroup();

    try {
        await saveSetting(json.enableBackup, async () => await saveEnableBackup(json.enableBackup));
        await saveSetting(json.backupMinutes, async () => await saveBackupMinutes(Number(json.backupMinutes)));
        await saveSetting(json.sidebarButtonsPaddingPx, async () => await saveSidebarButtonsPaddingPx(Number(json.sidebarButtonsPaddingPx)));
        await saveSetting(json.closeTabsOnChangeGroup, async () => await saveCloseTabsOnChangeGroup(json.closeTabsOnChangeGroup));
        await saveSetting(json.stopTabsActivityOnChangeGroup, async () => await saveStopTabsActivityOnChangeGroup(json.stopTabsActivityOnChangeGroup));

        await cleanInitBackupInterval();
        notify(new SidebarUpdateButtonsPadding());
    } catch (e) {
        console.warn("Can't restore settings", json);
    }
}

async function saveSetting(param, saveFunction) {
    if (param !== undefined && param !== null) {
        await saveFunction();
    }
}

//----------------------- Tabs CUD listeners ------------------------

class BlockingQueue {
    constructor() {
        this.queue = [];
        this.resolvers = [];
    }

    take() {
        if (this.queue.length > 0) {
            return Promise.resolve(this.queue.shift());
        } else {
            //Save resolve and wait for message
            return new Promise((resolve) => {
                this.resolvers.push(resolve);
            });
        }
    }

    add(msg) {
        console.log("Adding msg to queue...", msg);

        if (this.resolvers.length > 0) {
            //Get resolve and send message
            const resolve = this.resolvers.shift();
            resolve(msg);
        } else {
            this.queue.push(msg);
        }
    }
}

class TabAction {
    constructor(groupId) {
        this.groupId = groupId;
    }
}

class CreateTabAction extends TabAction{
    constructor(groupId, index, id, url) {
        super(groupId);
        this.index = index;
        this.id = id;
        this.url = url;
    }
}

class UpdateTabAction extends TabAction{
    constructor(groupId, id, url) {
        super(groupId);
        this.id = id;
        this.url = url;
    }
}

class MoveTabAction extends TabAction{
    constructor(groupId, id, toIndex) {
        super(groupId);
        this.id = id;
        this.toIndex = toIndex;
    }
}

class RemoveTabAction extends TabAction{
    constructor(groupId, id) {
        super(groupId);
        this.id = id;
    }
}

async function processTabsActions() {
    while(true) {
        try {
            const msg = await tabsActionQueue.take();

            if (msg.groupId !== activeGroup.id) {
                console.warn("Message is too old, skipping: ", msg);
                continue;
            }

            if (msg instanceof CreateTabAction) {
                await createTab(msg);
            } else if (msg instanceof UpdateTabAction) {
                await updateTab(msg);
            } else if (msg instanceof MoveTabAction) {
                await moveTab(msg);
            } else if (msg instanceof RemoveTabAction) {
                await removeTab(msg);
            } else {
                console.warn("Can't process message", msg);
            }
        } catch (e) {
            console.error(e);
        }
    }
}

async function createTab(msg) {
    console.log(`Saving new tab to current group: `, msg, activeGroup);
    activeGroup.tabs.splice(msg.index, 0, new Tab(msg.id, msg.url));
    await save();
}

async function updateTab(msg) {
    const tabToChange = activeGroup.tabs.find(tabF => tabF.id === msg.id);
    if (tabToChange === undefined || !tabToChange || tabToChange.url === msg.url) {
        return
    }

    console.log(`Updating tab info in current group: `, msg, activeGroup);
    tabToChange.url = msg.url;
    await save();
}

async function moveTab(msg) {
    if (activeGroup.tabs.length < msg.toIndex) {
        return;
    }

    const tab = activeGroup.tabs.find(tabF => tabF.id === msg.id);

    if (tab === undefined || !tab) {
        return;
    }

    const fromIndex = activeGroup.tabs.indexOf(tab);
    const toIndex = msg.toIndex;

    console.log("Moving tab in current group: ", msg, activeGroup);
    activeGroup.tabs.splice(fromIndex, 1);
    activeGroup.tabs.splice(toIndex, 0, tab);
    await save();
}

async function removeTab(msg) {
    console.log(`Removing tab from current group: `, msg, activeGroup)
    activeGroup.tabs = activeGroup.tabs.filter((tab) => tab.id !== msg.id);
    await save();
}

const tabsActionQueue = new BlockingQueue();
processTabsActions().then(() => console.log("Background tab processing stopped"));

//save tab to active group when opened
browser.tabs.onCreated.addListener(async (tab) => {
    try {
        if (tab !== undefined && tab && isAvailableToUpdate(tab.windowId)) {
            tabsActionQueue.add(new CreateTabAction(activeGroup.id, tab.index, tab.id, tab.url));
        }
    } catch (e) {
        console.error(e);
    }
});

//save tab if it was updated
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    try {
        if (tab !== undefined && tab && isAvailableToUpdate(tab.windowId) && changeInfo !== undefined && changeInfo
            && !isUrlEmpty(changeInfo.url)) {
            tabsActionQueue.add(new UpdateTabAction(activeGroup.id, tab.id, changeInfo.url));
        }
    } catch (e) {
        console.error(e);
    }
});

//save moved tab
browser.tabs.onMoved.addListener(async (tabId, changeInfo) => {
    try {
        if (changeInfo !== undefined && changeInfo && isAvailableToUpdate(changeInfo.windowId)
            && activeGroup.tabs.find(tabF => tabF.id === tabId) !== undefined) {
            tabsActionQueue.add(new MoveTabAction(activeGroup.id, tabId, changeInfo.toIndex));
        }
    } catch (e) {
        console.error(e);
    }
})

//remove tab from active group when closed
browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    try {
        if (removeInfo !== undefined && removeInfo && isAvailableToUpdate(removeInfo.windowId) && !removeInfo.isWindowClosing) {
            tabsActionQueue.add(new RemoveTabAction(activeGroup.id, tabId));
        }
    } catch (e) {
        console.error(e);
    }
});

function isAvailableToUpdate(windowId) {
    return activeGroup && activeGroup.windowId === windowId;
}

async function save() {
    await saveGroup(activeGroup);
    notify(new TabsManagerReloadGroupsEvent());
}

//-------------------------- Listener for removing context menu items -----------------------

//remove custom context menu items
browser.contextMenus.onHidden.addListener(() => {
    browser.contextMenus.removeAll();
});
