import {getLatestWindow} from "./data/utils.js";

//load style
let style = document.getElementById("js-style")
if (!style) {
    style = document.createElement('style');
    style.id = "js-style";
    document.head.appendChild(style);
}
browser.theme.getCurrent().then(theme => {
    let colors;
    if (theme?.colors) {
        colors = theme.colors;
    } else {
        colors = {};
        colors.popup = "#fff";
        colors.popup_text = "rgb(21,20,26)";
        colors.button = "rgba(207,207,216,.33)";
        colors.button_active = "rgb(207,207,216)";
    }

    style.innerHTML =
        `
        body {
            background-color: ${colors.popup};
            color: ${colors.popup_text};
        }
        
        .button-class {
            background-color: ${colors.button};
            color: ${colors.popup_text};
        }
        
        .button-class:hover {
            background-color: ${colors.button_active} !important;
        }
        
        `;
})

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
