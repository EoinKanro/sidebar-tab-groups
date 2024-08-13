import {getGroup, deleteGroupToEdit, getAllGroups, saveGroupToEdit, getActiveGroup} from "./data/dataStorage.js";
import {notifySidebarReloadGroups} from "./data/events.js";
import {getLatestWindow, openTabs} from "./data/utils.js";

const selectedName = "selected";
await reloadGroups(false);

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

//Reload groups buttons in sidebar on event
browser.runtime.onMessage.addListener( async (message, sender, sendResponse) => {
    if (message.command === notifySidebarReloadGroups) {
        await reloadGroups(message.data)
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

        //remove style selected from all buttons
        for (let child of tabButtons.children) {
            child.classList.remove(selectedName)
        }

        //add to current button style selected
        button.classList.add(selectedName);

        const groupToOpen = await getGroup(group.id);
        await callOpenTabs(groupToOpen);
    });

    //open context menu
    button.addEventListener('contextmenu', async (event) => {
        event.preventDefault();

        const groupToEdit = await getGroup(group.id);
        await saveGroupToEdit(groupToEdit);
        await openGroupEditor();
    });

    //add button
    tabButtons.appendChild(button);
}

async function callOpenTabs(group) {
    await openTabs(group, true);
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
