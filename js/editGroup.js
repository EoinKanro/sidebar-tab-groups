import {TabsGroup, getGroupToEdit, saveGroupToEdit, saveGroup, saveGroupToUpdate, deleteGroup} from "./tabsGroup.js";

let tempGroup = await getGroupToEdit();
const symbols = await (await fetch('../font/google-symbols.json')).json();

const groupName = document.getElementById("group-name");
const iconsList = document.getElementById("icons-list");
const iconSelected = document.getElementById("icon-selected");
const deleteButton = document.getElementById("delete");

//load tempGroup on open page
if (tempGroup) {
    document.getElementById('group-header').textContent = 'Edit Group';
    groupName.value = tempGroup.name;
    iconSelected.textContent = tempGroup.icon;
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
    if (tempGroup) {
        tempGroup.name = groupName.value;
        tempGroup.icon = iconSelected.textContent;
    } else {
        tempGroup = new TabsGroup(new Date().getTime(), groupName.value, iconSelected.textContent, []);
    }

    await saveGroup(tempGroup);
    await saveGroupToEdit(null);
    await saveGroupToUpdate(tempGroup);
    window.close();
};

//delete group
deleteButton.onclick = async function () {
    let confirmDelete = confirm("Are you sure you want to delete this group?");

    if (confirmDelete) {
        await deleteGroup(tempGroup);
        //todo fix
        await saveGroupToUpdate(tempGroup);
        window.close();
    }
}
