//todo windowId?
import {
    getFromDatabase,
    getAllFromDatabase,
    saveInDatabase,
    deleteFromDatabase,
    notifyBackgroundCurrentGroupUpdated,
    notify,
    EventMessage
} from "./events.js"

import {tabGroupsName, Request, getData, getAllData, saveData, deleteData} from "./database.js"

export class TabsGroup {
    constructor(name, icon) {
        this.id = new Date().getTime();
        this.name = name;
        this.icon = icon;
        this.tabs = [];
    }
}

export class Tab {
    constructor(id, url) {
        this.id = id;
        this.url = url;
    }
}

const activeGroupName = "activeGroup";
const editGroupName = "editGroup";

export async function getAllOpenedTabs() {
    return await browser.tabs.query({});
}



/**
 * @returns {Promise<unknown>} group/null
 */
export async function getGroup(groupId, currentContext) {
    return await sendRequestToDatabase(getFromDatabase, tabGroupsName, groupId, currentContext);
}

/**
 * @returns {Promise<unknown>} true/false/null
 */
export async function saveGroup(group, currentContext) {
    return await sendRequestToDatabase(saveInDatabase, tabGroupsName, group, currentContext);
}

/**
 * @returns {Promise<unknown>} true/false
 */
export async function deleteGroup(groupId, currentContext) {
    return await sendRequestToDatabase(deleteFromDatabase, tabGroupsName, groupId, currentContext);
}

/**
 * @returns {Promise<unknown>} array/null
 */
export async function getAllGroups(currentContext) {
    return await sendRequestToDatabase(getAllFromDatabase, tabGroupsName, null, currentContext);
}



export async function getActiveGroup() {
    return await getFromLocalStorage(activeGroupName);
}

export async function saveActiveGroup(group, isNotify) {
    await saveToLocalStorage(activeGroupName, group);
    if (isNotify) {
        notify(notifyBackgroundCurrentGroupUpdated, group);
    }
}

export async function deleteActiveGroup(isNotify) {
    await saveToLocalStorage(activeGroupName, null);
    if (isNotify) {
        notify(notifyBackgroundCurrentGroupUpdated, null);
    }
}


export async function saveGroupToEdit(group) {
    await saveToLocalStorage(editGroupName, group)
}

export async function getGroupToEdit() {
    return getFromLocalStorage(editGroupName);
}

export async function deleteGroupToEdit() {
    await saveToLocalStorage(editGroupName, null);
}



async function getFromLocalStorage(key) {
    return (await browser.storage.local.get(key))[key];
}

async function saveToLocalStorage(key, value) {
    await browser.storage.local.set({ [key]: value });
}

function sendRequestToDatabase(event, storeName, data, currentContext) {
    if (currentContext) {
        return sendRequestToDatabaseCurrentContext(event, storeName, data);
    }
    return sendRequestToDatabaseSeparateContext(event, storeName, data);

}

function sendRequestToDatabaseCurrentContext(event, storeName, data) {
    return new Promise(async (resolve, reject) => {
        let result;
        const request = new Request(storeName, data);
        if (event === getFromDatabase) {
            result = await getData(request);
        } else if (event === getAllFromDatabase) {
            result = await getAllData(request);
        } else if (event === saveInDatabase) {
            result = await saveData(request)
        } else if (event === deleteFromDatabase) {
            result = await deleteData(request);
        }

        if (result) {
            resolve(result);
        }
        resolve(null);
    })
}

function sendRequestToDatabaseSeparateContext(event, storeName, data) {
    return new Promise((resolve, reject) => {
        browser.runtime.sendMessage(new EventMessage(event, new Request(storeName, data)))
            .then(response => {
                console.log(response)
                resolve(response);
            })
            .catch(error => {
                console.log(error)
                resolve(null);
            });
    })
}
