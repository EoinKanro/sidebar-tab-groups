import {deleteAllData, deleteData, getAllData, getData, saveData, tabGroupsName} from "./database.js";

/**
 * @returns {TabsGroup} group/null
 */
export async function getGroup(groupId) {
    return await getData(tabGroupsName, groupId);
}

/**
 * @returns {Boolean} true/false
 */
export async function saveGroup(group) {
    return await saveData(tabGroupsName, group);
}

/**
 * @returns {Boolean} true/false
 */
export async function deleteGroup(groupId) {
    return await deleteData(tabGroupsName, groupId);
}

/**
 * @returns {[TabsGroup]} array/null
 */
export async function getAllGroups() {
    return await getAllData(tabGroupsName);
}

/**
 * @returns {Boolean} true/false
 */
export async function deleteAllGroups() {
    return await deleteAllData(tabGroupsName);
}
