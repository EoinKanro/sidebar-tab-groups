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

const selectedName = "selected";
await reloadGroups(true);

//load theme of sidebar
let style = document.getElementById("js-style")
if (!style) {
    style = document.createElement('style');
    style.id = "js-style";
    document.head.appendChild(style);
}
browser.theme.getCurrent().then(theme => {
    loadTheme(theme);
})

//update sidebar on update theme
browser.theme.onUpdated.addListener(({ theme }) => {
    loadTheme(theme);
});

//Open create group on click
document.getElementById('create-group').addEventListener('click', async () => {
    await deleteGroupToEdit()
    await openGroupEditor();
});

//Reload groups in sidebar on any updates
browser.runtime.onMessage.addListener( async (message, sender, sendResponse) => {
    if (message.command === notifySidebarReloadGroups) {
        await reloadGroups(message.data)
    }
});

async function reloadGroups(isOpenTabs) {
    const allGroups = await getAllGroups(true);
    let activeGroup = await getActiveGroup();

    if (allGroups) {
        //open on load browser
        if (!activeGroup && allGroups.length > 0) {
            activeGroup = allGroups[0];
        }

        const tabButtons = document.getElementById('tab-buttons');
        tabButtons.innerHTML = '';

        allGroups.forEach((group) => {
            const selected = group.id === activeGroup?.id;
            createButton(group, selected);
        })
    }

    if (activeGroup && isOpenTabs) {
        await openTabs(activeGroup);
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
    console.log("Opening tabs", group)
    //delete to prevent updating group in background
    await deleteActiveGroup(true);
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
    // console.log(activeWindow)
    const viewportWidth = Math.round(activeWindow.width * 0.6);
    const viewportHeight = Math.round(activeWindow.height * 0.5);

    browser.windows.create({
        url: browser.runtime.getURL("../html/editGroup.html"),
        type: "popup",
        width: viewportWidth,
        height: viewportHeight
    })
}

function loadTheme(theme) {
    let colors
    if (theme?.colors) {
        colors = theme.colors;
    } else {
        colors = {};

        colors.toolbar_field = "rgb(240, 240, 244)"
        colors.toolbar_field_text = "rgb(21, 20, 26)"
        colors.toolbar_field_focus = "white"
    }

    style.innerHTML =
        `
        body {
            background-color: ${colors.toolbar_field};
        }
        
        .button-class {
            background-color: ${colors.toolbar_field};
            color: ${colors.toolbar_field_text};
        }
        
        .button-class:hover {
            background-color: ${colors.toolbar_field_focus} !important;
            transition: 0.6s;
        }
        
        .selected {
            background-color: ${colors.toolbar_field_focus} !important;
        }
        `;
}
