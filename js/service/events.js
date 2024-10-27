
export const backgroundId = 1;
export const sidebarId = 2;
export const editGroupId = 3;
export const tabsManagerId = 4;

//background
export const notifyBackgroundOpenTabs = 10;
export const notifyBackgroundOpenFirstGroupTabs = 11;
export const notifyBackgroundActiveGroupUpdated = 12;
export const notifyBackgroundActiveGroupDeleted = 13;
export const notifyBackgroundReinitBackup = 14;
export const notifyBackgroundRestoreBackup = 15;

//sidebar
export const notifySidebarUpdateActiveGroupButton = 20;
export const notifySidebarReloadGroupButtons = 21;
export const notifySidebarEditGroupClosed = 22;
export const notifySidebarUpdateButtonsPadding = 23;

//editGroup
export const notifyEditGroupGroupChanged = 30;
export const notifyEditGroupActiveGroupChanged = 31;

//tabsManager
export const notifyTabsManagerReloadGroups = 40

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

//---------------------- Tabs Manager ----------------------------

export class TabsManagerReloadGroupsEvent extends Event {
    constructor() {
        super([tabsManagerId], "notifyTabsManagerReloadGroups", notifyTabsManagerReloadGroups);
    }
}
