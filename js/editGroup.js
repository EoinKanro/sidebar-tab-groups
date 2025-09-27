import {deleteGroupToEditId, getActiveGroupId, getActiveWindowId, getGroupToEditId} from "./data/localStorage.js";
import {deleteGroup, getGroup, saveGroup} from "./data/databaseStorage.js";
import {
    BackgroundActiveGroupDeleted,
    BackgroundActiveGroupUpdatedEvent, BackgroundOpenFirstGroupTabsEvent,
    editGroupId, notify,
    notifyEditGroupActiveGroupChanged,
    notifyEditGroupGroupChanged, SidebarEditGroupClosedEvent,
    SidebarReloadGroupButtonsEvent
} from "./service/events.js";
import {getStyle, updatePopupStyle} from "./service/styleUtils.js";
import {Tab, TabsGroup} from "./data/tabs.js";
import {getAllOpenedTabs} from "./service/utils.js";

let activeGroupId = await getActiveGroupId();
let groupToEdit;

//----------------------- Document elements ------------------------------

const style = getStyle("js-style");
const header = document.getElementById('group-header')
const groupName = document.getElementById("group-name");
const iconSelected = document.getElementById("icon-selected");
const symbols = await (await fetch('../font/google-symbols.json')).json();
const iconSearch = document.getElementById("icon-search")
const iconsList = document.getElementById("icons-list");
const saveButton = document.getElementById('submit');
const deleteButton = document.getElementById("delete");

//------------------------------- Init -----------------------------------

await loadGroupToEdit();
loadAvailableIconsList();

browser.theme.getCurrent().then(theme => {
    loadTheme(theme);
})

function loadTheme(theme) {
    updatePopupStyle(style, theme);
}

//-------------------------- Event Listeners ------------------------------

//update theme on change
browser.theme.onUpdated.addListener(({ theme }) => {
    loadTheme(theme);
});

browser.runtime.onMessage.addListener( async (message, sender, sendResponse) => {
    if (!message.target.includes(editGroupId)) {
        return;
    }

    //edit was clicked again. changing data and focus window
    if (message.actionId === notifyEditGroupGroupChanged) {
        await loadGroupToEdit();

        const window = await browser.windows.getCurrent();
        if (window) {
            browser.windows.update(window.id, { focused: true });
        }
    } else if (message.actionId === notifyEditGroupActiveGroupChanged) {
        //active group was changed. should know it
        activeGroupId = await getActiveGroupId();
    }
})

//change list of icons when searching
iconSearch.oninput = function () {
    loadAvailableIconsList();
}

//notify sidebar that the window is closed
window.addEventListener('unload', () => {
    notify(new SidebarEditGroupClosedEvent());
});

//save group
saveButton.onclick = async function () {
    const group = new TabsGroup(groupName.value, iconSelected.textContent);
    group.windowId = await getActiveWindowId();

    //save current tabs to new group if there is no currentGroup
    if (!activeGroupId) {
        const allTabs = await getAllOpenedTabs();
        group.tabs = allTabs
            .filter(tab => tab.windowId === group.windowId)
            .map(tab => new Tab(tab.id, tab.url));
    }

    //edit active group
    if (groupToEdit && groupToEdit.id === activeGroupId) {
        notify(new BackgroundActiveGroupUpdatedEvent(group));
    } else {
        //create new one or edit common group
        //set data if it's update
        if (groupToEdit) {
            group.id = groupToEdit.id;
            group.tabs = groupToEdit.tabs;
        }
        await saveGroup(group);

        //set group as active if there is no active group
        if(!activeGroupId) {
            notify(new BackgroundActiveGroupUpdatedEvent(group))
        }
    }

    await deleteGroupToEditId();
    notify(new SidebarReloadGroupButtonsEvent());
    window.close();
};

//delete group
deleteButton.onclick = async function () {
    let confirmDelete = confirm("Are you sure you want to delete this group?");

    if (confirmDelete) {
        //in case if some tabs are loading
        if (groupToEdit.id === activeGroupId) {
            notify(new BackgroundActiveGroupDeleted());
        }

        await deleteGroup(groupToEdit.id);

        if (groupToEdit.id === activeGroupId) {
            notify(new BackgroundOpenFirstGroupTabsEvent());
        } else {
            notify(new SidebarReloadGroupButtonsEvent());
        }

        //todo close tabs
        await deleteGroupToEditId();
        window.close();
    }
}

//------------------------- Document Actions ------------------------------

//set values of group to edit to the page
async function loadGroupToEdit() {
    const groupToEditId = await getGroupToEditId();

    if (groupToEditId) {
        groupToEdit = await getGroup(groupToEditId);
    } else {
        groupToEdit = null;
    }

    if (groupToEdit) {
        header.textContent = 'Edit Group';
        groupName.value = groupToEdit.name;
        iconSelected.textContent = groupToEdit.icon;
        deleteButton.style.visibility = '';
    } else {
        header.textContent = 'New Group';
        groupName.value = '';
        iconSelected.textContent = '';
        deleteButton.style.visibility = 'hidden';
    }
}

function loadAvailableIconsList() {
    //todo theme from file
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
