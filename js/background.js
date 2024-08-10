import {Tab, currentGroupName, saveCurrentGroup, saveGroup} from "./tabsGroup.js";

let currentGroup;

browser.runtime.onInstalled.addListener(() => {
    console.log("Tab Manager Extension Installed");
});

//save currentGroup to temp variable on update
browser.storage.local.onChanged.addListener((changes, areaName) => {
    if (changes[currentGroupName]) {
        currentGroup = changes[currentGroupName].newValue;
    }
});

//save tab to current group when opened
browser.tabs.onCreated.addListener(async (tab) => {
    if (currentGroup) {
        console.log(`Saving new tab to current group: ${JSON.stringify(currentGroup, null, 0)}`)

        currentGroup.tabs.push(new Tab(tab.id, tab.url));
        await saveCurrentGroup(currentGroup)
        await saveGroup(currentGroup)
    }
});

//save tab if it was updated
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (currentGroup && changeInfo.status && changeInfo.status === "complete") {
        const tabToChange = currentGroup.tabs.filter(tabF => tabF.id === tab.id)[0];
        if (!tabToChange || tabToChange.url === tab.url) {
            return
        }

        console.log(`Updating tab info: ${JSON.stringify(tab, null, 0)} in current group: ${JSON.stringify(currentGroup, null, 0)}`);
        tabToChange.url = tab.url;

        await saveCurrentGroup(currentGroup)
        await saveGroup(currentGroup)
    }
});

//remove tab from current group when closed
browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    if (currentGroup) {
        console.log(`Deleting tab: ${tabId} from current group: ${JSON.stringify(currentGroup, null, 0)}`)

        currentGroup.tabs = currentGroup.tabs.filter((tab) => tab.id !== tabId);
        await saveCurrentGroup(currentGroup)
        await saveGroup(currentGroup)
    }
});
