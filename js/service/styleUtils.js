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
    let colors;
    if (theme?.colors) {
        colors = theme.colors;
    } else {
        colors = {};
        colors.popup = "#fff";
        colors.popup_text = "rgb(21,20,26)";
        colors.toolbar = "rgba(207,207,216,.33)";
        colors.toolbar_text = "rgb(21,20,26)";
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
    let colors
    if (theme?.colors) {
        colors = theme.colors;
    } else {
        colors = {};

        colors.frame = "rgb(240, 240, 244)"
        colors.tab_background_text = "rgb(21, 20, 26)"
        colors.toolbar = "white"
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
                padding-top: ${paddingPx}px !important;
                padding-bottom: ${paddingPx}px !important;
            }
            `
    }
}
