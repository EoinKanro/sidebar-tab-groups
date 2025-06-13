import {
  deletedGroupName,
  deleteWindowIdGroupId,
  enableDebugLogsName,
  getBackupMinutes,
  getEnableBackup,
  getEnableDebugLogs,
  getLastBackupTime,
  getTabsBehaviorOnChangeGroup,
  saveBackupMinutes,
  saveEnableBackup,
  saveEnableDebugLogs,
  saveSidebarButtonsPaddingPx,
  saveTabsBehaviorOnChangeGroup,
  saveUpdatedGroup,
  saveWindowIdGroupId,
  updatedGroupName
} from "./data/localStorage.js";
import {backupGroups} from "./service/backupUtils.js";
import {
  closeTabs,
  closeWindow,
  focusWindow,
  getAllOpenedTabs,
  hideTabs,
  openEmptyWindow,
  openTab,
  suspendTabs
} from "./service/browserUtils.js";
import {isUrlEmpty} from "./service/commonUtils.js";
import {Tab, TABS_BEHAVIOR} from "./data/dataClasses.js";
import {
  deleteAllGroups,
  deleteGroup,
  getAllGroups,
  getGroup,
  saveGroup
} from "./data/databaseStorage.js";
import {
  openFirstGroupId,
  openTabGroupId,
  reinitBackupThreadId,
  restoreFromBackupId
} from "./service/notifications.js";
import {
  BlockingQueue,
  CreateTabAction,
  MoveTabAction,
  RemoveTabAction,
  UpdateTabAction
} from "./data/backgroundClasses.js";
import {Logger} from "./service/logUtils.js";

//-------------------- Temp Data ---------------------

//todo bug on change group. it doesnt let you change it in the same window
const windowIdGroup = new Map();
const groupIdWindowId = new Map();
const tabsActionQueue = new BlockingQueue();
let backupScheduler;
let logger;

//------------------ Initialization -------------------

await init();

async function init() {
  await initDefaultBackupValues();
  await initLogs();
  await reinitBackupProcess();
  await deleteWindowIdGroupId();
  await closeAllAndOpenFirstGroup();
  processTabsActionsLoop().then(() => console.log("Background tab processing stopped"));
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

async function initLogs() {
  let enableLogs = await getEnableDebugLogs();
  if (enableLogs === undefined) {
    enableLogs = false;
    await saveEnableDebugLogs(false);
  }
  logger = new Logger(enableLogs, "background");
}

//-------------------- Actions ---------------------
//----------------- Group Manager ------------------
async function closeAllAndOpenFirstGroup() {
  console.log("Closing all windows and open first group...");
  const currentWindows = await browser.windows.getAll({
    populate: false
  });

  windowIdGroup.clear();
  groupIdWindowId.clear();

  const allGroups = await getAllGroups();
  if (!allGroups) {
    await openEmptyWindow();
    await closeWindows(currentWindows);
    return;
  }

  if (allGroups.length <= 0) {
    return;
  }

  const firstGroup = allGroups.reduce((lowest, current) => {
    return current.index < lowest.index ? current : lowest;
  }, allGroups[0]);

  await openGroup(firstGroup.id, null);
  await closeWindows(currentWindows);
}

async function closeWindows(windows) {
  for (let win of windows) {
    await closeWindow(win.id);
  }
}

async function openGroup(groupId, windowId) {
  console.log("Opening group...", groupId);
  let group = await getGroup(groupId);

  if (group === undefined || !group) {
    console.error("Can't open group", groupId);
    return;
  }

  if (groupIdWindowId.has(group.id)) {
    await focusWindow(groupIdWindowId.get(group.id));
    return;
  }

  if (windowId === undefined || !windowId) {
    windowId = (await openEmptyWindow()).id;
  }

  //clear data for listener
  windowIdGroup.delete(windowId);
  for (const [gId, wId] of groupIdWindowId) {
    if (wId === windowId) {
      groupIdWindowId.delete(gId);
    }
  }

  group = await openTabs(group, windowId);
  windowIdGroup.set(windowId, group);
  groupIdWindowId.set(group.id, windowId);

  await saveIdsToLocalStorage();
}

async function openTabs(group, windowId) {
  console.log("Opening tabs...", group.id)
  let allTabs = await getAllOpenedTabs();
  if (allTabs === undefined || !allTabs) {
    allTabs = [];
  }

  //open all tabs from group
  const tabsBehaviorOnChangeGroup = await getTabsBehaviorOnChangeGroup();
  const openedTabs = await openTabsAndGetOpened(allTabs, windowId, group.tabs, tabsBehaviorOnChangeGroup);
  const openedIds = openedTabs.map(tab => tab.id);

  //show openedTabs
  await browser.tabs.show(openedIds);
  //set last active
  await browser.tabs.update(openedIds[openedIds.length - 1], { active: true });
  //sort
  for (let i = 0; i < openedIds.length; i++) {
    await browser.tabs.move(openedIds[i], { index: i });
  }

  group.windowId = windowId;
  //update group after possible errors
  group.tabs = openedTabs;

  //close or hide old tabs
  const tabsIdsToClose = allTabs
    .filter(tab => tab.windowId === windowId && !openedIds.includes(tab.id))
    .map(tab => tab.id);

  if (tabsBehaviorOnChangeGroup === TABS_BEHAVIOR.CLOSE) {
    await closeTabs(tabsIdsToClose);
  } else {
    if (tabsBehaviorOnChangeGroup === TABS_BEHAVIOR.SUSPEND) {
      await suspendTabs(tabsIdsToClose);
    }
    await hideTabs(tabsIdsToClose);
  }

  return group;
}

async function openTabsAndGetOpened(allTabs, windowId, tabsToOpen, tabsBehaviorOnChangeGroup) {
  const openedTabs = [];
  for (const tab of tabsToOpen) {
    try {
      //crunch
      if (tab === undefined || !tab || isUrlEmpty(tab.url)) {
        continue;
      }

      const url = tab.url;

      //try to find tab with the same url
      let browserTab;
      if (tabsBehaviorOnChangeGroup !== TABS_BEHAVIOR.CLOSE) {
        browserTab = findNotUsedTabByUrl(allTabs, openedTabs, url);
      }

      if (browserTab !== undefined && browserTab) {
        //update window id
        if (browserTab.windowId !== windowId) {
          await browser.tabs.move(browserTab.id, {
            windowId: windowId,
            index: -1
          });
        }
      } else {
        //create new tab
        browserTab = await openTab(url, windowId);
      }

      tab.id = browserTab.id;
      openedTabs.push(tab);
    } catch (e) {
      console.error(`Can't open tab: ${tab}`, e);
    }
  }
  return openedTabs;
}

//find tab in all tabs that doesn't have the id from openedTabs to reuse
function findNotUsedTabByUrl(allTabs, openedTabs, url) {
  const hiddenBrowserTabsWithSameUrl = allTabs.filter(tab => tab.hidden && tab.url === url);

  if (hiddenBrowserTabsWithSameUrl && hiddenBrowserTabsWithSameUrl.length > 0) {
    return hiddenBrowserTabsWithSameUrl.find(browserTab =>
        !openedTabs.some(tab => tab.id === browserTab.id)
    );
  }
  return null;
}

async function createTab(msg) {
  await updateGroup(msg, (msg, group) => {
    logger.logInfo(`Saving new tab to group: `, [msg, group]);
    group.tabs.splice(msg.index, 0, new Tab(msg.id, msg.url));
  });
}

async function updateTab(msg) {
  await updateGroup(msg, (msg, group) => {
    const tabToChange = group.tabs.find(tabF => tabF.id === msg.id);
    if (tabToChange === undefined || !tabToChange || tabToChange.url === msg.url) {
      return;
    }

    logger.logInfo(`Updating tab info in group: `, [msg, group]);
    tabToChange.url = msg.url;
  });
}

async function moveTab(msg) {
  await updateGroup(msg, (msg, group) => {
    if (group.tabs.length < msg.toIndex) {
      return;
    }

    const tab = group.tabs.find(tabF => tabF.id === msg.id);

    if (tab === undefined || !tab) {
      return;
    }

    const fromIndex = group.tabs.indexOf(tab);
    const toIndex = msg.toIndex;

    logger.logInfo( "Moving tab in group: ", [msg, group]);
    group.tabs.splice(fromIndex, 1);
    group.tabs.splice(toIndex, 0, tab);
  });
}

async function removeTab(msg) {
  await updateGroup(msg, (msg, group) => {
    logger.logInfo( `Removing tab from group: `, [msg, group]);
    group.tabs = group.tabs.filter((tab) => tab.id !== msg.id);
  });
}

async function updateGroup(msg, updateFunction) {
  const group = windowIdGroup.get(msg.windowId);
  if (group === undefined || !group || group.id !== msg.groupId) {
    console.warn("Message expired, skipping", msg);
    return;
  }

  await updateFunction(msg, group);
  await saveUpdateGroup(group);
}

async function saveUpdateGroup(group) {
  await saveGroup(group);
  await saveUpdatedGroup(["tabs"], null);
}

async function closeGroup(groupId) {
  const windowId = groupIdWindowId.get(groupId);

  if (windowId === undefined || !windowId) {
    return;
  }

  groupIdWindowId.delete(groupId);
  windowIdGroup.delete(windowId);

  await saveIdsToLocalStorage();
  await closeWindow(windowId);
}

async function saveIdsToLocalStorage() {
  await saveWindowIdGroupId(new Map(
      [...windowIdGroup].map(([winId, group]) => [winId, group.id])
  ));
}

async function processTabsActionsLoop() {
  while(true) {
    try {
      const msg = await tabsActionQueue.take();
      logger.logInfo( "Processing tab message...", msg);

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

//-------------------- Backup ----------------------
//set schedule backup task
async function reinitBackupProcess() {
  const enableBackup = await getEnableBackup();
  const backupMinutes = await getBackupMinutes();

  if (backupScheduler) {
    clearInterval(backupScheduler);
  }

  if (!enableBackup) {
    console.log("Backup turned off");
    return;
  }

  if (backupMinutes) {
    console.log(`Starting backup every ${backupMinutes} minutes`);
    backupScheduler = setInterval(checkAndBackup, backupMinutes * 60 * 1000);
    await checkAndBackup();
  } else {
    console.log("Can't start backup with empty minutes");
  }
}

async function checkAndBackup() {
  const lastBackupTime = await getLastBackupTime();
  const now = new Date().getTime();

  if (!lastBackupTime) {
    await backupGroups();
    return;
  }

  const diff = (now - lastBackupTime) / 1000 / 60;
  const backupMinutes = await getBackupMinutes();

  if (diff >= backupMinutes || backupMinutes - diff < 0.5) {
    await backupGroups();
  }
}

async function processRestoreBackup(json) {
  console.log("Restoring from backup...", json);
  await backupGroups();

  await deleteAllGroups();
  await closeAllAndOpenFirstGroup();

  for (const item of json.allGroups) {
    await saveGroup(item);
  }

  await saveSetting(json.enableBackup, async () => await saveEnableBackup(json.enableBackup));
  await saveSetting(json.backupMinutes, async () => await saveBackupMinutes(Number(json.backupMinutes)));
  await saveSetting(json.sidebarButtonsPaddingPx, async () => await saveSidebarButtonsPaddingPx(Number(json.sidebarButtonsPaddingPx)));
  await saveSetting(json.tabsBehaviorOnChangeGroup, async () => await saveTabsBehaviorOnChangeGroup(json.tabsBehaviorOnChangeGroup));
  await saveSetting(json.enableDebugLogs, async () => await saveEnableDebugLogs(json.enableDebugLogs));

  await reinitBackupProcess();

  await closeAllAndOpenFirstGroup();
}

async function saveSetting(param, saveFunction) {
  if (param !== undefined && param !== null) {
    await saveFunction();
  }
}

//---------------- Event Listeners -----------------
//----------------- Context menu -------------------
browser.contextMenus.onHidden.addListener(() => {
  browser.contextMenus.removeAll();
});

//--------------- Runtime messages -----------------
browser.runtime.onMessage.addListener(async (msg, sender) => {
  try {
    logger.logInfo( "Processing runtime message...", msg);
    if (msg.id === reinitBackupThreadId) {
      await reinitBackupProcess();
    } else if (msg.id === restoreFromBackupId) {
      await processRestoreBackup(msg.data.json);
    } else if (msg.id === openTabGroupId) {
      await openGroup(msg.data.groupId, msg.data.windowId);
    } else if (msg.id === openFirstGroupId) {
      await closeAllAndOpenFirstGroup();
    }
  } catch (e) {
    console.error(e);
  }
});

browser.storage.onChanged.addListener(async (changes, area) => {
  try {
    if (area !== 'local') {
      return;
    }

    logger.logInfo( "Processing local storage changes...", changes);
    if (deletedGroupName in changes) {
      //delete group
      const groupChanges = changes[deletedGroupName]?.newValue;
      if (groupChanges === undefined || !groupChanges) {
        return;
      }

      await closeGroup(groupChanges.data);
      await deleteGroup(groupChanges.data);

    } else if (updatedGroupName in changes) {
      //create or update group
      const groupChanges = changes[updatedGroupName]?.newValue;

      if (groupChanges === undefined || !groupChanges || groupChanges.data === undefined || !groupChanges.data) {
        return;
      }

      if (!groupIdWindowId.has(groupChanges.data.id)) {
        await saveGroup(groupChanges.data);
        return;
      }

      const group = windowIdGroup.get(groupIdWindowId.get(groupChanges.data.id));
      if (group === undefined || !group) {
        console.warn("Update message expired", groupChanges);
        return;
      }

      if (groupChanges.changes.includes("name")) {
        group.name = groupChanges.data.name;
        group.icon = groupChanges.data.icon;
      } else if (groupChanges.changes.includes("index")) {
        group.index = groupChanges.data.index;
      }

      await saveGroup(group);
    } else if (enableDebugLogsName in changes) {
      //logs
      logger.enabled = changes[enableDebugLogsName].newValue;
    }
  } catch (e) {
    console.error(e);
  }
});

//----------------- Group Manager ------------------
//remove temp info about group
browser.windows.onRemoved.addListener(id => {
  try {
    const group = windowIdGroup.get(id);
    if (group === undefined || !group) {
      return;
    }

    console.log("Stopping group processing...", group);
    windowIdGroup.delete(id);
    if (groupIdWindowId.get(group.id) === id) {
      groupIdWindowId.delete(group.id);
    }
  } catch (e) {
    console.error(e);
  }
});

//save tab to group when opened
browser.tabs.onCreated.addListener(async (tab) => {
  try {
    if (tab === undefined || !tab || tab.windowId === undefined || !tab.windowId) {
      return;
    }

    let group = windowIdGroup.get(tab.windowId);
    if (group === undefined || !group) {
      return;
    }

    tabsActionQueue.add(new CreateTabAction(tab.windowId, group.id, tab.index, tab.id, tab.url));
  } catch (e) {
    console.error(e);
  }
});

//save tab if it was updated
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (tab === undefined || !tab || tab.windowId === undefined || !tab.windowId || changeInfo === undefined
      || !changeInfo || isUrlEmpty(changeInfo.url)) {
      return;
    }

    let group = windowIdGroup.get(tab.windowId);
    if (group === undefined || !group) {
      return;
    }

    tabsActionQueue.add(new UpdateTabAction(tab.windowId, group.id, tab.id, changeInfo.url));
  } catch (e) {
    console.error(e);
  }
});

//save moved tab
browser.tabs.onMoved.addListener(async (tabId, changeInfo) => {
  try {
    if (tabId === undefined || !tabId || changeInfo === undefined || !changeInfo || changeInfo.windowId === undefined
      || !changeInfo.windowId) {
      return;
    }

    let group = windowIdGroup.get(changeInfo.windowId);
    if (group === undefined || !group) {
      return;
    }

    tabsActionQueue.add(new MoveTabAction(changeInfo.windowId, group.id, tabId, changeInfo.toIndex));
  } catch (e) {
    console.error(e);
  }
})

//remove tab from group when closed
browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  try {
    if (removeInfo === undefined || !removeInfo || removeInfo.isWindowClosing || removeInfo.windowId === undefined
        || !removeInfo.windowId) {
      return;
    }

    let group = windowIdGroup.get(removeInfo.windowId);
    if (group === undefined || !group) {
      return;
    }

    tabsActionQueue.add(new RemoveTabAction(removeInfo.windowId, group.id, tabId));
  } catch (e) {
    console.error(e);
  }
});
