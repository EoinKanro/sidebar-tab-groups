import {
    getGroup,
    deleteGroupToEdit,
    getAllGroups,
    saveGroupToEdit,
    getActiveGroup,
    saveWindowId, getSidebarButtonsPadding
} from "./data/dataStorage.js";

import {
    notify,
    notifyEditGroupReloadGroup,
    notifySidebarEditGroupIsClosed,
    notifySidebarReloadGroups,
    notifySidebarUpdateButtonsPadding
} from "./data/events.js";

import {getLatestWindow, openTabs} from "./data/utils.js";

const editGroupId = "edit-group-";
const selectedName = "selected";
let editIsOpen = false;

await reloadGroups(false);

//load theme of sidebar
let styleTheme = document.getElementById("style-theme");
if (!styleTheme) {
    styleTheme = createStyle("style-theme");
}

let styleButtonsPadding = document.getElementById("style-buttons-padding");
if (!styleButtonsPadding) {
    styleButtonsPadding = createStyle("style-buttons-padding");
}

function createStyle(id) {
    let style = document.createElement("style");
    style.id = id;
    document.head.appendChild(style);
    return style;
}

await reloadButtonsPadding();
browser.theme.getCurrent().then(theme => {
    loadTheme(theme);
})



//update sidebar on update theme
browser.theme.onUpdated.addListener(({ theme }) => {
    loadTheme(theme);
});

//Open create group on click
document.getElementById('create-group').addEventListener('click', async () => {
    await openGroupEditor(null);
});

//Reload groups buttons in sidebar on event
//Set variable editIsOpen to false when the window is closed
browser.runtime.onMessage.addListener( async (message, sender, sendResponse) => {
    if (message.command === notifySidebarReloadGroups) {
        await reloadGroups(message.data);
    } else if (message.command === notifySidebarEditGroupIsClosed) {
        console.log("Edit group was closed");
        editIsOpen = false;
    } else if (message.command === notifySidebarUpdateButtonsPadding) {
        await reloadButtonsPadding();
    }
});

//Handle click to edit
browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId.startsWith(editGroupId)) {
        const id = info.menuItemId.replace(editGroupId,"");
        const groupToEdit = await getGroup(Number(id));
        await openGroupEditor(groupToEdit);
    }
});

async function reloadGroups(isOpenTabs) {
    const allGroups = await getAllGroups();
    let activeGroup = await getActiveGroup();

    if (allGroups) {
        const tabButtons = document.getElementById('tab-buttons');
        tabButtons.innerHTML = '';

        allGroups.forEach((group) => {
            const selected = group.id === activeGroup?.id;
            createButton(group, selected);
        })
    }

    if (activeGroup && isOpenTabs) {
        await callOpenTabs(activeGroup);
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
        //don't open if already opened
        const activeGroup = await getActiveGroup();
        if (activeGroup && activeGroup.id === group.id) {
            return;
        }

        //save current window id to open all tabs here
        await saveWindowId((await getLatestWindow()).id)

        //remove style selected from all buttons
        for (let child of tabButtons.children) {
            child.classList.remove(selectedName)
        }

        //add to current button style selected
        button.classList.add(selectedName);

        const groupToOpen = await getGroup(group.id);
        await callOpenTabs(groupToOpen);
    });

    // Attach a contextmenu event listener to the button
    button.addEventListener('contextmenu', (event) => {
        // Remove any existing custom context menu to avoid duplicates
        browser.contextMenus.removeAll();

        browser.contextMenus.create({
            id: `${editGroupId}${group.id}`,
            title: `Edit Group ${group.name}`,
            contexts: ["all"]
        });
    });

    //add button
    tabButtons.appendChild(button);
}

async function callOpenTabs(group) {
    await openTabs(group, true);
}

async function openGroupEditor(group) {
    if (!group) {
        await deleteGroupToEdit()
    } else {
        await saveGroupToEdit(group);
    }

    //don't open page again, just reload content
    if (editIsOpen) {
        notify(notifyEditGroupReloadGroup, null);
        return
    }

    const activeWindow = await getLatestWindow();
    // console.log(activeWindow)
    const viewportWidth = Math.round(activeWindow.width * 0.6);
    const viewportHeight = Math.round(activeWindow.height * 0.5);

    editIsOpen = true;
    browser.windows.create({
        url: browser.runtime.getURL("../html/editGroup.html"),
        type: "popup",
        width: viewportWidth,
        height: viewportHeight
    })
}

async function reloadButtonsPadding() {
    const paddingPx = await getSidebarButtonsPadding();
    if (paddingPx) {
        styleButtonsPadding.innerHTML =
            `
            .button-class {
                padding-top: ${paddingPx}px !important;
                padding-bottom: ${paddingPx}px !important;
            }
            `
    }
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

    styleTheme.innerHTML =
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
        }
        
        .selected {
            background-color: ${colors.toolbar_field_focus} !important;
        }
        `;
}
