
// Open the tabs of selected group
import {getActiveWindowId, getCloseTabsOnChangeGroup, saveLastBackupTime} from "../data/localStorage.js";
import {getAllGroups, getGroup, saveGroup} from "../data/databaseStorage.js";
import {Tab} from "../data/tabs.js";

//------------------- Browser utils -------------------

export async function getAllOpenedTabs() {
    return await browser.tabs.query({});
}

export async function getLatestWindow() {
    try {
        let currentWindow = await browser.windows.getCurrent();

        if (!currentWindow || !currentWindow.focused) {
            currentWindow = await browser.windows.getLastFocused();
        }
        return currentWindow;
    } catch (error) {
        return null;
    }
}

/**
 * @returns {TabsGroup} group/null
 */
export async function openTabs(groupId) {
    console.log("Opening tabs...", groupId)
    const allTabs = await getAllOpenedTabs();
    const windowId = await getActiveWindowId();
    const group = await getGroup(groupId);

    if (!group) {
        console.log("Can't find group to open", groupId);
        return null;
    }

    group.windowId = windowId;

    //open all tabs from group and save ids
    const openedTabs = [];
    for (const tab of group.tabs) {
        try {
            const url = tab.url;

            //try to find tab with the same url
            let browserTab = findTab(allTabs, openedTabs, url);

            //create new one if can't find
            if (!browserTab) {
                if (url.startsWith("http")) {
                    browserTab = await (browser.tabs.create({
                        url: url,
                        windowId: windowId
                    }));
                } else {
                    browserTab = await (browser.tabs.create({
                        url: await (browser.runtime.getURL(url)),
                        windowId: windowId
                    }));
                }
            }

            tab.id = browserTab.id;
            openedTabs.push(tab);
        } catch (e) {
            console.error(`Can't open tab: ${tab}`, e);
        }
    }

    //create empty tab in empty group
    if (openedTabs.length <= 0) {
        const tab = new Tab(0, "about:blank");
        const createdTab = await (browser.tabs.create({
            url: tab.url,
            windowId: windowId
        }));
        tab.id = createdTab.id;
        openedTabs.push(tab);
    }

    //close or hide old tabs
    const closeTabsOnChangeGroup = await getCloseTabsOnChangeGroup();
    const openedIds = openedTabs.map(tab => tab.id);
    const idsToCloseOrHide = allTabs
        .filter(tab => !openedIds.includes(tab.id))
        .map(tab => tab.id);


    if (!closeTabsOnChangeGroup) {
        //show openedTabs
        await browser.tabs.show(openedIds);
        //set last active
        await browser.tabs.update(openedIds[openedIds.length - 1], { active: true });
        //sort
        for (let i = 0; i < openedTabs.length; i++) {
            await browser.tabs.move(openedTabs[i].id, { index: i });
        }
        //hide
        for (const tabId of idsToCloseOrHide) {
            try {
                await browser.tabs.hide(tabId);
            } catch (e) {
                console.log(`Can't hide tab: ${tabId}`, e);
            }
        }
    } else {
        //close
        for (const tabId of idsToCloseOrHide) {
            try {
                await browser.tabs.remove(tabId);
            } catch (e) {
                console.log(`Can't remove tab: ${tabId}`, e);
            }
        }
    }

    //update group after possible errors
    group.tabs = openedTabs;
    await saveGroup(group);

    return group;
}

//find tab in all tabs that doesn't have the id from openedTabs to reuse
function findTab(allTabs, openedTabs, url) {
    const browserTabsWithSameUrl = allTabs.filter(tab => tab.url === url);
    if (browserTabsWithSameUrl && browserTabsWithSameUrl.length > 0) {
        return browserTabsWithSameUrl.find(browserTab =>
            !openedTabs.some(tab => tab.id === browserTab.id)
        );
    }
    return null;
}

//------------------------ Backup ---------------------
//save to Downloads
export async function backupGroups() {
    const allGroups = await getAllGroups();
    const blob = new Blob([JSON.stringify(allGroups)], {type: 'text/plain'});

    const url = URL.createObjectURL(blob);
    const now = new Date().getTime();

    const name = `SidebarTabGroups/${now}.json`;

    let error;

    // Use the downloads API to create the file in the Downloads folder
    await browser.downloads.download({
        url: url,
        filename: name,
        saveAs: false  // Ask where to save the file
    }).then(async (downloadId) => {
        console.log(`Saved new backup: ${name}`);
        await saveLastBackupTime(now);
    }).catch((e) => {
        console.error(`Error on backup: ${error}`);
        error = e;
    });

    return !error;
}
