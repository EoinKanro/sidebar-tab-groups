import {getLatestWindow} from "./data/utils.js";

const settingsButton = document.getElementById("settings-button");

settingsButton.addEventListener("click", async () => {
    const activeWindow = await getLatestWindow();
    // console.log(activeWindow)
    const viewportWidth = Math.round(activeWindow.width * 0.6);
    const viewportHeight = Math.round(activeWindow.height * 0.5);

    browser.windows.create({
        url: browser.runtime.getURL("../html/settings.html"),
        type: "popup",
        width: viewportWidth,
        height: viewportHeight
    })
})
