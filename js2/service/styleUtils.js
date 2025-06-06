
const THEME_STYLE_ID = "theme-style";

/**
 * @param updateStyleFunction from section below
 */
export function initThemeStyle(updateStyleFunction) {
  console.log("Initializing theme style...")

  const themeStyleElement = getOrCreateStyleElement(THEME_STYLE_ID);
  
  applyStyleFromBrowser(themeStyleElement, updateStyleFunction);

  //update theme on click "Enable" in about:addons
  browser.theme.onUpdated.addListener(({ theme }) => {
    updateStyleFunction(themeStyleElement, theme);
  });

  //update theme on OS theme changes when Auto theme is enabled
  const lightSchemeMedia = window.matchMedia('(prefers-color-scheme: light)');
  lightSchemeMedia.addEventListener('change',
      () => applyStyleFromBrowser(themeStyleElement, updateStyleFunction));
}

function applyStyleFromBrowser(styleElement, updateStyleFunction) {
  browser.theme.getCurrent().then(theme => {
    updateStyleFunction(styleElement, theme);
  })
}

//------------------------ Utils ----------------------------

export function getOrCreateStyleElement(styleId) {
  let style = document.getElementById(styleId);
  if (style) {
    return style;
  }

  style = document.createElement("style");
  style.id = styleId;
  document.head.appendChild(style);
  return style;
}

function isThemeLight() {
  return window.matchMedia('(prefers-color-scheme: light)').matches;
}

//---------------- Update style functions -------------------

export function updatePopupStyle(styleElement, theme) {
  console.log("Updating popup theme...");

  let colors;

  if (theme?.colors) {
    colors = theme.colors;
  } else if (isThemeLight()) {
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

  styleElement.innerHTML =
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

export function updateSidebarStyle(styleElement, theme) {
  console.log("Updating sidebar theme...");

  let colors;

  if (theme?.colors) {
    colors = theme.colors;
  } else if (isThemeLight()) {
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

  styleElement.innerHTML =
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
