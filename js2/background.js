import {
  getBackupMinutes,
  getEnableBackup,
  getLastBackupTime,
  getTabsBehaviorOnChangeGroup,
  saveBackupMinutes,
  saveEnableBackup,
  saveUpdatedGroup
} from "./data/localStorage.js";
import {backupGroups} from "./service/backupUtils.js";
import {
  closeTabs,
  closeWindow,
  focusWindow,
  getAllOpenedTabs,
  hideTabs,
  openTab,
  suspendTabs
} from "./service/browserUtils.js";
import {isUrlEmpty} from "./service/commonUtils.js";
import {Tab, TABS_BEHAVIOR} from "./data/dataClasses.js";
import {getAllGroups, getGroup, saveGroup} from "./data/databaseStorage.js";

//-------------------- Temp Data ---------------------

const windowIdGroup = new Map();
const groupIdWindowId = new Map();
const tabsActionQueue = new BlockingQueue();
let backupScheduler;

//------------------ Initialization -------------------

await init();

async function init() {
  await initDefaultBackupValues();
  await reinitBackupProcess();
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
//-------------------- Actions ---------------------
//----------------- Group Manager ------------------
async function closeAllAndOpenFirstGroup() {
  const currentWindows = await browser.windows.getAll({
    populate: false
  });

  const allGroups = await getAllGroups();
  if (!allGroups) {
    return;
  }

  windowIdGroup.clear();
  groupIdWindowId.clear();

  if (allGroups.length <= 0) {
    return;
  }

  const firstGroup = allGroups.reduce((lowest, current) => {
    return current.index < lowest.index ? current : lowest;
  }, allGroups[0]);

  await openGroup(firstGroup.id, null);
  for (let win of currentWindows) {
    await closeWindow(win.id);
  }
}

async function openGroup(groupId, windowId) {
  console.log("Opening group...", groupId);
  let group = await getGroup(groupId);

  if (group === undefined || !group) {
    console.error("Can't open group", groupId);
    return false;
  }

  if (groupIdWindowId.has(group.id)) {
    await focusWindow(groupIdWindowId.get(group.id));
    return false;
  }

  if (windowId === undefined || !windowId) {
    windowId = (await browser.windows.create({
      type: 'normal'
    })).id;
  }

  group = await openTabs(group, windowId);
  windowIdGroup.set(windowId, group);
  groupIdWindowId.set(group.id, windowId);
  return true;
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
    console.log(`Saving new tab to group: `, msg, group);
    group.tabs.splice(msg.index, 0, new Tab(msg.id, msg.url));
  });
}

async function updateTab(msg) {
  await updateGroup(msg, (msg, group) => {
    const tabToChange = group.tabs.find(tabF => tabF.id === msg.id);
    if (tabToChange === undefined || !tabToChange || tabToChange.url === msg.url) {
      return;
    }

    console.log(`Updating tab info in group: `, msg, group);
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

    console.log("Moving tab in group: ", msg, group);
    group.tabs.splice(fromIndex, 1);
    group.tabs.splice(toIndex, 0, tab);
  });
}

async function removeTab(msg) {
  await updateGroup(msg, (msg, group) => {
    console.log(`Removing tab from group: `, msg, group)
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
  await saveUpdatedGroup(group.id, ["tabs"]);
}

async function processTabsActionsLoop() {
  while(true) {
    try {
      const msg = await tabsActionQueue.take();

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

//todo restore

//---------------- Event Listeners -----------------
//----------------- Context menu -------------------
browser.contextMenus.onHidden.addListener(() => {
  browser.contextMenus.removeAll();
});

//--------------- Runtime messages -----------------
browser.runtime.onMessage.addListener((msg, sender) => {
  //todo all from scheme2
  //todo update, delete, reload from tabsManager, open from sidebar
  if (msg.type === 'REQUEST_WINDOW_DATA') {
    const wid = sender.tab.windowId;      // the sidebar’s own window
    return Promise.resolve(windowData.get(wid)); // may be undefined
  }
});

//----------------- Group Manager ------------------
//remove temp info about group
browser.windows.onRemoved.addListener(id => {
  const group = windowIdGroup.get(id);
  if (group === undefined || !group) {
    return;
  }

  console.log("Stopping group processing...", group);
  windowIdGroup.delete(id);
  if (groupIdWindowId.get(group.id) === id) {
    groupIdWindowId.delete(group.id);
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

//---------------- Support classes----------------
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
  constructor(windowId, groupId) {
    this.windowId = windowId;
    this.groupId = groupId;
  }
}

class CreateTabAction extends TabAction{
  constructor(windowId, groupId, index, id, url) {
    super(windowId, groupId);
    this.index = index;
    this.id = id;
    this.url = url;
  }
}

class UpdateTabAction extends TabAction{
  constructor(windowId, groupId, id, url) {
    super(windowId, groupId);
    this.id = id;
    this.url = url;
  }
}

class MoveTabAction extends TabAction{
  constructor(windowId, groupId, id, toIndex) {
    super(windowId, groupId);
    this.id = id;
    this.toIndex = toIndex;
  }
}

class RemoveTabAction extends TabAction{
  constructor(windowId, groupId, id) {
    super(windowId, groupId);
    this.id = id;
  }
}
