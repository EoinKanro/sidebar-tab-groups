import {
    TabsGroup, getGroupToEdit, saveGroup, deleteGroup, deleteGroupToEdit, getActiveGroup, getAllOpenedTabs, Tab,
    saveActiveGroup, getWindowId, getAllGroups
} from "./data/dataStorage.js";

import {
    notify,
    notifyBackgroundCurrentGroupUpdated,
    notifyEditGroupReloadGroup,
    notifySidebarEditGroupIsClosed,
    notifySidebarReloadGroups
} from "./data/events.js";

//notify sidebar that the window is closed
window.addEventListener('unload', () => {
    notify(notifySidebarEditGroupIsClosed, null);
});

//load style
let style = document.getElementById("js-style")
if (!style) {
    style = document.createElement('style');
    style.id = "js-style";
    document.head.appendChild(style);
}
browser.theme.getCurrent().then(theme => {
    let colors;
    if (theme?.colors) {
        colors = theme.colors;
    } else {
        colors = {};
        colors.popup = "#fff";
        colors.popup_text = "rgb(21,20,26)";
        colors.button = "rgba(207,207,216,.33)";
        colors.button_active = "rgb(207,207,216)";
    }

    style.innerHTML =
        `
        body {
            background-color: ${colors.popup};
            color: ${colors.popup_text};
        }
        
        .button-class {
            background-color: ${colors.button};
            color: ${colors.popup_text};
        }
        
        .button-class:hover {
            background-color: ${colors.button_active} !important;
        }
        
        #icon-selected {
            background-color: ${colors.button_active} !important;
            color: ${colors.popup_text};
        }
        `;
})

let groupToEdit;
let activeGroup;
const windowId = await getWindowId();

const groupName = document.getElementById("group-name");
const iconSelected = document.getElementById("icon-selected");
const deleteButton = document.getElementById("delete");

//load on open page
await loadGroupToEdit();
//reload when editing was clicked again and update active group if it was changed
browser.runtime.onMessage.addListener( async (message, sender, sendResponse) => {
    if (message.command === notifyEditGroupReloadGroup) {
        await loadGroupToEdit();

        // Focus the current window
        const window = await browser.windows.getCurrent();
        if (window) {
            browser.windows.update(window.id, { focused: true });
        }
    } else if (message.command === notifyBackgroundCurrentGroupUpdated) {
        activeGroup = await getActiveGroup();
    }
});

//set values of group to edit to the page
async function loadGroupToEdit() {
    activeGroup = await getActiveGroup();
    groupToEdit = await getGroupToEdit();

    if (groupToEdit) {
        document.getElementById('group-header').textContent = 'Edit Group';
        groupName.value = groupToEdit.name;
        iconSelected.textContent = groupToEdit.icon;
        deleteButton.style.visibility = '';
    } else {
        document.getElementById('group-header').textContent = 'New Group';
        groupName.value = '';
        iconSelected.textContent = '';
        deleteButton.style.visibility = 'hidden';
    }
}


const symbols = await (await fetch('../font/google-symbols.json')).json();
const iconSearch = document.getElementById("icon-search")
const iconsList = document.getElementById("icons-list");

//load symbols to selector
loadIcons();
function loadIcons() {
    let iconsToLoad = symbols.symbols;
    if (iconSearch.value) {
        iconsToLoad = iconsToLoad.filter((icon) => icon.includes(iconSearch.value));
    }

    iconsList.innerHTML = "";

    iconsToLoad.forEach(symbol => {
        const button = document.createElement('button');
        button.classList.add("button-class");

        const span = document.createElement('span');
        span.classList.add('material-symbols-outlined');
        span.classList.add('icon-span');
        span.textContent = symbol;

        button.appendChild(span);
        button.onclick = function () {
            iconSelected.textContent = symbol;
        }
        iconsList.appendChild(button);
    })
}

iconSearch.addEventListener("input", () => {
    loadIcons();
})

//save group
document.getElementById('submit').onclick = async function () {
    const group = new TabsGroup(groupName.value, iconSelected.textContent);
    group.windowId = windowId;

    //save current tabs to new group if there is no currentGroup
    if (!activeGroup) {
        const allTabs = await getAllOpenedTabs();
        group.tabs = allTabs
            .filter(tab => tab.windowId === windowId)
            .map(tab => new Tab(tab.id, tab.url));
    }

    //set data if it's an update
    if (groupToEdit) {
        group.id = groupToEdit.id;
        group.tabs = groupToEdit.tabs;
    }

    await saveGroup(group);
    await deleteGroupToEdit();

    //notify background if there is no active group or we've updated active group
    if (!activeGroup || activeGroup.id === group.id) {
        await saveActiveGroup(group, true);
    }
    notify(notifySidebarReloadGroups, false);
    window.close();
};

//delete group
deleteButton.onclick = async function () {
    let confirmDelete = confirm("Are you sure you want to delete this group?");

    if (confirmDelete) {
        await deleteGroup(groupToEdit.id);

        let openTabs = false;
        if (groupToEdit.id === activeGroup.id) {
            const allGroups = await getAllGroups();

            if (allGroups && allGroups.length > 0) {
                await saveActiveGroup(allGroups[0], true);
                openTabs = true;
            }
        }
        notify(notifySidebarReloadGroups, openTabs);
        window.close();
    }
}

