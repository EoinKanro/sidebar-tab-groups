
import {
    BackgroundActiveGroupUpdatedEvent,
    BackgroundOpenTabsEvent, EditGroupGroupChangedEvent,
    notify, notifySidebarEditGroupClosed,
    notifySidebarReloadGroupButtons,
    notifySidebarUpdateActiveGroupButton, notifySidebarUpdateButtonsPadding,
    sidebarId
} from "./service/events.js";
import {getAllGroups, saveGroup} from "./data/databaseStorage.js";
import {deleteGroupToEditId, getActiveGroupId, saveActiveWindowId, saveGroupToEditId} from "./data/localStorage.js";
import {getLatestWindow} from "./service/utils.js";
import {getStyle, updateSidebarButtonsPadding, updateSidebarStyle} from "./service/styleUtils.js";

const editGroupContextMenuIdPattern = "edit-group-";
const moveGroupsContextId = "move-groups";
const stopMoveGroupsContextId = "stop-move-groups";
const groupIdAttribute = "groupId";
const selectedClass = "selected";
const shakeClass = "shake";

let editGroupOpened = false;
let movingButtons = false;
let draggedButton = null;

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

//context menu actions
browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === moveGroupsContextId) {
        //allow moving buttons
        movingButtons = true;
        updateTabGroupsButtonsDraggable(true);
    } else if (info.menuItemId === stopMoveGroupsContextId) {
        //stop moving buttons
        movingButtons = false;
        updateTabGroupsButtonsDraggable(false);
    } else if (info.menuItemId.startsWith(editGroupContextMenuIdPattern)) {
        //open group editor
        const id = info.menuItemId.replace(editGroupContextMenuIdPattern,"");
        await openGroupEditor(Number(id));
    }
});

//open group editor on click new group
document.getElementById('create-group').onclick = async function () {
    await openGroupEditor(null);
}

//allow dragging over other buttons (necessary to trigger drop)
tabButtons.ondragover = function (event)  {
    event.preventDefault(); //allow the drop
}

//handle the drop event to reorder buttons by index
tabButtons.ondrop = async function (event) {
    event.preventDefault(); //required to trigger the drop event

    //get the closest button under the drop position
    const targetButton = document.elementFromPoint(event.clientX, event.clientY).closest('.button-class');

    if (targetButton && draggedButton !== targetButton) {
        const allGroups = await getAllGroups();

        const allButtons = Array.from(tabButtons.children);
        const draggedIndex = allButtons.indexOf(draggedButton);
        const targetIndex = allButtons.indexOf(targetButton);

        //reorder the buttons based on their indexes
        if (draggedIndex > targetIndex) {
            //insert before
            tabButtons.insertBefore(draggedButton, targetButton);
        } else {
            //insert after
            tabButtons.insertBefore(draggedButton, targetButton.nextSibling);
        }

        const activeGroupId = await getActiveGroupId();
        const sortedGroupIds = [];
        for (let groupButton of tabButtons.children) {
            sortedGroupIds.push(Number(groupButton.getAttribute(groupIdAttribute)));
        }

        //update indexes
        for (let i = 0; i < sortedGroupIds.length; i++) {
            const groupToUpdate = allGroups.find(group => group.id === sortedGroupIds[i]);

            if (groupToUpdate.index === i) {
                continue;
            }

            groupToUpdate.index = i;
            if (activeGroupId === groupToUpdate.id) {
                notify(new BackgroundActiveGroupUpdatedEvent(groupToUpdate));
            } else {
                await saveGroup(groupToUpdate);
            }
        }
    }

    draggedButton = null;
}

//-------------------------- Document actions -------------------------

async function updateActiveGroupButton() {
    if (tabButtons.children.length <= 0) {
        return;
    }

    const activeGroupId = await getActiveGroupId();
    for (let groupButton of tabButtons.children) {
        const groupId = Number(groupButton.getAttribute(groupIdAttribute));

        if (groupId !== activeGroupId) {
            groupButton.classList.remove(selectedClass);
        } else {
            groupButton.classList.add(selectedClass);
        }
    }
}

async function reloadGroupButtons() {
    const allGroups = await getAllGroups();
    const activeGroupId = await getActiveGroupId();

    if (allGroups) {
        allGroups.sort((a, b) => {
            if (a.index >= 0 && b.index >= 0) {
                //sort by index if both positive
                return a.index - b.index;
            } else if (a.index >= 0 && (b.index === undefined || b.index < 0)) {
                //a positive first
                return -1;
            } else if ((a.index === undefined || a.index < 0) && b.index >= 0) {
                //b positive first
                return 1;
            } else if ((a.index === undefined  || a.index < 0) && (b.index === undefined || b.index < 0)) {
                //both negative. sort by id
                return a.id - b.id;
            }
            return 0;
        });

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

    //make draggable if in edit mode
    if (movingButtons) {
        button.draggable = true;
        button.classList.add(shakeClass);
    }

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

    //update style on drag
    //change appearance during drag
    button.ondragstart = function (event) {
        event.target.style.opacity = 0.4;
        draggedButton = event.target;
    };

    //reset appearance after drag
    button.ondragend = function (event) {
        event.target.style.opacity = '';
    }

    //add edit button to context menu on right click
    button.oncontextmenu = function () {
        //remove any existing custom context menu to avoid duplicates
        browser.contextMenus.removeAll();

        browser.contextMenus.create({
            id: `${editGroupContextMenuIdPattern}${group.id}`,
            title: `Edit Group ${group.name}`,
            contexts: ["all"]
        });

        if (!movingButtons) {
            browser.contextMenus.create({
                id: moveGroupsContextId,
                title: "Move groups",
                contexts: ["all"]
            });
        } else {
            browser.contextMenus.create({
                id: stopMoveGroupsContextId,
                title: "Stop moving groups",
                contexts: ["all"]
            });
        }
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

function updateTabGroupsButtonsDraggable(draggable) {
    for (let groupButton of tabButtons.children) {
        groupButton.draggable = draggable;

        if (draggable) {
            groupButton.classList.add(shakeClass);
        } else {
            groupButton.classList.remove(shakeClass);
        }
    }
}
