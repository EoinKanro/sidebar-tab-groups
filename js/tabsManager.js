import {getStyle, updatePopupStyle} from "./service/styleUtils.js";
import {getAllGroups} from "./data/databaseStorage.js";
import {getAllOpenedTabs} from "./service/utils.js";

const style = getStyle("js-style");
const groups = document.getElementById('groups-container')

//------------------------------- Init -----------------------------------

browser.theme.getCurrent().then(theme => {
    loadTheme(theme);
})

function loadTheme(theme) {
    updatePopupStyle(style, theme);
}

await loadGroups();
async function loadGroups() {
    groups.innerHTML = '';

    const allGroups = await getAllGroups();
    const allTabs = await getAllOpenedTabs();

    allGroups.forEach((group) => {
        const groupDiv = document.createElement("div");
        groupDiv.classList.add("group-container");

        //header
        const groupHeader = document.createElement("h2");

        const tabGroupIcon = document.createElement('span');
        tabGroupIcon.classList.add('material-symbols-outlined');
        tabGroupIcon.classList.add('icon-span');
        tabGroupIcon.textContent = group.icon;

        groupHeader.appendChild(tabGroupIcon);
        groupHeader.appendChild(document.createTextNode(group.name));
        groupDiv.appendChild(groupHeader);

        //links
        //todo draggable
        //todo style: size, hover
        //todo close on right click I think
        const groupTabsDiv = document.createElement("div");
        groupTabsDiv.classList.add('group-tabs-container');

        group.tabs.forEach(tab => {
            const tabDiv = document.createElement("div");

            let tabDivText;

            const openedTab = allTabs.find(browserTab => tab.url === browserTab.url) || null;
            if (openedTab) {
                console.log(openedTab);

                const tabDivIcon = document.createElement("img");
                tabDivIcon.src = openedTab.favIconUrl;
                tabDivIcon.style.width = "16px";
                tabDivIcon.style.height = "16px";

                tabDiv.appendChild(tabDivIcon);

                tabDivText = document.createTextNode(openedTab.title);
            } else {
                tabDivText = document.createTextNode(tab.url);
            }

            tabDiv.appendChild(tabDivText);
            groupTabsDiv.appendChild(tabDiv);
        })

        groupDiv.appendChild(groupTabsDiv);
        groups.appendChild(groupDiv);
    })
}

//-------------------------- Event Listeners ------------------------------

//update theme on change
browser.theme.onUpdated.addListener(({ theme }) => {
    loadTheme(theme);
});

//todo update groups on CRUD of groups in editGroup
//todo update groups on update active group
//todo add save button?

