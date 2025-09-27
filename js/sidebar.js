
import {
    BackgroundOpenTabsEvent, EditGroupGroupChangedEvent,
    notify, notifySidebarEditGroupClosed,
    notifySidebarReloadGroupButtons,
    notifySidebarUpdateActiveGroupButton, notifySidebarUpdateButtonsPadding,
    sidebarId
} from "./service/events.js";
import {getAllGroups} from "./data/databaseStorage.js";
import {deleteGroupToEditId, getActiveGroupId, saveActiveWindowId, saveGroupToEditId} from "./data/localStorage.js";
import {getLatestWindow} from "./service/utils.js";
import {getStyle, updateSidebarButtonsPadding, updateSidebarStyle} from "./service/styleUtils.js";

const editGroupContextMenuIdPattern = "edit-group-";
const groupIdAttribute = "groupId";
const selectedClass = "selected";

let editGroupOpened = false;

//----------------------- Document elements ------------------------------
const tabButtons = document.getElementById('tab-buttons');
const styleTheme = getStyle("style-theme")
const styleButtonsPadding = getStyle("style-buttons-padding");

//--------------------------------- Init --------------------------------

await reloadGroupButtons();
await loadButtonsPadding();

browser.theme.getCurrent().then(theme => {
    loadTheme(theme);
})

function loadTheme(theme) {
    updateSidebarStyle(styleTheme, theme);
}

async function loadButtonsPadding() {
    await updateSidebarButtonsPadding(styleButtonsPadding);
}

//----------------------- Event listeners --------------------------

//update theme on change
browser.theme.onUpdated.addListener(({ theme }) => {
    loadTheme(theme);
});

browser.runtime.onMessage.addListener( async (message, sender, sendResponse) => {
    if (!message.target.includes(sidebarId)) {
        return;
    }

    if (message.actionId === notifySidebarUpdateActiveGroupButton) {
        await updateActiveGroupButton();
    } else if (message.actionId === notifySidebarReloadGroupButtons) {
        await reloadGroupButtons();
    } else if (message.actionId === notifySidebarEditGroupClosed) {
        editGroupOpened = false;
    } else if (message.actionId === notifySidebarUpdateButtonsPadding) {
        await loadButtonsPadding();
    }
});

//open group editor on context menu button
browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId.startsWith(editGroupContextMenuIdPattern)) {
        const id = info.menuItemId.replace(editGroupContextMenuIdPattern,"");
        await openGroupEditor(Number(id));
    }
});

//open group editor on click new group
document.getElementById('create-group').onclick = async function () {
    await openGroupEditor(null);
}

//-------------------------- Document actions -------------------------

async function updateActiveGroupButton() {
    if (tabButtons.children.length <= 0) {
        return;
    }

    const activeGroupId = await getActiveGroupId();
    for (let groupButton of tabButtons.children) {
        const groupIdStr = groupButton.getAttribute(groupIdAttribute);

        if (!groupIdStr || (Number(groupIdStr) !== activeGroupId)) {
            groupButton.classList.remove(selectedClass);
        } else {
            groupButton.classList.add(selectedClass);
        }
    }
}

async function reloadGroupButtons() {
    const allGroups = await getAllGroups();
    let activeGroupId = await getActiveGroupId();

    if (allGroups) {
        tabButtons.innerHTML = '';

        allGroups.forEach((group) => {
            const selected = group.id === activeGroupId;
            createGroupButton(group, selected);
        })
    }
}

async function createGroupButton(group, selected) {
    const button = document.createElement('button');
    button.title = group.name;

    button.classList.add('button-class');
    button.setAttribute(groupIdAttribute, group.id);

    //set style selected
    if (selected) {
        button.classList.add(selectedClass);
    }

    const span = document.createElement('span');
    span.classList.add('material-symbols-outlined');
    span.textContent = group.icon;

    button.appendChild(span);

    //call background to open group on left click
    button.onclick = async function () {
        //don't open if already opened
        const activeGroup = await getActiveGroupId();
        if (activeGroup && activeGroup === group.id) {
            return;
        }

        //save current window id to open all tabs here
        await saveActiveWindowId((await getLatestWindow()).id)

        //call background
        notify(new BackgroundOpenTabsEvent(group.id))
    }

    //add edit button to context menu on right click
    button.oncontextmenu = function () {
        // Remove any existing custom context menu to avoid duplicates
        browser.contextMenus.removeAll();

        browser.contextMenus.create({
            id: `${editGroupContextMenuIdPattern}${group.id}`,
            title: `Edit Group ${group.name}`,
            contexts: ["all"]
        });
    }

    //add button
    tabButtons.appendChild(button);
}

async function openGroupEditor(groupId) {
    if (!groupId) {
        await deleteGroupToEditId()
    } else {
        await saveGroupToEditId(groupId);
    }

    //don't open page again, just reload content
    if (editGroupOpened) {
        notify(new EditGroupGroupChangedEvent());
        return
    }

    const activeWindow = await getLatestWindow();
    const viewportWidth = Math.round(activeWindow.width * 0.6);
    const viewportHeight = Math.round(activeWindow.height * 0.5);

    editGroupOpened = true;
    browser.windows.create({
        url: browser.runtime.getURL("../html/editGroup.html"),
        type: "popup",
        width: viewportWidth,
        height: viewportHeight
    })
}
