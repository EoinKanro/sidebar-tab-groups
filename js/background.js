import {Tab, saveGroup} from "./data/dataStorage.js";
import {notifyBackgroundCurrentGroupUpdated} from "./data/events.js"

let activeGroup;

browser.runtime.onInstalled.addListener(() => {
    console.log("Tab Manager Extension Installed");
});

//todo do not change tabs if id is the same
//save currentGroup to temp variable on update
browser.runtime.onMessage.addListener( (message, sender, sendResponse) => {
    console.log(message)
    if (message.command === notifyBackgroundCurrentGroupUpdated) {
        activeGroup = message.data;
        console.log("Current group received", activeGroup);
    }
});

//save tab to current group when opened
browser.tabs.onCreated.addListener(async (tab) => {
    if (isAvailableToUpdate()) {
        console.log(`Saving new tab to current group: ${JSON.stringify(activeGroup, null, 0)}`)

        activeGroup.tabs.push(new Tab(tab.id, tab.url));
        await save()
    }
});

//save tab if it was updated
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (isAvailableToUpdate() && changeInfo.status && changeInfo.status === "complete") {
        const tabToChange = activeGroup.tabs.filter(tabF => tabF.id === tab.id)[0];
        if (!tabToChange || tabToChange.url === tab.url) {
            return
        }

        console.log(`Updating tab info: ${JSON.stringify(tab, null, 0)} in current group: ${JSON.stringify(activeGroup, null, 0)}`);
        tabToChange.url = tab.url;

        await save()
    }
});

//remove tab from current group when closed
browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    if (isAvailableToUpdate()) {
        console.log(`Deleting tab: ${tabId} from current group: ${JSON.stringify(activeGroup, null, 0)}`)

        activeGroup.tabs = activeGroup.tabs.filter((tab) => tab.id !== tabId);
        await save()
    }
});

function isAvailableToUpdate() {
    //TODO windowId
    return activeGroup
}

async function save() {
    await saveGroup(activeGroup, false)
}