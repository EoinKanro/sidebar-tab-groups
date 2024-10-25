import {getLatestWindow} from "./service/utils.js";
import {getStyle, updatePopupStyle} from "./service/styleUtils.js";

//----------------------- Document elements ------------------------------

const openSidebarButton = document.getElementById("open-sidebar-button");
const settingsButton = document.getElementById("settings-button");
const tabsManagerButton = document.getElementById("tabs-manager-button");
const style = getStyle("js-style");

//------------------------------- Init -----------------------------------

browser.theme.getCurrent().then(theme => {
    loadTheme(theme);
})

function loadTheme(theme) {
    updatePopupStyle(style, theme);
}

//-------------------------- Event Listeners ------------------------------

//update theme on change
browser.theme.onUpdated.addListener(({theme}) => {
    loadTheme(theme);
});

//open sidebar
openSidebarButton.onclick = function () {
    browser.sidebarAction.open();
    window.close();
};

settingsButton.onclick = async function () {
    await openPopup("../html/settings.html");
};

tabsManagerButton.onclick = async function () {
    await openPopup("../html/tabsManager.html");
}

//-------------------- Utils ----------------------------

async function openPopup(url) {
    const activeWindow = await getLatestWindow();
    const viewportWidth = Math.round(activeWindow.width * 0.6);
    const viewportHeight = Math.round(activeWindow.height * 0.5);

    browser.windows.create({
        url: browser.runtime.getURL(url),
        type: "popup",
        width: viewportWidth,
        height: viewportHeight
    })
}
