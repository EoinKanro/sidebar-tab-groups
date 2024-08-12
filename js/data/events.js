export class EventMessage {
    constructor(command, data) {
        this.command = command;
        this.data = data;
    }
}

/**
 * Database requests
 */
export const getFromDatabase = "getFromDatabase";
export const getAllFromDatabase = "getAllFromDatabase";
export const saveInDatabase = "saveInDatabase";
export const deleteFromDatabase = "deleteFromDatabase";
export const databaseAnswer = "databaseAnswer";

/**
 * Background requests
 */
export const notifyBackgroundCurrentGroupUpdated = "notifyBackgroundCurrentGroupUpdated";

/**
 * Sidebar requests
 */
export const notifySidebarReloadGroups = "notifySidebarReloadGroups";

export function notify(event, data) {
    console.log(`Sending to runtime. Event: ${event}. Data:`, data);
    browser.runtime.sendMessage(new EventMessage(event, data));
}
