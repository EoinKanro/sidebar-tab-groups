import {
    deleteActiveGroup,
    getAllGroups,
    getAllOpenedTabs,
    getIfCloseTabs,
    getWindowId,
    saveActiveGroup,
    saveGroup,
    saveLastBackupTime,
    Tab
} from "./dataStorage.js";

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

// Open the tabs of selected group
export async function openTabs(group, notifyBackground) {
    console.log("Opening tabs", group)
    //delete to prevent updating group in background
    await deleteActiveGroup(notifyBackground);

    const allTabs = await getAllOpenedTabs();
    const windowId = await getWindowId();

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
    const closeTabs = await getIfCloseTabs();
    const openedIds = openedTabs.map(tab => tab.id);
    const idsToCloseOrHide = allTabs
        .filter(tab => !openedIds.includes(tab.id))
        .map(tab => tab.id);

    if (!closeTabs) {
        //show openedTabs, sort them, then hide tabs not from current group
        await browser.tabs.show(openedIds);
        await browser.tabs.update(openedIds[openedIds.length - 1], { active: true });
        for (let i = 0; i < openedTabs.length; i++) {
            await browser.tabs.move(openedTabs[i].id, { index: i });
        }
        await browser.tabs.hide(idsToCloseOrHide);
    } else {
        //just close tabs not from current group
        await browser.tabs.remove(idsToCloseOrHide);
    }

    //update group after possible errors
    group.tabs = openedTabs;
    await saveGroup(group);

    //save for updating in background
    await saveActiveGroup(group, notifyBackground)
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

//save to Downloads
export async function backupGroups() {
    const allGroups = await getAllGroups();
    const blob = new Blob([JSON.stringify(allGroups)], {type: 'text/plain'});

    const url = URL.createObjectURL(blob);
    const now = new Date().getTime();

    const name = `SidebarTabGroups/${now}.json`;

    // Use the downloads API to create the file in the Downloads folder
    browser.downloads.download({
        url: url,
        filename: name,
        saveAs: false  // Ask where to save the file
    }).then(async (downloadId) => {
        console.log(`Saved new backup: ${name}`);
        await saveLastBackupTime(now);
    }).catch((error) => {
        console.error(`Error on backup: ${error}`);
    });
}
