import {getLatestWindow} from "./service/utils.js";
import {getStyle, updatePopupStyle} from "./service/styleUtils.js";

//----------------------- Document elements ------------------------------

const settingsButton = document.getElementById("settings-button");
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
browser.theme.onUpdated.addListener(({ theme }) => {
    loadTheme(theme);
});

settingsButton.addEventListener("click", async () => {
    const activeWindow = await getLatestWindow();
    const viewportWidth = Math.round(activeWindow.width * 0.6);
    const viewportHeight = Math.round(activeWindow.height * 0.5);

    browser.windows.create({
        url: browser.runtime.getURL("../html/settings.html"),
        type: "popup",
        width: viewportWidth,
        height: viewportHeight
    })
})
