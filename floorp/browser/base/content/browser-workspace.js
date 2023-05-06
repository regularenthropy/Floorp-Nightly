

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//use _gBrowser instead of gBrowser when startup
const WORKSPACE_TAB_ENABLED_PREF = "floorp.browser.workspace.tab.enabled";
const WORKSPACE_CURRENT_PREF = "floorp.browser.workspace.current";
const WORKSPACE_ALL_PREF = "floorp.browser.workspace.all";
const WORKSPACE_TABS_PREF = "floorp.browser.workspace.tabs.state";
const l10n = new Localization(["browser/floorp.ftl"], true);
const defaultWorkspaceName = l10n.formatValueSync("workspace-default")

function initWorkspace() { 
    //first run
    if (Services.prefs.getStringPref(WORKSPACE_CURRENT_PREF) == "") {
      Services.prefs.setStringPref(WORKSPACE_CURRENT_PREF, defaultWorkspaceName);
      Services.prefs.setStringPref(WORKSPACE_ALL_PREF, defaultWorkspaceName);
    }
    let tabs = gBrowser.tabs;
    if(Services.prefs.getStringPref(WORKSPACE_TABS_PREF) == "[]"){
      for (let i = 0; i < tabs.length; i++) {
        tabs[i].setAttribute("floorp-workspace", Services.prefs.getStringPref(WORKSPACE_CURRENT_PREF));
      }
    } else {
      for (let i = 0; i < tabs.length; i++) {
        let tabsState = JSON.parse(Services.prefs.getStringPref(WORKSPACE_TABS_PREF));
        let tabStateSetting = tabsState[i];
        let workspace = tabStateSetting?.[i]?.workspace ?? Services.prefs.getStringPref(WORKSPACE_CURRENT_PREF);
        tabs[i].setAttribute("floorp-workspace", workspace);
      }
    }
    //add workspace menu form pref
    let workspaceAll = Services.prefs.getStringPref(WORKSPACE_ALL_PREF).split(",");
    for (let i = 0; i < workspaceAll.length; i++) {
      let label = workspaceAll[i];
      addWorkspaceElemToMenu(label);
    }
}
function deleteworkspace(workspace) {
 if  (workspace !== defaultWorkspaceName) {
  let allWorkspaces = Services.prefs.getCharPref(WORKSPACE_ALL_PREF).split(",");
  let index = allWorkspaces.indexOf(workspace);
  allWorkspaces.splice(index, 1);
  Services.prefs.setCharPref(WORKSPACE_ALL_PREF, allWorkspaces.join(","));

  //delete workspace tabs
  let tabs = gBrowser.tabs;
  for (let i = 0; i < tabs.length; i++) {
    let tab = tabs[i];
    let tabWorkspace = tab.getAttribute("floorp-workspace");
    if (tabWorkspace == workspace) {
      gBrowser.removeTab(tab);
    }
  }
  //delete workspace menuitem
  let menuitem = document.querySelector(`#workspace-${workspace}`);
  menuitem.remove();
  
  //move to other workspace
  let currentWorkspace = Services.prefs.getStringPref(WORKSPACE_CURRENT_PREF);
  if (currentWorkspace == workspace) {
    Services.prefs.setStringPref(WORKSPACE_CURRENT_PREF, allWorkspaces[0]);
    setCurrentWorkspace();
  }
 }
}

function setCurrentWorkspace() {
  let tabs = gBrowser.tabs;
  let currentWorkspace = Services.prefs.getStringPref(WORKSPACE_CURRENT_PREF);

  document.querySelector(`[floorp-lastVisibleTab]`)?.removeAttribute("floorp-lastVisibleTab")
  document.querySelector(`[floorp-firstVisibleTab]`)?.removeAttribute("floorp-firstVisibleTab")
  let lastTab = null
  let firstTab = null
  for (let i = 0; i < tabs.length; i++) {
    let tab = tabs[i];
    let workspace = tab.getAttribute("floorp-workspace");
    if (workspace == currentWorkspace || !Services.prefs.getBoolPref(WORKSPACE_TAB_ENABLED_PREF)) {
      gBrowser.showTab(tab);
      lastTab = tab
      if(firstTab == null){
        tab.setAttribute("floorp-firstVisibleTab","true")
        firstTab = tab
      }
    } else {
      gBrowser.hideTab(tab);
    }

    if(currentWorkspace != l10n.formatValueSync("workspace-default")){
      document.getElementById("workspace-button").setAttribute("label", currentWorkspace);
      document.querySelector("#workspace-button > .toolbarbutton-text").style.display = "inherit"
    } else {
      document.getElementById("workspace-button").removeAttribute("label");
      document.querySelector("#workspace-button > .toolbarbutton-text").style.display = "none"
    }
  }
  lastTab?.setAttribute("floorp-lastVisibleTab","true")
} 

function saveWorkspaceState() {
  let tabs = gBrowser.tabs;
  let tabStateObject = [];
  for (let i = 0; i < tabs.length; i++) {
    let tab = tabs[i];
    let tabState = {
     [i]: {
        "workspace": tab.getAttribute("floorp-workspace"),
      }
    }
    tabStateObject.push(tabState);
  }
  Services.prefs.setStringPref(WORKSPACE_TABS_PREF, JSON.stringify(tabStateObject));
}

function addWorkspaceElemToMenu(label) {
  let workspaceItemElem = window.MozXULElement.parseXULToFragment(`
  <hbox id='workspace-${label}' class="workspace-item-box">
    <toolbarbutton id="workspace-label" label="${label}" 
              class="toolbarbutton-1 workspace-item" workspace="${label}"
              oncommand="changeWorkspace('${label}')"/>
  </hbox>
  `);
  document.getElementById("workspace-menu-separator").before(workspaceItemElem);

  if (label !== defaultWorkspaceName) {
    let deleteButtonElem = window.MozXULElement.parseXULToFragment(`
        <toolbarbutton id="workspace-delete" class="workspace-item-delete toolbarbutton-1"
                       oncommand="deleteworkspace('${label}')"/>
    `);
    document.getElementById(`workspace-${label}`).appendChild(deleteButtonElem);
  }
}

function changeWorkspace(label) {
  let currentWorkspace = label;
  let tabs = gBrowser.tabs;

  Services.prefs.setStringPref(WORKSPACE_CURRENT_PREF, label);
  for (let i = 0; i < tabs.length; i++) {
    let tab = tabs[i];
    if(tab.getAttribute("floorp-workspace") == currentWorkspace){
      gBrowser.selectedTab = tab;
      break;
    } else if(i == tabs.length - 1){
      gBrowser.addTab("about:newtab", {
        skipAnimation: true,
        inBackground: false,
        triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()
      });
    }
  }
  setCurrentWorkspace();
  saveWorkspaceState();
}

function addNewWorkspace() {
  let allWorkspace = Services.prefs.getStringPref(WORKSPACE_ALL_PREF).split(",");
  let l10n = new Localization(["browser/floorp.ftl"], true);


  prompts = Services.prompt;
  var check = {value: false};
  var input = {placeHolder: "Workspace Name"};
  let result = prompts.prompt(null, l10n.formatValueSync("workspace-prompt-title"), l10n.formatValueSync("please-enter-workspace-name"), input, null, check);

  if (result && allWorkspace.indexOf(input.value) == -1 && input.value != "" && input.value.length < 20) {
    let label = input.value;
    let workspaceAll = Services.prefs.getStringPref(WORKSPACE_ALL_PREF).split(",");
    try {
      addWorkspaceElemToMenu(label);
    } catch (e) {
      prompts.alert(null, l10n.formatValueSync("workspace-prompt-title"), l10n.formatValueSync("workspace-error") + "\n" + l10n.formatValueSync("workspace-error-discription"));
      return;
    }
    workspaceAll.push(label);
    Services.prefs.setStringPref(WORKSPACE_ALL_PREF, workspaceAll);
  } else if(result == false){
    return;
  } else {
    prompts.alert(null, l10n.formatValueSync("workspace-prompt-title"), l10n.formatValueSync("workspace-error") + "\n" + l10n.formatValueSync("workspace-error-discription"));
  }
}

// tab context menu (move tab to other workspace)
function addContextMenuToTabContext() {
  let beforeElem = document.getElementById("context_moveTabOptions")
  let menuitemElem = window.MozXULElement.parseXULToFragment(`
  <menu id="context_MoveOtherWorkspace" data-l10n-id="move-tab-another-workspace" accesskey="D">
      <menupopup id="workspaceTabContextMenu"
                 onpopupshowing="CreateWorkspaceContextMenu();"/>
  </menu>
  `);
  beforeElem.before(menuitemElem);
}
addContextMenuToTabContext();

function checkTabsLength(){
  let tabs = gBrowser.tabs;
  for(let i = 0; i < tabs.length; i++){
    if(TabContextMenu.contextTab.getAttribute("firstVisibleTab") == "true"){
      document.getElementById("context_MoveOtherWorkspace").setAttribute("disabled", "true");
    }
  }
}

function CreateWorkspaceContextMenu(){
  //delete already exsist items
  let menuElem = document.getElementById("workspaceTabContextMenu");
  while(menuElem.firstChild){
    menuElem.removeChild(menuElem.firstChild);
  }

  //Rebuild context menu
  if(TabContextMenu.contextTab == gBrowser.selectedTab){
    let menuItem = window.MozXULElement.parseXULToFragment(`
      <menuitem data-l10n-id="workspace-context-menu-selected-tab" disabled="true"/>
    `)
    let parentElem = document.getElementById("workspaceTabContextMenu");
    parentElem.appendChild(menuItem);
    return;
  }
  let workspaceAll = Services.prefs.getStringPref(WORKSPACE_ALL_PREF).split(",");
  for(let i = 0; i < workspaceAll.length; i++){
    let workspace = workspaceAll[i]
    let menuItem = window.MozXULElement.parseXULToFragment(`
      <menuitem id="workspaceID-${workspace}" class="workspaceContextMenuItems"
                label="${workspace}"  oncommand="moveTabToOtherWorkspace(TabContextMenu.contextTab, '${workspace}');"/>
    `)
    let parentElem = document.getElementById("workspaceTabContextMenu");
    if(workspace != TabContextMenu.contextTab.getAttribute("floorp-workspace")){
      parentElem.appendChild(menuItem);
    }
  }
}

function moveTabToOtherWorkspace(tab, workspace){
  if(gBrowser.tabs.selectedTab == tab){
    gBrowser.selectedTab = gBrowser.tabs[gBrowser.tabs.length - 1];
  }
  let willMoveWorkspace = workspace;
  tab.setAttribute("floorp-workspace", willMoveWorkspace);
  saveWorkspaceState();
  setCurrentWorkspace();
}


window.setTimeout(function(){
  let list = Services.wm.getEnumerator("navigator:browser");
  while (list.hasMoreElements()) { if (list.getNext() != window) return; }
  
  const toolbarButtonEle = window.MozXULElement.parseXULToFragment(
    `
    <toolbarbutton id="workspace-button"
                    class="toolbarbutton-1 chromeclass-toolbar-additional"
                    label="Workspace"
                    tooltiptext="Workspace"
                    type="menu"
                    style="list-style-image: url('chrome://browser/skin/workspace-floorp.png');">
      <menupopup id="workspace-menu" context="workspace-menu-context">
         <menuseparator id="workspace-menu-separator"/>
         <toolbarbutton style="list-style-image: url('chrome://global/skin/icons/plus.svg');"
                        data-l10n-id="workspace-add" class="subviewbutton subviewbutton-nav" oncommand="addNewWorkspace()"/>
      </menupopup>
    </toolbarbutton>
    `
  );
  document.querySelector(".toolbar-items").before(toolbarButtonEle);
  if(!Services.prefs.getBoolPref(WORKSPACE_TAB_ENABLED_PREF)) document.querySelector("#workspace-button").style.display = "none"

  //run codes
  initWorkspace();
  setCurrentWorkspace();

  gBrowser.tabContainer.addEventListener("TabOpen", function() {
    let tabs = gBrowser.tabs;
    let lastTab = null
    let firstTab = null
    document.querySelector(`[floorp-lastVisibleTab]`)?.removeAttribute("floorp-lastVisibleTab")
    document.querySelector(`[floorp-firstVisibleTab]`)?.removeAttribute("floorp-firstVisibleTab")
    for (let i = 0; i < tabs.length; i++) {
      let tab = tabs[i];
      if (!tab.hasAttribute("floorp-workspace")) {
        tab.setAttribute("floorp-workspace", Services.prefs.getStringPref(WORKSPACE_CURRENT_PREF));
      }
      if(tab.getAttribute("floorp-workspace") == Services.prefs.getStringPref(WORKSPACE_CURRENT_PREF)){
        lastTab = tab
      }
      if(tab.getAttribute("floorp-workspace") == Services.prefs.getStringPref(WORKSPACE_CURRENT_PREF) && firstTab == null){
        tab.setAttribute("floorp-firstVisibleTab","true")
        firstTab = tab
      }
    }
    lastTab?.setAttribute("floorp-lastVisibleTab","true")
    saveWorkspaceState();
  }, false);

  gBrowser.tabContainer.addEventListener("TabClose", function() {
    saveWorkspaceState();

    window.setTimeout(()=>{
      document.querySelector(`[floorp-firstVisibleTab]`)?.removeAttribute("floorp-firstVisibleTab")
      document.querySelector(`[floorp-lastVisibleTab]`)?.removeAttribute("floorp-lastVisibleTab")
      document.querySelector(`tab:not([hidden])`).setAttribute("floorp-firstVisibleTab","true")
      let elems = document.querySelectorAll(`tab:not([hidden])`)
      elems[elems.length - 1].setAttribute("floorp-lastVisibleTab","true")
    },400)
  }, false);
  
  gBrowser.tabContainer.addEventListener("TabMove", function() {
    saveWorkspaceState();
    document.querySelector(`[floorp-firstVisibleTab]`)?.removeAttribute("floorp-firstVisibleTab")
    document.querySelector(`[floorp-lastVisibleTab]`)?.removeAttribute("floorp-lastVisibleTab")
    document.querySelector(`tab:not([hidden])`).setAttribute("floorp-firstVisibleTab","true")
    let elems = document.querySelectorAll(`tab:not([hidden])`)
    elems[elems.length - 1].setAttribute("floorp-lastVisibleTab","true")
  } , false);

  Services.prefs.addObserver(WORKSPACE_CURRENT_PREF, function() {
    setCurrentWorkspace();
  }, false);

  Services.prefs.addObserver(WORKSPACE_TAB_ENABLED_PREF,function(){
    document.querySelector("#workspace-button").style.display = Services.prefs.getBoolPref(WORKSPACE_TAB_ENABLED_PREF) ? "" : "none"    
    if(!Services.prefs.getBoolPref(WORKSPACE_TAB_ENABLED_PREF)){
      document.querySelector(`[floorp-firstVisibleTab]`)?.removeAttribute("floorp-firstVisibleTab")
      document.querySelector(`[floorp-lastVisibleTab]`)?.removeAttribute("floorp-lastVisibleTab")
    }
    setCurrentWorkspace()
  },false)

}, 1000);
