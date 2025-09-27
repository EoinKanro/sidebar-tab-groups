import {
    Tab,
    saveGroup,
    getAllOpenedTabs,
    getGroup,
    saveActiveGroup,
    deleteActiveGroup,
    deleteGroupToEdit,
    getAllGroups,
    saveWindowId,
    saveGroupToEdit,
    getActiveGroup
} from "./data/dataStorage.js";

import {notifySidebarReloadGroups} from "./data/events.js";

import {initDatabase} from "./data/database.js";

await initDatabase();

await deleteActiveGroup(false);
await deleteGroupToEdit();
await saveWindowId((await getLatestWindow()).id);
await reloadGroups();

const selectedName = "selected";

//Open create group on click
document.getElementById('create-group').addEventListener('click', async () => {
    await deleteGroupToEdit()
    await openGroupEditor();
});

//Reload groups in sidebar on any updates
browser.runtime.onMessage.addListener( async (message, sender, sendResponse) => {
    if (message.command === notifySidebarReloadGroups) {
        await reloadGroups()
    }
});

async function reloadGroups() {
    const allGroups = await getAllGroups(true);
    const activeGroup = await getActiveGroup();

    if (allGroups) {
        const tabButtons = document.getElementById('tab-buttons');
        tabButtons.innerHTML = '';

        allGroups.forEach((group) => {
            const selected = group.id === activeGroup.id;
            createButton(group, selected);
        })
    }
}

async function createButton(group, selected) {
    //todo colors
    const tabButtons = document.getElementById('tab-buttons');

    const button = document.createElement('button');
    button.title=group.name;
    button.classList.add('button-class');

    //set style selected
    if (selected) {
        button.classList.add(selectedName);
    }

    const span = document.createElement('span');
    span.classList.add('material-symbols-outlined');
    span.textContent = group.icon;

    button.appendChild(span);

    //open tabs of group on click and send group to background
    button.addEventListener('click', async () => {
        //remove style selected from all buttons
        for (let child of tabButtons.children) {
            child.classList.remove(selectedName)
        }

        //add to current button style selected
        button.classList.add(selectedName);

        const groupToOpen = await getGroup(group.id, true);
        await openTabs(groupToOpen);
    });

    //open context menu
    button.addEventListener('contextmenu', async (event) => {
        event.preventDefault();

        const groupToEdit = await getGroup(group.id, true);
        await saveGroupToEdit(groupToEdit);
        await openGroupEditor();
    });

    //add button
    tabButtons.appendChild(button);
}

// Open the tabs of selected group
async function openTabs(group) {
    //delete to prevent updating group in background
    await deleteActiveGroup(true);
    const windowId = (await getLatestWindow()).id;

    group.windowId = windowId;

    //create empty tab in empty group
    if (group.tabs.length <= 0) {
        group.tabs.push(new Tab(0, "about:blank"));
    }

    //open all tabs from group and save ids
    for (const tab of group.tabs) {
        try {
            const url = tab.url;

            let createdTab;
            if (url.startsWith("http") || url === "about:blank") {
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
        } catch (e) {
            console.error(`Can't open tab: ${tab.url}`);
        }
    }

    //close old tabs
    const openedIds = group.tabs.map(tab => tab.id);
    let allTabs = await getAllOpenedTabs();
    const idsToClose = allTabs
        .filter(tab => !openedIds.includes(tab.id))
        .map(tab => tab.id);
    await browser.tabs.remove(idsToClose);

    //update group after possible errors
    allTabs = await getAllOpenedTabs();
    const groupTabs = []
    allTabs.forEach(tab => {
        groupTabs.push(new Tab(tab.id, tab.url));
    })
    group.tabs = groupTabs;

    //update after possible errors
    await saveGroup(group, true);
    //save for updating in background
    await saveActiveGroup(group, true)
}

async function getLatestWindow() {
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

async function openGroupEditor() {
    const activeWindow = await getLatestWindow();
    const viewportWidth = Math.round(activeWindow.width * 0.6);
    const viewportHeight = Math.round(activeWindow.height * 0.5);

    browser.windows.create({
        url: browser.runtime.getURL("editGroup.html"),
        type: "popup",
        width: viewportWidth,
        height: viewportHeight
    })
}
