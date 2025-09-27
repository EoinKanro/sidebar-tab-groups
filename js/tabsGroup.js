export class TabsGroup {
    constructor(id, name, icon, tabs) {
        this.id = id;
        this.name = name;
        this.icon = icon;
        this.tabs = tabs;
    }
}

export function getGroupName(group) {
    return `group-${group.id}`
}

export async function getGroup(groupName) {
    const result = await browser.storage.local.get(groupName);
    return result[groupName];
}

export async function saveGroup(group) {
    const groupName = getGroupName(group);

    await browser.storage.local.set({[groupName]: group})
    console.log(`Saved group. Key: ${groupName}. Value: ${group}`);
}

export async function getAllTabs() {
    return await browser.tabs.query({});
}

export async function saveCurrentGroup(group) {
    await browser.storage.local.set( {["currentGroup"] : group} )
}

export async function getCurrentGroup() {
    return await getGroup("currentGroup");
}
