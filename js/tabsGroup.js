//todo windowId?
export class TabsGroup {
    constructor(id, name, icon, tabs) {
        this.id = id;
        this.name = name;
        this.icon = icon;
        this.tabs = tabs;
    }
}

export class Tab {
    constructor(id, url) {
        this.id = id;
        this.url = url;
    }
}

export const currentGroupName = "currentGroup";
export const groupToEditName = "groupToEdit";
export const groupToUpdateName = "groupToEdit";

export function getGroupName(group) {
    return `group-${group.id}`;
}

export async function getGroup(groupName) {
    const result = await browser.storage.local.get(groupName);
    return result[groupName];
}

export async function saveGroup(group) {
    const groupName = getGroupName(group);

    await browser.storage.local.set({[groupName]: group});
    console.log(`Saved group. Key: ${groupName}. Value: ${JSON.stringify(group, null, 0)}`);
}

export async function deleteGroup(groupName) {
    await browser.storage.local.delete(groupName);
}

export async function getAllTabs() {
    return await browser.tabs.query({});
}

export async function saveCurrentGroup(group) {
    await browser.storage.local.set( {[currentGroupName] : group} );
    console.log(`Set current group: ${JSON.stringify(group, null, 0)}`);
}

export async function getCurrentGroup() {
    return await getGroup(currentGroupName);
}

export async function saveGroupToEdit(group) {
    await browser.storage.local.set( {[groupToEditName] : group} );
    console.log(`Set group to edit: ${JSON.stringify(group, null, 0)}`);
}

export async function getGroupToEdit() {
    return await getGroup(groupToEditName);
}

export async function saveGroupToUpdate(group) {
    await browser.storage.local.set( {[groupToUpdateName] : group} );
    console.log(`Set group to update: ${JSON.stringify(group, null, 0)}`);
}

export async function getGroupToUpdate(group) {
    return await getGroup(groupToUpdateName);
}
