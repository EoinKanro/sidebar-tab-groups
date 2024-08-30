
export const backgroundId = 1;
export const sidebarId = 2;
export const editGroupId = 3;

//background
export const notifyBackgroundOpenTabs = 11;
export const notifyBackgroundOpenFirstGroupTabs = 12;
export const notifyBackgroundActiveGroupUpdated = 13;
export const notifyBackgroundActiveGroupDeleted = 14;
export const notifyBackgroundReinitBackup = 15;
export const notifyBackgroundRestoreBackup = 16;

//sidebar
export const notifySidebarUpdateActiveGroupButton = 21;
export const notifySidebarReloadGroupButtons = 22;
export const notifySidebarEditGroupClosed = 23;
export const notifySidebarUpdateButtonsPadding = 24;

//editGroup
export const notifyEditGroupGroupChanged = 31;
export const notifyEditGroupActiveGroupChanged = 32;

class Event {
    constructor(target = [], action = "", actionId = 0) {
        this.target = target;
        this.action = action;
        this.actionId = actionId;
    }
}

export function notify(event) {
    console.log("Sending event to runtime...", event);
    browser.runtime.sendMessage(event);
}

//---------------------- Background ----------------------

export class BackgroundOpenTabsEvent extends Event {
    constructor(groupId) {
        super([backgroundId], "notifyBackgroundOpenTabs", notifyBackgroundOpenTabs);
        this.groupId = groupId;
    }
}

export class BackgroundOpenFirstGroupTabsEvent extends Event {
    constructor() {
        super([backgroundId], "notifyBackgroundOpenFirstGroupTabs", notifyBackgroundOpenFirstGroupTabs);
    }
}

export class BackgroundActiveGroupUpdatedEvent extends Event {
    constructor(group) {
        super([backgroundId], "notifyBackgroundActiveGroupUpdated", notifyBackgroundActiveGroupUpdated);
        this.group = group;
    }
}

export class BackgroundActiveGroupDeleted extends Event {
    constructor() {
        super([backgroundId], "notifyBackgroundActiveGroupDeleted", notifyBackgroundActiveGroupDeleted);
    }
}

export class BackgroundReinitBackupEvent extends Event {
    constructor() {
        super([backgroundId], "notifyBackgroundReinitBackup", notifyBackgroundReinitBackup);
    }
}

export class BackgroundRestoreBackup extends Event {
    constructor(json) {
        super([backgroundId], "notifyBackgroundRestoreBackup", notifyBackgroundRestoreBackup);
        this.json = json;
    }
}

//---------------------- Sidebar ------------------------

export class SidebarUpdateActiveGroupButtonEvent extends Event {
    constructor() {
        super([sidebarId], "notifySidebarUpdateActiveGroupButton", notifySidebarUpdateActiveGroupButton);
    }
}

export class SidebarReloadGroupButtonsEvent extends Event {
    constructor() {
        super([sidebarId], "notifySidebarReloadGroupButtons", notifySidebarReloadGroupButtons);
    }
}

export class SidebarEditGroupClosedEvent extends Event {
    constructor() {
        super([sidebarId], "notifySidebarEditGroupClosed", notifySidebarEditGroupClosed);
    }
}

export class SidebarUpdateButtonsPadding extends Event {
    constructor() {
        super([sidebarId], "notifySidebarUpdateButtonsPadding", notifySidebarUpdateButtonsPadding);
    }
}

//--------------------- Edit group -----------------------

export class EditGroupGroupChangedEvent extends Event {
    constructor() {
        super([editGroupId], "notifyEditGroupGroupChanged", notifyEditGroupGroupChanged);
    }
}

export class EditGroupActiveGroupChangedEvent extends Event {
    constructor() {
        super([editGroupId], "notifyEditGroupActiveGroupChanged", notifyEditGroupActiveGroupChanged);
    }
}
