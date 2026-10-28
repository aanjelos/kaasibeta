/** Settings presentation and navigation. Existing forms remain the only writers. */
const SettingsWorkspace = (() => {
  const mobile = window.matchMedia("(max-width: 760px)");
  let selected = null;
  let subscriptionHome = null;
  let subscriptionControls = [];
  let navigationAnimations = [];
  function stopMotion() { navigationAnimations.forEach(animation=>animation.cancel()); navigationAnimations=[]; }
  function motionAllowed() { return mobile.matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function animateView(back = false) {
    stopMotion();
    if (!motionAllowed()) return [];
    const targets = selected ? [document.querySelector('.settings-section-heading'), document.getElementById('settingsTabContent')] : [document.getElementById('settingsMobileHub')];
    for (const target of targets) {
      if (!target?.animate) continue;
      const offset = back ? -18 : 18;
      const frames = [{opacity:0,transform:`translateX(${offset}px)`},{opacity:1,transform:'translateX(0)'}];
      navigationAnimations.push(target.animate(frames,{duration:190,easing:'cubic-bezier(.2,.7,.2,1)'}));
    }
    return navigationAnimations;
  }
  const modal = () => document.getElementById("settingsModal");
  const find = panel => settingsTabsConfig.find(section => section.targetPanelId === panel);

  function preparePresentation() {
    const root = modal();
    if (root.dataset.presentationReady) return;
    const categoryForm = document.getElementById("addCategoryForm");
    const categoryCard = categoryForm.closest(".card");
    const categoryPanel = document.getElementById("settingsCategoriesPanel");
    categoryPanel.insertBefore(categoryCard, categoryPanel.firstElementChild);
    document.getElementById("settingsAddCategoryHost").appendChild(categoryForm);
    document.getElementById("settingsAddBudgetHost").appendChild(document.getElementById("addBudgetForm").closest(".card"));

    const dataPanel = document.getElementById("settingsDataManagementPanel");
    for (const id of ["storageSizeInfo", "cloudBackupLoggedOut", "exportDataBtn", "shortcutLocal", "settingsBackupReminderFreq", "initiateDeleteBtn"]) {
      dataPanel.appendChild(document.getElementById(id).closest(".card"));
    }
    const cloud = document.getElementById("cloudBackupLoggedIn");
    const email = cloud.querySelector(":scope > p");
    if (email.firstChild?.nodeType === 3) email.firstChild.textContent = "";
    const identity = document.createElement("div");
    identity.className = "settings-cloud-identity";
    identity.innerHTML = '<span class="settings-cloud-symbol"><i class="fas fa-cloud" aria-hidden="true"></i></span><div class="settings-cloud-copy"><strong>Connected to Cloud</strong></div>';
    identity.querySelector("div").appendChild(email);
    cloud.insertBefore(identity, cloud.firstChild);
    identity.appendChild(document.getElementById("googleLogoutBtn"));
    const signOut=document.getElementById('googleLogoutBtn');
    signOut.innerHTML='<i class="fas fa-sign-out-alt" aria-hidden="true"></i><span class="settings-signout-label">Sign Out</span>';
    cloud.appendChild(document.getElementById("lastCloudBackupTime"));
    const ccForm = document.getElementById('settingsCcLimitForm');
    const ccToggle = document.getElementById('toggleCcSection').closest('.flex.items-center.justify-between');
    ccToggle.classList.remove('border-t', 'border-gray-600', 'pt-3');
    ccToggle.classList.add('settings-cc-toggle');
    ccForm.before(ccToggle);
    for (const panel of [categoryPanel, document.getElementById('settingsBudgetsPanel')]) {
      const footer = panel.querySelector('.settings-list-footer');
      if (footer) footer.closest('.card').prepend(footer);
    }
    const version = document.getElementById('appVersionSettings');
    document.querySelector('.settings-dashboard-link').before(version);

    document.querySelectorAll("#settingsTabContent > .settings-tab-panel > .card").forEach(card => {
      const title = card.querySelector(":scope > h3, :scope > .budget-list-heading");
      if (!title) return;
      const subtitle = title.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
      const head = document.createElement("div");
      head.className = "settings-panel-head";
      head.appendChild(title);
      if (subtitle) head.appendChild(subtitle);
      const body = document.createElement("div");
      body.className = "settings-panel-body";
      while (card.firstChild) body.appendChild(card.firstChild);
      card.appendChild(head);
      card.appendChild(body);
      card.classList.add("settings-framed");
    });
    root.querySelectorAll(".settings-tab-panel .flex.items-center.justify-between").forEach(row => row.classList.add("settings-control-row"));
    for (const panel of [categoryPanel, document.getElementById('settingsBudgetsPanel')]) {
      const footer = panel.querySelector('.settings-list-footer');
      const head = panel.querySelector('.settings-panel-head');
      if (footer && head) {
        head.classList.add('settings-list-header');
        const budgetHeading = head.querySelector('.budget-list-heading');
        if (budgetHeading) { budgetHeading.insertBefore(footer, budgetHeading.querySelector('select')); }
        else head.appendChild(footer);
      }
    }
    root.dataset.presentationReady = "true";
  }

  function editCategory(button, open = true) {
    const row = button.closest("li");
    row.classList.toggle('is-editing', open);
    const input = row.querySelector("input");
    input.hidden = !open;
    row.querySelector('.settings-category-save-actions').hidden = !open;
    if (open) input.focus();
    else { input.value = input.dataset.originalName; row.querySelector('[aria-label^="Rename "]').focus(); }
  }

  function releaseSubscriptions() {
    if (subscriptionHome) subscriptionControls.forEach(node => subscriptionHome.appendChild(node));
  }

  function borrowSubscriptions() {
    if (!subscriptionHome) {
      subscriptionHome = document.querySelector("#subscriptionsModal .subscriptions-content");
      subscriptionControls = [document.querySelector("#subscriptionsModal .subscription-toolbar"), document.getElementById("subscriptionList")].filter(Boolean);
    }
    const host = document.getElementById("settingsSubscriptionHost");
    if (host) subscriptionControls.forEach(node => host.appendChild(node));
    if (typeof Subscriptions !== "undefined") Subscriptions.render();
  }

  function ownsSubscriptions() {
    return modal()?.style.display === "block" && selected === "settingsSubscriptionsPanel";
  }

  function show(panelId, scroll = true, animate = false) {
    const previous = selected;
    const section = find(panelId) || (!mobile.matches ? settingsTabsConfig[0] : null);
    selected = section?.targetPanelId || null;
    const root = modal();
    if (!root) return;
    root.dataset.settingsView = section ? "section" : "hub";
    document.querySelectorAll("#settingsTabContent > .settings-tab-panel").forEach(panel => panel.classList.toggle("hidden", panel.id !== selected));
    document.querySelectorAll("#settingsTabsContainer button").forEach(button => {
      const active = button.dataset.tabTarget === `#${selected}`;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    document.getElementById("settingsWorkspaceTitle").textContent = section?.label || "Settings";
    document.getElementById("settingsWorkspaceDescription").textContent = section?.description || "";
    document.getElementById("settingsWorkspaceIcon").className = section ? `fas fa-${section.icon}` : "";
    document.querySelector("#settingsBackBtn span").textContent = section ? "Settings" : "Dashboard";
    const button = section && document.querySelector(`#settingsTabsContainer button[data-tab-target="#${selected}"]`);
    activeSettingsTab = section ? { button, panelId: selected } : null;
    if (selected === "settingsSubscriptionsPanel") borrowSubscriptions();
    else releaseSubscriptions();
    if (selected === "settingsDataManagementPanel") refreshStorageProtection();
    if (scroll) {
      const pane = document.querySelector("#settingsModal .settings-main");
      if (pane) pane.scrollTop = 0;
    }
    if (animate && previous !== selected) animateView(!selected);
  }

  function navigate(panelId) {
    if (!find(panelId) || selected === panelId) return;
    if (history.state?.openModals?.includes("settingsModal")) {
      history.pushState({ ...history.state, settingsSection: panelId, settingsDepth: (history.state.settingsDepth || 0) + 1 }, "", "");
    }
    show(panelId, true, true);
    if (mobile.matches) {
      const heading=document.getElementById('settingsWorkspaceTitle');
      heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
    }
  }

  function setup() {
    stopMotion();
    preparePresentation();
    const nav = document.getElementById("settingsTabsContainer");
    const hub = document.getElementById("settingsMobileHub");
    if (!nav || !hub) return;
    if (!nav.dataset.workspaceReady) {
      nav.innerHTML = "";
      hub.innerHTML = '<h2>Settings</h2><p class="settings-hub-intro">Your money. Your preferences.</p>';
      for (const group of ["Money", "App", "Information"]) {
        const navGroup = document.createElement("li");
        navGroup.className = "settings-nav-group";
        const mobileGroup = document.createElement("section");
        mobileGroup.className = "settings-hub-group";
        navGroup.innerHTML = `<h3>${group}</h3>`;
        mobileGroup.innerHTML = `<h3>${group}</h3><div class="settings-hub-list"></div>`;
        const list = mobileGroup.querySelector(".settings-hub-list");
        for (const section of settingsTabsConfig.filter(item => item.group === group)) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "settings-tab-button";
          button.dataset.tabTarget = `#${section.targetPanelId}`;
          button.innerHTML = `<i class="fas fa-${section.icon}" aria-hidden="true"></i><span>${section.label}</span>`;
          button.onclick = () => navigate(section.targetPanelId);
          navGroup.appendChild(button);
          const row = document.createElement("button");
          row.type = "button";
          row.className = "settings-hub-row";
          row.dataset.section = section.targetPanelId;
          row.innerHTML = `<i class="fas fa-${section.icon}" aria-hidden="true"></i><span><strong>${section.label}</strong><small>${section.hint}</small></span><i class="fas fa-chevron-right" aria-hidden="true"></i>`;
          row.onclick = () => navigate(section.targetPanelId);
          list.appendChild(row);
        }
        nav.appendChild(navGroup);
        hub.appendChild(mobileGroup);
      }
      const mobileVersion = document.createElement('p');
      mobileVersion.className = 'settings-mobile-version';
      mobileVersion.textContent = `Version: ${document.querySelector('meta[name="application-version"]').content}`;
      hub.appendChild(mobileVersion);
      nav.dataset.workspaceReady = "true";
      for (const host of [nav, hub]) host.addEventListener('keydown', event => {
        const buttons=[...host.querySelectorAll('button')];
        const index=buttons.indexOf(event.target);
        if(index<0 || event.altKey || event.ctrlKey || event.metaKey || !['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
        event.preventDefault();
        const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowUp'?-1:1)+buttons.length)%buttons.length;
        buttons[next].focus();
      });
    }
    selected = null;
    show(null);
  }

  function restore(state) {
    if (state?.openModals?.includes("settingsModal")) {
      // A browser Forward/Back entry can outlive a page reload.
      if (!document.getElementById("settingsTabsContainer").dataset.workspaceReady) openSettingsModal({ restore: true });
      const previous = selected;
      show(state.settingsSection || null, false, modal()?.style.display==='block' && previous!==null);
      if (mobile.matches && !selected && previous) document.querySelector(`#settingsMobileHub [data-section="${previous}"]`)?.focus({preventScroll:true});
    }
    else { stopMotion(); releaseSubscriptions(); selected = null; }
  }

  function back() {
    stopMotion();
    if (mobile.matches && history.state?.settingsDepth > 0) history.go(-history.state.settingsDepth);
    else if (history.state?.settingsDepth > 0) history.back();
    else closeModal("settingsModal");
  }

  mobile.addEventListener?.("change", () => {
    if (modal()?.style.display === "block") show(history.state?.settingsSection || null);
  });
  return { setup, navigate, restore, back, stopMotion, releaseSubscriptions, ownsSubscriptions, editCategory };
})();
