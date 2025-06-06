import {initThemeStyle, updatePopupStyle} from "./service/styleUtils.js";
import {getAllGroups, saveGroup} from "./data/databaseStorage.js";
import {getAllOpenedTabs} from "./service/browserUtils.js";
import {
  deletedGroupName,
  saveUpdatedGroup,
  updatedGroupName
} from "./data/localStorage.js";
import {Tab} from "./data/tabs.js";

//----------------------- Document elements ----------------------

//classes for style and navigation on save
const groupTabsContainerClass = "group-tabs-container";
//attributes for getting data on save
const groupIdAttributeName = "group-id";
const tabUrlAttributeName = "tab-url";
//for context menu
const contextMenuId = "tabsManagerRemoveTab";

const tooltipSpan = document.getElementById('tooltip');
const groupsDiv = document.getElementById('groups-container');
const saveButton = document.getElementById('save-button');

//temp
let draggedTabDiv;
let contextMenuTabDiv;
let saveInProcess = false;

//----------------------- Initialization -------------------------

await init();

async function init() {
  initThemeStyle(updatePopupStyle);
  await loadGroups();
}

//----------------------- Document Actions -----------------------

async function loadGroups() {
  draggedTabDiv = null;
  contextMenuTabDiv = null;
  groupsDiv.replaceChildren();

  const allGroups = await getAllGroups();
  const allTabs = await getAllOpenedTabs();

  allGroups.forEach((group) => {
    const groupDiv = document.createElement("div");
    groupDiv.classList.add("group-container");

    //header
    const groupHeader = document.createElement("h2");

    const tabGroupIcon = document.createElement('span');
    tabGroupIcon.classList.add('material-symbols-outlined');
    tabGroupIcon.classList.add('icon-span');
    tabGroupIcon.textContent = group.icon;

    groupHeader.appendChild(tabGroupIcon);
    groupHeader.appendChild(document.createTextNode(group.name));
    groupDiv.appendChild(groupHeader);

    //div with all links
    const groupTabsDiv = document.createElement("div");
    groupTabsDiv.classList.add(groupTabsContainerClass);
    groupTabsDiv.setAttribute(groupIdAttributeName, group.id);

    group.tabs.forEach(tab => {
      const tabDiv = document.createElement("div");
      tabDiv.classList.add("tab-container");
      tabDiv.classList.add("button-class");
      tabDiv.setAttribute(tabUrlAttributeName, tab.url);

      let tabDivText;

      const openedTab = allTabs.find(browserTab => tab.url === browserTab.url) || null;
      if (openedTab) {
        //icon of actual tab
        const tabDivIcon = document.createElement("img");
        tabDivIcon.src = openedTab.favIconUrl;
        tabDivIcon.style.width = "16px";
        tabDivIcon.style.height = "16px";

        tabDiv.appendChild(tabDivIcon);

        //text of actual tab
        tabDivText = document.createTextNode(openedTab.title);
      } else {
        //just url
        tabDivText = document.createTextNode(tab.url);
      }
      tabDiv.appendChild(tabDivText);
      groupTabsDiv.appendChild(tabDiv);

      //--------------- Actions with mouse ----------------
      tabDiv.draggable = true;
      //change appearance during drag
      tabDiv.ondragstart = function (event) {
        event.target.style.opacity = 0.4;
        draggedTabDiv = tabDiv;
      };

      //reset appearance after drag
      tabDiv.ondragend = function (event) {
        event.target.style.opacity = '';
      }

      //show tooltip on hover
      tabDiv.onmouseover = function (event) {
        tooltipSpan.textContent = tabDivText.textContent;
        tooltipSpan.style.visibility = "visible"
      }

      //hide tooltip
      tabDiv.onmouseout = function (event) {
        tooltipSpan.style.visibility = "hidden"
      }

      //context menu delete button
      tabDiv.oncontextmenu = function () {
        //remove any existing custom context menu to avoid duplicates
        browser.contextMenus.removeAll();

        contextMenuTabDiv = tabDiv;

        browser.contextMenus.create({
          id: contextMenuId,
          title: 'Remove tab [Shift + Click]',
          contexts: ["all"]
        })
      }

      //delete on shift + click
      tabDiv.onclick = function (event) {
        if (event.shiftKey) {
          tabDiv.parentElement.removeChild(tabDiv);
        }
      }
    })

    //allow dragging over other tabs (necessary to trigger drop)
    groupTabsDiv.ondragover = function (event)  {
      event.preventDefault(); //allow the drop
    }

    //handle the drop event to reorder tabs by Y
    groupTabsDiv.ondrop = async function (event) {
      event.preventDefault(); //required to trigger the drop event

      //get the closest button under the drop position
      const targetTab = document.elementFromPoint(event.clientX, event.clientY).closest('.tab-container');

      if (targetTab && draggedTabDiv !== targetTab) {
        //remove from old div
        draggedTabDiv.parentElement.removeChild(draggedTabDiv);

        const targetTabY = targetTab.getBoundingClientRect().top;

        //reorder the tabs based on their Y
        if (event.clientY > targetTabY) {
          //insert before
          groupTabsDiv.insertBefore(draggedTabDiv, targetTab);
        } else {
          //insert after
          groupTabsDiv.insertBefore(draggedTabDiv, targetTab.nextSibling);
        }
      }

      draggedTabDiv = null;
    }

    groupDiv.appendChild(groupTabsDiv);
    groupsDiv.appendChild(groupDiv);
  })
}

//---------------------- Event Listeners --------------------
//context menu actions
browser.contextMenus.onClicked.addListener(handleContextMenuClick);

function handleContextMenuClick(info, tab) {
  //remove tab from group
  if (info.menuItemId === contextMenuId) {
    contextMenuTabDiv.parentElement.removeChild(contextMenuTabDiv);
    contextMenuTabDiv = null;
  }
}

browser.storage.onChanged.addListener(async (changes, area) => {
  try {
    if (area !== 'local') {
      return;
    }

    if (!saveInProcess && (updatedGroupName in changes || deletedGroupName in changes)) {
      await loadGroups();
    }
  } catch (e) {
    console.error(e);
  }
});

//save groups
saveButton.onclick = async function (event) {
  let confirmSave = confirm("Save changes?");

  if (!confirmSave) {
    return;
  }

  saveInProcess = true;

  const groups = groupsDiv.children;
  if (groups.length <= 0) {
    return;
  }

  const allGroups = await getAllGroups();
  if (!allGroups || allGroups.length <= 0) {
    alert("Nothing to save");
    window.close();
    return;
  }

  for (let groupContainer of groups) {
    const groupTabsContainer = groupContainer.getElementsByClassName(groupTabsContainerClass).item(0);

    const groupId = Number(groupTabsContainer.getAttribute(groupIdAttributeName));
    const targetGroup = allGroups.find(group => group.id === groupId);

    if (!targetGroup) {
      console.warn("Can't find group with id " + groupId);
      continue;
    }

    const tabs = [];
    for (let tab of groupTabsContainer.children) {
      tabs.push(new Tab(0, tab.getAttribute(tabUrlAttributeName)));
    }

    targetGroup.tabs = tabs;
  }

  console.log("Result:", allGroups);
  for (let group of allGroups) {
    await saveGroup(group);
    await saveUpdatedGroup(group.id);
  }
  window.close();
}
