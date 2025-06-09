
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

export const TABS_BEHAVIOR = Object.freeze({
    SUSPEND: "suspend",
    HIDE: "hide",
    CLOSE: "close"
});
