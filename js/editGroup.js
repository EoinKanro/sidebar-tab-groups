import {initThemeStyle, updatePopupStyle} from "./service/styleUtils.js";
import {
  getGroupToEditId,
  groupToEditIdName,
  saveDeletedGroup,
  saveUpdatedGroup
} from "./data/localStorage.js";
import {getGroup} from "./data/databaseStorage.js";
import {TabsGroup} from "./data/dataClasses.js";

let groupToEdit;

//----------------------- Document elements ----------------------

const header = document.getElementById('group-header')
const groupName = document.getElementById("group-name");
const iconSelected = document.getElementById("icon-selected");
const symbols = await (await fetch('../font/google-symbols.json')).json();
const iconSearch = document.getElementById("icon-search")
const iconsList = document.getElementById("icons-list");
const saveButton = document.getElementById('submit');
const deleteButton = document.getElementById("delete");

//----------------------- Initialization ----------------------

await init();

async function init() {
  initThemeStyle(updatePopupStyle);
  loadAvailableIconsList();
  await loadGroupToEdit();
}

//---------------------- Document actions ----------------------

function loadAvailableIconsList() {
  let iconsToLoad = symbols.symbols;
  if (iconSearch.value) {
    iconsToLoad = iconsToLoad.filter((icon) => icon.includes(iconSearch.value));
  }

  iconsList.replaceChildren();

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

//--------------------- Event listeners -------------------------

//change list of icons when searching
iconSearch.oninput = function () {
  loadAvailableIconsList();
}

browser.storage.onChanged.addListener(async (changes, area) => {
  try {
    if (area !== 'local') {
      return;
    }

    if (groupToEditIdName in changes) {
      await loadGroupToEdit();
    }
  } catch (e) {
    console.error(e);
  }
});

//save group
saveButton.onclick = async function () {
  let group;

  if (groupToEdit) {
    group = await getGroup(groupToEdit.id);
    group.name = groupName.value;
    group.icon = iconSelected.textContent;
  } else {
    group = new TabsGroup(groupName.value, iconSelected.textContent);
  }

  await saveUpdatedGroup(['name', 'icon'], group);
  window.close();
};


//delete group
deleteButton.onclick = async function () {
  let confirmDelete = confirm("Are you sure you want to delete this group?");

  if (!confirmDelete) {
    return;
  }

  await saveDeletedGroup(groupToEdit.id);
  window.close();
}
