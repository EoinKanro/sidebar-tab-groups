import {deleteActiveGroup, getAllOpenedTabs, saveActiveGroup, saveGroup, Tab} from "./dataStorage.js";

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
    const windowId = (await getLatestWindow()).id;

    group.windowId = windowId;

    //open all tabs from group and save ids
    let openedTabs = [];
    for (const tab of group.tabs) {
        try {
            const url = tab.url;

            let createdTab;
            if (url.startsWith("http")) {
                createdTab = await browser.tabs.create({
                    url: tab.url,
                    windowId: windowId
                });
            } else {
                createdTab = await browser.tabs.create({
                    url: browser.runtime.getURL(url),
                    windowId: windowId
                });
            }

            tab.id = createdTab.id;
            openedTabs.push(tab);
        } catch (e) {
            console.error(`Can't open tab: ${tab.url}`);
        }
    }

    //create empty tab in empty group
    if (openedTabs.length <= 0) {
        const tab = new Tab(0, "about:blank");
        const createdTab = await browser.tabs.create({
            url: tab.url,
            windowId: windowId
        });
        tab.id = createdTab.id;
        openedTabs.push(tab);
    }

    //close old tabs
    const openedIds = openedTabs.map(tab => tab.id);
    let allTabs = await getAllOpenedTabs();
    const idsToClose = allTabs
        .filter(tab => !openedIds.includes(tab.id))
        .map(tab => tab.id);
    await browser.tabs.remove(idsToClose);

    //update group after possible errors
    group.tabs = openedTabs;
    await saveGroup(group);

    //save for updating in background
    await saveActiveGroup(group, notifyBackground)
}
