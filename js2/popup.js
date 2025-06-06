import {initThemeStyle, updatePopupStyle} from "./service/styleUtils.js";

//---------------------- Document elements -----------------------

const openSidebarButton = document.getElementById("open-sidebar-button");
const settingsButton = document.getElementById("settings-button");
const tabsManagerButton = document.getElementById("tabs-manager-button");

// -------------------- Initialization --------------------------

initThemeStyle(updatePopupStyle);

//----------------------- Event Listeners -----------------------

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
  const viewportWidth = Math.round(window.screen.width * widthMultiplier);
  const viewportHeight = Math.round(window.screen.height * heightMultiplier);

  browser.windows.create({
    url: browser.runtime.getURL(url),
    type: "popup",
    width: viewportWidth,
    height: viewportHeight
  })
}
