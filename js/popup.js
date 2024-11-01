import {getLatestWindow} from "./service/utils.js";
import {getStyle, updatePopupStyle} from "./service/styleUtils.js";

//----------------------- Document elements ------------------------------

const openSidebarButton = document.getElementById("open-sidebar-button");
const settingsButton = document.getElementById("settings-button");
const tabsManagerButton = document.getElementById("tabs-manager-button");
const style = getStyle("js-style");

//------------------------------- Init -----------------------------------

loadThemeFromBrowser();

function loadThemeFromBrowser() {
    browser.theme.getCurrent().then(theme => {
        loadTheme(theme);
    })
}

function loadTheme(theme) {
    updatePopupStyle(style, theme);
}

//-------------------------- Event Listeners ------------------------------

//update theme on change
browser.theme.onUpdated.addListener(({theme}) => {
    loadTheme(theme);
});

const lightSchemeMedia = window.matchMedia('(prefers-color-scheme: light)');
lightSchemeMedia.addEventListener('change', loadThemeFromBrowser);

//open sidebar
openSidebarButton.onclick = function () {
    browser.sidebarAction.open();
    window.close();
};

settingsButton.onclick = async function () {
    await openPopup("../html/settings.html", 0.6, 0.5);
};

tabsManagerButton.onclick = async function () {
    await openPopup("../html/tabsManager.html", 0.8, 0.8);
}

//-------------------- Utils ----------------------------

async function openPopup(url, widthMultiplier, heightMultiplier) {
    const activeWindow = await getLatestWindow();
    const viewportWidth = Math.round(activeWindow.width * widthMultiplier);
    const viewportHeight = Math.round(activeWindow.height * heightMultiplier);

    browser.windows.create({
        url: browser.runtime.getURL(url),
        type: "popup",
        width: viewportWidth,
        height: viewportHeight
    })
}
