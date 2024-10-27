import {getSidebarButtonsPaddingPx} from "../data/localStorage.js";

export function getStyle(styleId) {
    let style = document.getElementById(styleId);
    if (style) {
        return
    }

    style = document.createElement("style");
    style.id = styleId;
    document.head.appendChild(style);
    return style;
}

export function updatePopupStyle(style, theme) {
    console.log("Updating popup theme...");

    let colors;
    const isLight = isThemeLight();

    if (theme?.colors) {
        colors = theme.colors;
    } else if (isLight) {
        colors = {};
        colors.popup = "#fff";
        colors.popup_text = "rgb(21,20,26)";
        colors.toolbar = "rgba(207,207,216,.33)";
        colors.toolbar_text = "rgb(21,20,26)";
    } else {
        colors = {};
        colors.popup = "rgb(66,65,77)";
        colors.popup_text = "rgb(251,251,254)";
        colors.toolbar = "rgb(43,42,51)";
        colors.toolbar_text = "rgb(251, 251, 254)";
    }

    style.innerHTML =
        `
        body {
            background-color: ${colors.popup};
            color: ${colors.popup_text};
        }
        
        .button-class {
            background-color: ${colors.toolbar};
            color: ${colors.toolbar_text};
        }

        #icon-selected {
            background-color: ${colors.toolbar} !important;
            color: ${colors.toolbar_text};
        }
        `;
}

export function updateSidebarStyle(style, theme) {
    console.log("Updating sidebar theme...");

    let colors;
    const isLight = isThemeLight();

    if (theme?.colors) {
        colors = theme.colors;
    } else if (isLight) {
        colors = {};
        colors.frame = "rgb(240, 240, 244)"
        colors.tab_background_text = "rgb(21, 20, 26)"
        colors.toolbar = "white"
    } else {
        colors = {};
        colors.frame = "rgb(28, 27, 34)"
        colors.tab_background_text = "#fbfbfe"
        colors.toolbar = "rgb(43,42,51)"
    }

    style.innerHTML =
        `
        body {
            background-color: ${colors.frame} !important;
        }
        
        .button-class {
            background-color: ${colors.frame} !important;
            color: ${colors.tab_background_text} !important;
        }
        
        .button-class:hover {
            background-color: ${colors.toolbar} !important;
        }
        
        .selected {
            background-color: ${colors.toolbar} !important;
        }
        `;
}

export async function updateSidebarButtonsPadding(style) {
    const paddingPx = await getSidebarButtonsPaddingPx();
    if (paddingPx) {
        style.innerHTML =
            `
            .button-class {
                height: ${paddingPx * 2}px !important;
            }
            `
    }
}

function isThemeLight() {
    return window.matchMedia('(prefers-color-scheme: light)').matches;
}
