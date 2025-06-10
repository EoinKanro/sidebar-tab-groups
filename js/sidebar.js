import {
  getOrCreateStyleElement,
  initThemeStyle,
  updateSidebarButtonsPadding,
  updateSidebarStyle
} from "./service/styleUtils.js";
import {
  deletedGroupName,
  enableDebugLogsName,
  getEnableDebugLogs,
  getWindowIdGroupId,
  saveGroupToEditId,
  saveUpdatedGroup,
  sidebarButtonsPaddingPxName,
  updatedGroupName,
  windowIdGroupIdName
} from "./data/localStorage.js";
import {
  focusWindow,
  getCurrentWindow,
  getExtensionPopupWithName,
  openPopup
} from "./service/browserUtils.js";
import {notifyOpenTabGroup} from "./service/notifications.js";
import {getAllGroups, getGroup} from "./data/databaseStorage.js";
import {logInfo} from "./service/logUtils.js";

//----------------------- Document elements --------------------------

const tabButtons = document.getElementById('tab-buttons');
const sidebarButtonsPadding = getOrCreateStyleElement("style-buttons-padding");

//ids for context menu
const moveGroupsContextId = "move-groups";
const stopMoveGroupsContextId = "stop-move-groups";
const editGroupContextMenuIdPattern = "edit-group-";
//classes for style
const shakeClass = "shake";
const selectedClass = "selected";
//attribute for sorting and style
const groupIdAttribute = "groupId";
const groupNameAttribute = "groupName";

//temp
let movingButtons = false;
let draggedButton = null;

let activeGroupId;
let enableLogs = await getEnableDebugLogs();
const currentWindowId = (await getCurrentWindow()).id;

//----------------------- Initialization --------------------------

await init();

async function init() {
  initThemeStyle(updateSidebarStyle);

  await updateSidebarButtonsPadding(sidebarButtonsPadding);
  await updateActiveGroupId();
  await reloadGroupButtons();
}

//----------------------- Document actions --------------------------

async function updateActiveGroupId() {
  const windowIdGroupId = await getWindowIdGroupId();
  if (windowIdGroupId !== undefined && windowIdGroupId) {
    activeGroupId = windowIdGroupId.get(currentWindowId);
    return;
  }

  activeGroupId = null;
}

async function reloadGroupButtons() {
  const allGroups = await getAllGroups();

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

    tabButtons.replaceChildren();

    allGroups.forEach((group) => {
      const selected = group.id === activeGroupId;
      createGroupButton(group, selected);
    })
  }
}

async function createGroupButton(group) {
  const button = document.createElement('button');
  button.title = group.name;

  button.classList.add('button-class');
  button.setAttribute(groupIdAttribute, group.id);
  button.setAttribute(groupNameAttribute, group.name);

  //make draggable if in edit mode
  if (movingButtons) {
    button.draggable = true;
    button.classList.add(shakeClass);
  }

  //set selected
  if (activeGroupId && activeGroupId === group.id) {
    button.classList.add(selectedClass);
  }

  //add icon
  const span = document.createElement('span');
  span.classList.add('material-symbols-outlined');
  span.textContent = group.icon;

  button.appendChild(span);

  //call background to open group on left click
  button.onclick = async function () {
    //don't open if already opened
    if (activeGroupId && activeGroupId === group.id) {
      return;
    }

    //call background to open tabs
    notifyOpenTabGroup(currentWindowId, group.id);
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
      title: `Edit Group ${button.getAttribute(groupNameAttribute)}`,
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

async function updateActiveGroupButton() {
  if (tabButtons.children.length <= 0) {
    return;
  }

  for (let groupButton of tabButtons.children) {
    const groupId = Number(groupButton.getAttribute(groupIdAttribute));

    if (groupId !== activeGroupId) {
      groupButton.classList.remove(selectedClass);
    } else {
      groupButton.classList.add(selectedClass);
    }
  }
}

async function createOrUpdateGroupButtonIconAndName(group) {
  await createOrUpdateGroupButton(group, (groupButton, group) => {
    groupButton.setAttribute(groupNameAttribute, group.name);
    groupButton.children[0].textContent = group.icon;
  })
}

async function createOrUpdateGroupButtonIndex(group) {
  await createOrUpdateGroupButton(group, (groupButton, group) => {
    const ref = tabButtons.children[group.index] ?? null;
    parent.insertBefore(groupButton, ref);
  });
}

async function createOrUpdateGroupButton(group, updateFunction) {
  let groupButton = await getGroupButtonById(group.id);

  if (!groupButton) {
    await createGroupButton(group);
    return;
  }

  await updateFunction(groupButton, group);
}

async function deleteGroupButton(groupId) {
  let groupButton = await getGroupButtonById(groupId);
  if (groupButton) {
    tabButtons.removeChild(groupButton);
  }
}

async function getGroupButtonById(groupId) {
  return tabButtons.querySelector(
      `[groupId="${CSS.escape(groupId)}"]`
  );
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

async function openGroupEditor(groupId) {
  await saveGroupToEditId(groupId);

  let popup = getExtensionPopupWithName("html/editGroup.html");
  if (popup) {
    await focusWindow(popup.id);
  } else {
    await openPopup("../html/editGroup.html", 0.6, 0.5);
  }
}

//----------------------- Event Listeners --------------------------

// context menu actions
browser.contextMenus.onClicked.addListener(handleContextMenuClick);

async function handleContextMenuClick(info, tab) {
  try {
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
  } catch (e) {
    console.error(e);
  }
}

browser.storage.onChanged.addListener(async (changes, area) => {
  try {
    if (area !== 'local') {
      return;
    }

    logInfo(enableLogs, "Processing local storage changes...", changes)
    if (sidebarButtonsPaddingPxName in changes) {
      //update  style
      await updateSidebarButtonsPadding(sidebarButtonsPadding);
    } else if (updatedGroupName in changes) {
      //update button
      let update = changes[updatedGroupName]?.newValue;
      if (update === undefined || !update || update.changes === undefined || !update.changes) {
        return;
      }

      if ('name' in update.changes) {
        await createOrUpdateGroupButtonIconAndName(update.data);
      }
      if ('index' in update.changes) {
        await createOrUpdateGroupButtonIndex(update.data);
      }
    } else if (deletedGroupName in changes) {
      //delete button
      const groupId = changes[deletedGroupName]?.newValue?.data
      if (groupId === undefined || !groupId) {
        return;
      }
      await deleteGroupButton(groupId);
    } else if (windowIdGroupIdName in changes) {
      //update active group button
      await updateActiveGroupId();
      await updateActiveGroupButton();
    } else if (enableDebugLogsName in changes) {
      //logs
      enableLogs = changes[enableDebugLogsName].newValue;
    }
  } catch (e) {
    console.error(e);
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

    const sortedGroupIds = [];
    for (let groupButton of tabButtons.children) {
      sortedGroupIds.push(Number(groupButton.getAttribute(groupIdAttribute)));
    }

    //update indexes
    for (let i = 0; i < sortedGroupIds.length; i++) {
      const groupToUpdate = await getGroup(sortedGroupIds[i]);

      if (groupToUpdate === undefined || !groupToUpdate) {
        console.warn("Can't find group " + sortedGroupIds[i]);
        continue;
      }

      if (groupToUpdate.index === i) {
        continue;
      }

      groupToUpdate.index = i;
      await saveUpdatedGroup(['index'], groupToUpdate)
    }
  }

  draggedButton = null;
}
