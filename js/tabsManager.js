import {getStyle, updatePopupStyle} from "./service/styleUtils.js";
import {getAllGroups} from "./data/databaseStorage.js";
import {getAllOpenedTabs} from "./service/utils.js";

const style = getStyle("js-style");
const groupsDiv = document.getElementById('groups-container')

let groupsAndDivs;
let draggedTabDiv;
let groupDivDraggedTabFrom;

//------------------------------- Init -----------------------------------

browser.theme.getCurrent().then(theme => {
    loadTheme(theme);
})

function loadTheme(theme) {
    updatePopupStyle(style, theme);
}

await loadGroups();
async function loadGroups() {
    groupsDiv.innerHTML = '';

    const allGroups = await getAllGroups();
    const allTabs = await getAllOpenedTabs();
    groupsAndDivs = [];

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
        //todo style: size, hover
        //todo close on right click I think
        const groupTabsDiv = document.createElement("div");
        groupTabsDiv.classList.add('group-tabs-container');

        group.tabs.forEach(tab => {
            const tabDiv = document.createElement("div");
            tabDiv.classList.add("tab-container");

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

            tabDiv.draggable = true;
            //change appearance during drag
            tabDiv.ondragstart = function (event) {
                event.target.style.opacity = 0.4;
                draggedTabDiv = tabDiv;
                groupDivDraggedTabFrom = tabDiv.parentElement;
            };

            //reset appearance after drag
            tabDiv.ondragend = function (event) {
                event.target.style.opacity = '';
            }

            tabDiv.appendChild(tabDivText);
            groupTabsDiv.appendChild(tabDiv);
        })

        //allow dragging over other tabs (necessary to trigger drop)
        groupTabsDiv.ondragover = function (event)  {
            event.preventDefault(); //allow the drop
        }

        //handle the drop event to reorder tabs by Y
        groupTabsDiv.ondrop = async function (event) {
            event.preventDefault(); //required to trigger the drop event

            //get the closest button under the drop position
            const targetTab = document.elementFromPoint(event.clientX, event.clientY).closest('.tab-container');

            if (targetTab && draggedTabDiv !== targetTab) {
                //remove from old div
                groupDivDraggedTabFrom.removeChild(draggedTabDiv);

                const targetTabY = targetTab.getBoundingClientRect().top;

                //reorder the tabs based on their Y
                if (event.clientY > targetTabY) {
                    //insert before
                    groupTabsDiv.insertBefore(draggedTabDiv, targetTab);
                } else {
                    //insert after
                    groupTabsDiv.insertBefore(draggedTabDiv, targetTab.nextSibling);
                }
            }

            draggedTabDiv = null;
            groupDivDraggedTabFrom = null;
        }

        groupDiv.appendChild(groupTabsDiv);
        groupsDiv.appendChild(groupDiv);

        groupsAndDivs.push({
            group: group,
            div: groupDiv
        });
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

