export class EventMessage {
    constructor(command, data) {
        this.command = command;
        this.data = data;
    }
}

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
