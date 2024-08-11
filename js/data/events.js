export class EventMessage {
    constructor(command, data) {
        this.command = command;
        this.data = data;
    }
}

export function notify(event, data) {
    console.log(`[${event}] ${JSON.stringify(data)}`);
    browser.runtime.sendMessage(new EventMessage(event, data));
}

/**
 * Database requests
 */
export const getFromDatabase = "getFromDatabase";
export const getAllFromDatabase = "getAllFromDatabase";
export const saveInDatabase = "saveInDatabase";
export const deleteFromDatabase = "deleteFromDatabase";

/**
 * Background requests
 */
export const notifyBackgroundCurrentGroupUpdated = "notifyBackgroundCurrentGroupUpdated";

/**
 * Sidebar requests
 */
export const notifySidebarReloadGroups = "notifySidebarReloadGroups";
