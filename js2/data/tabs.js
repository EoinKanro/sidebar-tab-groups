
export class TabsGroup {
    constructor(name, icon) {
        this.id = new Date().getTime();
        this.windowId = 0;
        this.index = -1;
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

export class UpdatedTabsGroup {
    constructor(id) {
        this.id = id;
        this.date = new Date().getTime();
    }
}

export const TABS_BEHAVIOR = Object.freeze({
    SUSPEND: "suspend",
    HIDE: "hide",
    CLOSE: "close"
});
