import {
    TabsGroup,
    getGroupToEdit,
    saveGroup,
    deleteGroup,
    deleteGroupToEdit, getActiveGroup, getAllOpenedTabs, Tab, saveActiveGroup
} from "./data/dataStorage.js";

import {
    notify,
    notifySidebarReloadGroups
} from "./data/events.js";

const groupToEdit = await getGroupToEdit();
const symbols = await (await fetch('../font/google-symbols.json')).json();

const groupName = document.getElementById("group-name");
const iconsList = document.getElementById("icons-list");
const iconSelected = document.getElementById("icon-selected");
const deleteButton = document.getElementById("delete");

//load tempGroup on open page
if (groupToEdit) {
    document.getElementById('group-header').textContent = 'Edit Group';
    groupName.value = groupToEdit.name;
    iconSelected.textContent = groupToEdit.icon;
    deleteButton.style.visibility = '';
} else {
    document.getElementById('group-header').textContent = 'New Group';
    deleteButton.style.visibility = 'hidden';
}

//load symbols to selector
symbols.symbols.forEach(symbol => {
    const button = document.createElement('button');
    // button.classList.add('button-class');

    const span = document.createElement('span');
    span.classList.add('material-symbols-outlined');
    span.textContent = symbol;

    button.appendChild(span);
    button.onclick = function () {
        iconSelected.textContent = symbol;
    }
    iconsList.appendChild(button);
})

//save group
document.getElementById('submit').onclick = async function () {
    const group = new TabsGroup(groupName.value, iconSelected.textContent);

    //save current tabs to new group if there is no currentGroup
    const activeGroup = await getActiveGroup();
    if (!activeGroup) {
        const allTabs = await getAllOpenedTabs();
        group.tabs = allTabs.map(tab => new Tab(tab.id, tab.url));
    }

    //set id if it's an update
    if (groupToEdit) {
        group.id = groupToEdit.id;
    }

    await saveGroup(group, false);
    await deleteGroupToEdit();

    //notify background if we changed active group
    if (!activeGroup || activeGroup.id === group.id) {
        await saveActiveGroup(group, true);
    }
    notify(notifySidebarReloadGroups, null);
    window.close();
};

//delete group
deleteButton.onclick = async function () {
    let confirmDelete = confirm("Are you sure you want to delete this group?");

    //TODO change group if active. mb notify sidebar
    if (confirmDelete) {
        await deleteGroup(groupToEdit, false);
        notify(notifySidebarReloadGroups, null);
        window.close();
    }
}
