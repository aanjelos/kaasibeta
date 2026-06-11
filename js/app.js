function initializeUI(isRefresh = false) {
  console.log("Initializing UI...");

  // --- NEW: Initialize Supabase and check auth state ---
  if (!isRefresh && supabaseClient) {
    initializeSupabase(); // This will check for a user session
  }
  // --- END NEW ---

  if (!isRefresh) {
    loadData();
    applyAppearance();
  }

  if (
    !state.settings ||
    state.settings.initialSetupDone === undefined ||
    state.settings.initialSetupDone === false
  ) {
    if (!isRefresh) {
      if (localStorage.getItem("pendingCloudRestore") === "true") {
        console.log("Pending cloud restore detected. Skipping initial render and waiting for restore...");
        return;
      }
      console.log("Initial setup not done. Opening wizard.");
      openInitialSetupWizard();
      return;
    }
  }

  const mainDateInput = $("#date");
  if (mainDateInput) mainDateInput.value = getCurrentDateString();
  const mainCcDateInput = $("#ccDate");
  if (mainCcDateInput) mainCcDateInput.value = getCurrentDateString();

  populateDropdowns();
  renderDashboard();
  updateCcDashboardSectionVisibility();
  setupMonthlyView();

  // --- NEW: Add new header button listeners ---
  // The onclick logic is now dynamic, so we set it in updateHeaderShortcutButtons()
  // This function will set their initial state (icons, tooltips, onclick)
  updateHeaderShortcutButtons();
  setupMobileDropdown(); // NEW: Initialize top-right Mobile Dropdown
  // --- END NEW ---

  if (!window.deleteSliderInitialized) {
    setupDeleteSlider();
    window.deleteSliderInitialized = true;
  }

  displayAppVersion();

  $("#transactionForm").onsubmit = handleTransactionSubmit;
  $("#ccTransactionForm").onsubmit = handleCcTransactionSubmit;

  // --- Header & Footer Button Event Listeners ---
  $("#settingsBtn").onclick = openSettingsModal;

  $("#toggleChartBtn").onclick = () => {
    dashboardChartState =
      dashboardChartState === "yearly" ? "monthly" : "yearly";
    renderMonthlyOverviewChart();
  };

  $("#monthlyViewBtn").onclick = () => {
    const yearSelector = $("#yearSelector");
    const currentYear = new Date().getFullYear();
    const selectedYear = currentYear;
    if (yearSelector) {
      yearSelector.value = currentYear;
    }

    renderMonthTabs(selectedYear);

    // Reset advanced filters and search when opening the modal
    if (typeof window.resetAdvancedFiltersAndSearch === "function") {
      window.resetAdvancedFiltersAndSearch(false);
    } else {
      const monthlySearchInput = $("#monthlySearchInput");
      const clearMonthlySearchBtn = $("#clearMonthlySearchBtn");
      if (monthlySearchInput) {
        monthlySearchInput.value = "";
      }
      if (clearMonthlySearchBtn) {
        clearMonthlySearchBtn.style.display = "none";
        clearMonthlySearchBtn.disabled = true;
      }
    }

    openModalHelper("monthlyViewModal");

    const currentMonth = new Date().getMonth();
    const currentMonthTab = $(
      `#monthTabs .tab-button[data-month="${currentMonth}"][data-year="${selectedYear}"]`
    );

    if (currentMonthTab) {
      currentMonthTab.click();
    } else if ($$("#monthTabs .tab-button").length > 0) {
      $$("#monthTabs .tab-button")[0].click();
    } else {
      $("#monthlyDetailsContainer").innerHTML =
        '<p class="text-center text-gray-400">Select a month.</p>';
    }
  };

  const shortcutsHelpBtn = $("#shortcutsHelpBtn");
  if (shortcutsHelpBtn) {
    shortcutsHelpBtn.onclick = openShortcutsHelpModal;
  }

  // NEW: Donate Modal Logic moved inside initializeUI for robustness
  const donateModal = document.getElementById("donateModal");
  const footerDonateBtn = document.getElementById("footerDonateBtn");
  const closeDonateModalBtn = document.getElementById("closeDonateModal");

  if (!isRefresh && donateModal && footerDonateBtn && closeDonateModalBtn) {
    footerDonateBtn.addEventListener("click", () => {
      openModalHelper("donateModal");
    });
    closeDonateModalBtn.addEventListener("click", () => {
      donateModal.style.display = "none";
    });
    // Close modal if user clicks on the background overlay
    donateModal.addEventListener("click", (e) => {
      if (e.target === donateModal) {
        donateModal.style.display = "none";
      }
    });

    // Handle copy to clipboard functionality for the new modal
    const copyButtons = donateModal.querySelectorAll(".copy-button");
    copyButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const textToCopy = button.dataset.copyText;
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          button.textContent = "Copied!";
          setTimeout(() => {
            button.innerHTML = '<i class="far fa-copy"></i>'; // Revert back to icon
          }, 2000);
        } catch (err) {
          console.error("Failed to copy text: ", err);
          button.textContent = "Failed!";
          setTimeout(() => {
            button.innerHTML = '<i class="far fa-copy"></i>';
          }, 2000);
        }
        document.body.removeChild(textArea);
      });
    });
  } else {
    console.warn(
      "One or more elements for the new donate modal were not found."
    );
  }

  const monthlySearchInput = $("#monthlySearchInput");
  const clearMonthlySearchBtn = $("#clearMonthlySearchBtn");
  // --- Advanced Filters Logic ---
  const toggleAdvancedFiltersBtn = $("#toggleAdvancedFiltersBtn");
  const advancedFiltersAccordion = $("#advancedFiltersAccordion");
  const resetAdvancedFiltersBtn = $("#resetAdvancedFiltersBtn");
  
  if (!isRefresh && toggleAdvancedFiltersBtn && advancedFiltersAccordion) {
    toggleAdvancedFiltersBtn.addEventListener("click", () => {
      advancedFiltersAccordion.classList.toggle("hidden");
    });
  }

  // --- Multi-Select Category Logic ---
  const filterCategoryBtn = $("#filterCategoryBtn");
  const filterCategoryDropdown = $("#filterCategoryDropdown");
  const filterCategoryBtnText = $("#filterCategoryBtnText");

  if (!isRefresh && filterCategoryBtn && filterCategoryDropdown) {
    filterCategoryBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      filterCategoryDropdown.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
      if (!filterCategoryDropdown.contains(e.target) && e.target !== filterCategoryBtn && !filterCategoryBtn.contains(e.target)) {
        filterCategoryDropdown.classList.add("hidden");
      }
    });

    filterCategoryDropdown.addEventListener("change", (e) => {
      if (e.target.tagName.toLowerCase() === "input" && e.target.type === "checkbox") {
        const isAllCheckbox = e.target.id === "filterCategoryAll";
        const allCheckboxes = Array.from(filterCategoryDropdown.querySelectorAll(".filter-category-checkbox"));
        const masterCheckbox = document.getElementById("filterCategoryAll");
        
        if (isAllCheckbox) {
          if (e.target.checked) {
            allCheckboxes.forEach(cb => cb.checked = false);
          } else {
            // Can't uncheck 'All' directly without selecting something else
            e.target.checked = true;
          }
        } else {
          if (e.target.checked) {
            if (masterCheckbox) masterCheckbox.checked = false;
          } else {
            const anyChecked = allCheckboxes.some(cb => cb.checked);
            if (!anyChecked && masterCheckbox) masterCheckbox.checked = true;
          }
        }

        // Update Button Text
        const checkedCount = allCheckboxes.filter(cb => cb.checked).length;
        if (masterCheckbox && masterCheckbox.checked || checkedCount === 0) {
          if (filterCategoryBtnText) filterCategoryBtnText.textContent = "All Categories";
        } else if (checkedCount === 1) {
          const selectedLabel = allCheckboxes.find(cb => cb.checked).value;
          if (filterCategoryBtnText) filterCategoryBtnText.textContent = selectedLabel;
        } else {
          if (filterCategoryBtnText) filterCategoryBtnText.textContent = `${checkedCount} Selected`;
        }

        if (typeof triggerSearch === "function") triggerSearch();
      }
    });
  }

  window.resetAdvancedFiltersAndSearch = (triggerSearchAfter = true) => {
    const activeTab = $("#monthTabs .tab-button[data-logically-active='true']") || $("#monthTabs .tab-button.active");
    if (activeTab) {
      const month = parseInt(activeTab.dataset.month);
      const year = parseInt(activeTab.dataset.year);
      const firstDay = new Date(year, month, 1).toLocaleDateString("en-CA");
      const lastDay = new Date(year, month + 1, 0).toLocaleDateString("en-CA");
      
      if ($("#filterStartDate")) $("#filterStartDate").value = firstDay;
      if ($("#filterEndDate")) $("#filterEndDate").value = lastDay;
    } else {
      if ($("#filterStartDate")) $("#filterStartDate").value = "";
      if ($("#filterEndDate")) $("#filterEndDate").value = "";
    }

    // Reset quick date active classes
    const filterQuickDates = $("#filterQuickDates");
    if (filterQuickDates) {
      filterQuickDates.querySelectorAll(".quick-date-pill").forEach(btn => btn.classList.remove("active"));
    }

    if ($("#filterType")) $("#filterType").value = "all";
    
    // Reset Category Multi-Select
    if (filterCategoryDropdown) {
      const allCheckboxes = filterCategoryDropdown.querySelectorAll(".filter-category-checkbox");
      allCheckboxes.forEach(cb => cb.checked = false);
      const masterCheckbox = document.getElementById("filterCategoryAll");
      if (masterCheckbox) masterCheckbox.checked = true;
      if (filterCategoryBtnText) filterCategoryBtnText.textContent = "All Categories";
    }

    if ($("#filterMinAmount")) $("#filterMinAmount").value = "";
    if ($("#filterMaxAmount")) $("#filterMaxAmount").value = "";
    
    if (advancedFiltersAccordion) {
      advancedFiltersAccordion.classList.add("hidden");
    }

    const monthlySearchInput = $("#monthlySearchInput");
    const clearMonthlySearchBtn = $("#clearMonthlySearchBtn");
    if (monthlySearchInput) monthlySearchInput.value = "";
    if (clearMonthlySearchBtn) {
      clearMonthlySearchBtn.style.display = "none";
      clearMonthlySearchBtn.disabled = true;
    }

    if (triggerSearchAfter && typeof triggerSearch === "function") {
      triggerSearch();
    }
  };

  const triggerSearch = () => {
    clearTimeout(monthlySearchDebounceTimer);
    monthlySearchDebounceTimer = setTimeout(() => {
      const activeTab = $("#monthTabs .tab-button[data-logically-active='true']") || $("#monthTabs .tab-button.active");
      if (activeTab) {
        const month = parseInt(activeTab.dataset.month);
        const year = parseInt(activeTab.dataset.year);
        const searchTerm = monthlySearchInput.value.trim();
        renderMonthlyDetails(month, year, new Set(), searchTerm, true);
      }
    }, 400);
  };
  const clearQuickDatesActive = () => {
    if (filterQuickDates) {
      filterQuickDates.querySelectorAll(".quick-date-pill").forEach(btn => btn.classList.remove("active"));
    }
  };

  const filterQuickDates = $("#filterQuickDates");
  if (filterQuickDates && !isRefresh) {
    filterQuickDates.addEventListener("click", (e) => {
      if (e.target.classList.contains("quick-date-pill")) {
        clearQuickDatesActive();
        e.target.classList.add("active");

        const range = e.target.dataset.range;
        const now = new Date();
        let start = new Date();
        let end = new Date();
        
        switch (range) {
          case "ytd":
            start = new Date(now.getFullYear(), 0, 1);
            break;
          case "6m":
            start.setMonth(now.getMonth() - 6);
            break;
          case "1y":
            start.setFullYear(now.getFullYear() - 1);
            break;
          case "lastYear":
            start = new Date(now.getFullYear() - 1, 0, 1);
            end = new Date(now.getFullYear() - 1, 11, 31);
            break;
        }
        
        const filterStartDate = $("#filterStartDate");
        const filterEndDate = $("#filterEndDate");
        if (filterStartDate) filterStartDate.value = start.toLocaleDateString("en-CA");
        if (filterEndDate) filterEndDate.value = end.toLocaleDateString("en-CA");
        
        if (typeof triggerSearch === 'function') triggerSearch();
      }
    });
  }

  const filterInputs = [
    $("#filterStartDate"),
    $("#filterEndDate"),
    $("#filterType"),
    $("#filterCategory"),
    $("#filterMinAmount"),
    $("#filterMaxAmount")
  ];

  filterInputs.forEach(input => {
    if (input) {
      const handler = (e) => {
        if ((input.id === "filterStartDate" || input.id === "filterEndDate") && e.isTrusted) {
          clearQuickDatesActive();
        }
        triggerSearch();
      };
      input.addEventListener("input", handler);
      input.addEventListener("change", handler); // for selects and dates
    }
  });

  if (!isRefresh && resetAdvancedFiltersBtn) {
    resetAdvancedFiltersBtn.addEventListener("click", () => {
      window.resetAdvancedFiltersAndSearch(true);
    });
  }

  if (monthlySearchInput && clearMonthlySearchBtn) {
    if (!monthlySearchInput.value.trim()) {
      clearMonthlySearchBtn.style.display = "none";
      clearMonthlySearchBtn.disabled = true;
    }

    monthlySearchInput.addEventListener("input", () => {
      const searchTerm = monthlySearchInput.value.trim();
      if (searchTerm) {
        clearMonthlySearchBtn.style.display = "inline-flex";
        clearMonthlySearchBtn.disabled = false;
      } else {
        clearMonthlySearchBtn.style.display = "none";
        clearMonthlySearchBtn.disabled = true;
      }
      triggerSearch();
    });

    monthlySearchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        clearTimeout(monthlySearchDebounceTimer);
        triggerSearch();
      }
    });

    clearMonthlySearchBtn.addEventListener("click", () => {
      monthlySearchInput.value = "";
      clearMonthlySearchBtn.style.display = "none";
      clearMonthlySearchBtn.disabled = true;
      
      clearTimeout(monthlySearchDebounceTimer);
      window.resetAdvancedFiltersAndSearch(true);
      monthlySearchInput.focus();
    });
  }

  const openTransferModalButton = $("#openTransferModalBtn");
  if (openTransferModalButton) {
    openTransferModalButton.onclick = () => {
      const modal = $("#transferMoneyModal");
      if (modal) {
        populateDropdowns();
        const transferModalForm = $("#transferModalForm");
        if (transferModalForm) {
          transferModalForm.reset();
        }
        const errorEl = $("#modalTransferError");
        if (errorEl) {
          errorEl.classList.add("hidden");
        }
        openModalHelper("transferMoneyModal");
        const firstInput = modal.querySelector('input[type="text" inputmode="decimal" class="calc-amount"], select');
        if (firstInput) {
          firstInput.focus();
        }
      }
    };
  }

  const transferModalFormElement = $("#transferModalForm");
  if (transferModalFormElement) {
    transferModalFormElement.onsubmit = handleTransferSubmit;
  }

  // --- CC History Modal Search Logic ---
  const ccHistorySearchInput = $("#ccHistorySearchInput");
  const clearCcHistorySearchBtn = $("#clearCcHistorySearchBtn");

  if (!isRefresh && ccHistorySearchInput && clearCcHistorySearchBtn) {
    const triggerCcSearch = () => {
      const renderFunction = document.body.renderCcHistoryList;
      if (typeof renderFunction === "function") {
        renderFunction();
      }
    };

    ccHistorySearchInput.addEventListener("input", () => {
      const searchTerm = ccHistorySearchInput.value.trim();
      clearCcHistorySearchBtn.classList.toggle("hidden", !searchTerm);
      clearTimeout(ccHistorySearchDebounceTimer);
      ccHistorySearchDebounceTimer = setTimeout(triggerCcSearch, 400);
    });

    clearCcHistorySearchBtn.addEventListener("click", () => {
      clearTimeout(ccHistorySearchDebounceTimer);
      ccHistorySearchInput.value = "";
      clearCcHistorySearchBtn.classList.add("hidden");
      triggerCcSearch();
      ccHistorySearchInput.focus();
    });
  }

  // --- NEW: SUPABASE EVENT LISTENERS ---
  const googleLoginButton = $("#googleLoginBtn");
  if (googleLoginButton) {
    googleLoginButton.onclick = signInWithGoogle;
  }

  const googleLogoutButton = $("#googleLogoutBtn");
  if (googleLogoutButton) {
    googleLogoutButton.onclick = signOut;
  }

  const backupToSupabaseButton = $("#backupToSupabaseBtn");
  if (backupToSupabaseButton) {
    backupToSupabaseButton.onclick = backupToSupabase;
  }

  const restoreFromSupabaseButton = $("#restoreFromSupabaseBtn");
  if (restoreFromSupabaseButton) {
    restoreFromSupabaseButton.onclick = restoreFromSupabase;
  }

  // --- MODIFIED: shortcutTargetGroup listener ---
  const shortcutTargetGroup = $("#shortcutTargetGroup");
  if (shortcutTargetGroup) {
    shortcutTargetGroup.onchange = (e) => {
      if (e.target.name === "shortcutTarget") {
        console.log(`Shortcut target changed to: ${e.target.value}`);
        // --- NEW: Update header buttons when radio changes ---
        updateHeaderShortcutButtons();
        // --- END NEW ---
      }
    };
  }
  // --- END MODIFICATION ---

  // --- END NEW ---

  $("#exportDataBtn").onclick = exportData;
  $("#importDataInput").onchange = importData;
  $("#initiateDeleteBtn").onclick = initiateDeleteAllData;
  $("#cancelDeleteBtn").onclick = cancelDeleteAllData;
  $("#addDebtBtn").onclick = openAddDebtForm;
  $("#addReceivableBtn").onclick = openAddReceivableForm;
  $("#addInstallmentBtn").onclick = openAddInstallmentForm;
  $("#cashCounterBtn").onclick = openCashCounter;
  $("#ccHistoryBtn").onclick = openCcHistoryModal;

  const viewDebtsBtn = $("#viewDebtsBtn");
  if (viewDebtsBtn) {
    viewDebtsBtn.onclick = () => {
      renderDebtList();
      openModalHelper("debtsViewModal");
    };
  }

  const viewReceivablesBtn = $("#viewReceivablesBtn");
  if (viewReceivablesBtn) {
    viewReceivablesBtn.onclick = () => {
      renderReceivableList();
      openModalHelper("receivablesViewModal");
    };
  }

  const transactionTypeSelect = $("#transactionType");
  const categoryGroup = $("#categoryGroup");
  const descriptionInput = $("#description");

  const toggleMainCategoryVisibility = () => {
    if (!transactionTypeSelect || !categoryGroup) return;
    if (transactionTypeSelect.value === "income") {
      categoryGroup.style.display = "none";
      $("#category").required = false;
      if (descriptionInput)
        descriptionInput.placeholder = "e.g., Monthly Salary";
    } else {
      categoryGroup.style.display = "block";
      $("#category").required = true;
      if (descriptionInput)
        descriptionInput.placeholder = "e.g., Lunch, Groceries";
    }
  };

  if (transactionTypeSelect) {
    transactionTypeSelect.onchange = toggleMainCategoryVisibility;
    toggleMainCategoryVisibility();
  }

  if (!document.body.dataset.keyboardListenerAttached) {
    document.addEventListener("keydown", handleKeyboardShortcuts);
    document.body.dataset.keyboardListenerAttached = "true";
    console.log("Keyboard shortcut listener attached.");
  }
}

// --- NEW: SUPABASE AUTH & DATA FUNCTIONS ---

/**
 * Initializes the Supabase client and checks for an active user session.
 * Updates the UI based on the user's login status.
 */


/**
 * Updates the Data Management UI based on login state.
 */


/**
 * Updates the header backup/restore buttons to reflect the selected shortcut target.
 */
function updateHeaderShortcutButtons() {
  const backupBtn = $("#headerBackupBtn");
  const restoreBtn = $("#headerRestoreBtn");
  const localRadio = $("#shortcutLocal");
  const cloudRadio = $("#shortcutCloud");

  if (!backupBtn || !restoreBtn || !localRadio || !cloudRadio) {
    console.warn("Header shortcut buttons or radio inputs not found.");
    return;
  }

  const importInput = $("#importDataInput"); // Get the file input element
  
  // Mobile elements
  const dropBackupText = $("#dropBackupText");
  const dropRestoreText = $("#dropRestoreText");
  const dropBackupBtn = $("#dropBackupBtn");
  const dropRestoreBtn = $("#dropRestoreBtn");
  const mobileMenuIcon = $("#mobileMenuIcon");

  // Check if cloud is selected AND enabled
  const isCloud = cloudRadio.checked && !cloudRadio.disabled;
  
  // Reset mobile classes and text first
  if (dropBackupBtn) dropBackupBtn.classList.remove("pulse-orange");
  if (dropRestoreBtn) dropRestoreBtn.classList.remove("pulse-green");
  if (mobileMenuIcon) mobileMenuIcon.classList.remove("pulse-orange", "pulse-green");
  
  // Default base texts depending on mode
  const baseExportText = isCloud ? "Export to Cloud" : "Export Local File";
  const baseImportText = isCloud ? "Import from Cloud" : "Import Local File";
  
  if (dropBackupText) dropBackupText.textContent = baseExportText;
  if (dropRestoreText) dropRestoreText.textContent = baseImportText;

  if (isCloud) {
    // Set to CLOUD mode
    backupBtn.classList.remove("pulse-orange");
    restoreBtn.classList.remove("pulse-green");
    
    const modalBackupBtn = $("#backupToSupabaseBtn");
    const modalRestoreBtn = $("#restoreFromSupabaseBtn");
    if (modalBackupBtn) modalBackupBtn.style.boxShadow = "";
    if (modalRestoreBtn) modalRestoreBtn.style.boxShadow = "";

    if (window.currentCloudSyncStatus === "cloud_newer") {
      restoreBtn.classList.add("pulse-green");
      if (modalRestoreBtn) modalRestoreBtn.style.boxShadow = "0 0 0 2px var(--success-indicator-color)";
      
      restoreBtn.dataset.tooltip = `New cloud data! (Synced ${lastCloudSyncTimeString} elsewhere)`;
      backupBtn.dataset.tooltip = "Export to Cloud (Ctrl+E)";
      
      // Mobile UI
      if (dropRestoreText) dropRestoreText.textContent = `Import from Cloud (New: ${lastCloudSyncTimeString})`;
      if (dropRestoreBtn) dropRestoreBtn.classList.add("pulse-green");
      if (mobileMenuIcon) mobileMenuIcon.classList.add("pulse-green");
    } else if (window.currentCloudSyncStatus === "local_newer") {
      backupBtn.classList.add("pulse-orange");
      if (modalBackupBtn) modalBackupBtn.style.boxShadow = "0 0 0 2px var(--accent-primary)";
      
      backupBtn.dataset.tooltip = "Unsaved local changes! Export to save.";
      restoreBtn.dataset.tooltip = "Import from Cloud (Ctrl+I)";
      
      // Mobile UI
      if (dropBackupText) dropBackupText.textContent = "Export to Cloud (Unsaved changes)";
      if (dropBackupBtn) dropBackupBtn.classList.add("pulse-orange");
      if (mobileMenuIcon) mobileMenuIcon.classList.add("pulse-orange");
    } else {
      if (lastCloudSyncTimeString) {
        backupBtn.dataset.tooltip = `Export to Cloud (Fully synced: ${lastCloudSyncTimeString})`;
        if (dropBackupText) dropBackupText.textContent = `Export to Cloud (Synced: ${lastCloudSyncTimeString})`;
      } else {
        backupBtn.dataset.tooltip = "Export to Cloud (Ctrl+E)";
      }
      restoreBtn.dataset.tooltip = "Import from Cloud (Ctrl+I)";
    }

    backupBtn.onclick = backupToSupabase; // Assign cloud backup function
    restoreBtn.onclick = () => restoreFromSupabase(false, true); // Assign cloud restore function
  } else {
    // Set to LOCAL mode (default)
    backupBtn.dataset.tooltip = "Export Local File (Ctrl+E)";
    backupBtn.onclick = exportData; // Assign local export function

    restoreBtn.dataset.tooltip = "Import Local File (Ctrl+I)";
    restoreBtn.onclick = () => {
      // For restore, we need to find the correct data tab and click the hidden input
      const importInput = $("#importDataInput");
      if (importInput) {
        const settingsModal = $("#settingsModal");
        // Open settings if not open, and switch to data tab
        if (settingsModal && settingsModal.style.display !== "block") {
          openSettingsModal();
          setTimeout(() => {
            const dataTabButton = Array.from(
              $$("#settingsTabsContainer button")
            ).find((btn) => btn.textContent === "Data");
            if (dataTabButton) dataTabButton.click();
            importInput.click();
          }, 100);
        } else if (settingsModal) {
          // If already open, just switch tab and click
          const dataTabButton = Array.from(
            $$("#settingsTabsContainer button")
          ).find((btn) => btn.textContent === "Data");
          if (dataTabButton) dataTabButton.click();
          importInput.click();
        } else {
          importInput.click(); // Fallback
        }
      }
    };
  }
}

let lastCloudSyncTimeString = "";

/**
 * Fetches the last updated timestamp from Supabase and updates the UI and tooltips.
 */


/**
 * Initiates the Google Sign-In flow via Supabase.
 */


/**
 * Signs the user out from Supabase.
 */


/**
 * Backs up the entire local 'state' object to the Supabase database.
 */


/**
 * Restores the 'state' object from Supabase, overwriting local data.
 */


// --- END NEW SUPABASE FUNCTIONS ---

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Loaded. Initializing...");
  loadData(); // Load existing data or set up default state
  initializeUI(); // Set up all initial UI elements, event listeners, and render initial views
  
  if (state.settings && state.settings.appPin && state.settings.appPin.enabled) {
    showPinLockScreen();
  } else {
    onAppUnlocked();
  }

  // Event listener to update date fields and attempt to focus window when tab becomes visible
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      console.log("Page became visible, attempting to focus and update dates.");
      window.focus(); // Attempt to bring focus to the window/document

      const mainTransactionDateInput = $("#date"); // Main transaction form date
      if (mainTransactionDateInput) {
        mainTransactionDateInput.value = getCurrentDateString(); // Use local date
      }

      const ccTransactionDateInput = $("#ccDate"); // Credit Card transaction form date
      if (ccTransactionDateInput) {
        ccTransactionDateInput.value = getCurrentDateString(); // Use local date
      }
    }
  });

  // Preloader logic
  const preloaderElement = document.getElementById("preloader");
  const appContentElement = document.getElementById("app-content");
  const preloaderDuration = 1250; // Duration preloader is visible

  if (preloaderElement && appContentElement) {
    if (localStorage.getItem("pendingCloudRestore") === "true") {
      console.log("Pending cloud restore detected. Keeping preloader visible until restore completes.");
      // We attach a global helper to hide it later when restore finishes
      window.hidePreloader = () => {
        console.log("Manual trigger: Hiding preloader, showing app content.");
        preloaderElement.classList.add("hidden");
        appContentElement.classList.add("visible");
        setTimeout(() => {
          if (typeof triggerStaggerAnimation === 'function') {
            triggerStaggerAnimation(document.getElementById('recentTransactions'));
          }
        }, 100);
        setTimeout(() => {
          preloaderElement.style.display = "none";
        }, 750);
      };
    } else {
      console.log(
        `Preloader will be shown for ${preloaderDuration / 1000} seconds.`
      );

      setTimeout(() => {
        console.log(
          "Preloader timer finished. Hiding preloader, showing app content."
        );
        preloaderElement.classList.add("hidden");
        appContentElement.classList.add("visible");
        setTimeout(() => {
          if (typeof triggerStaggerAnimation === 'function') {
            triggerStaggerAnimation(document.getElementById('recentTransactions'));
          }
        }, 100);

        setTimeout(() => {
          preloaderElement.style.display = "none";
          console.log("Preloader display set to 'none' after fade-out.");
        }, 750); // Matches CSS transition duration for opacity
      }, preloaderDuration);
    }
  } else {
    if (!preloaderElement) {
      console.error("Preloader element with ID 'preloader' not found.");
    }
    if (!appContentElement) {
      console.error("App content element with ID 'app-content' not found.");
    }
    // Fallback to show app content if preloader elements are missing
    if (appContentElement) {
      appContentElement.classList.add("visible");
      console.warn(
        "Attempted to show app content due to missing preloader elements."
      );
    }
    if (preloaderElement) {
      preloaderElement.style.display = "none";
    }
  }
});

// --- PWA Offline Support & Install Logic ---
let deferredPrompt;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      console.log("Service Worker registered successfully.", reg);
    }).catch((err) => {
      console.error("Service Worker registration failed:", err);
    });
  });
}

window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  
  // Show the custom install button if not in standalone mode
  if (!window.matchMedia('(display-mode: standalone)').matches) {
    const installBtn = document.getElementById("pwaInstallBtn");
    if (installBtn) {
      installBtn.style.display = "inline-flex";
      installBtn.classList.remove("hidden");
    }
  }
});

// Add click event to the custom install button
document.addEventListener("DOMContentLoaded", () => {
  const installBtn = document.getElementById("pwaInstallBtn");
  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (deferredPrompt) {
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, throw it away
        deferredPrompt = null;
        // Hide the button
        installBtn.style.display = "none";
      }
    });
  }
});

window.addEventListener('appinstalled', () => {
  // Hide the app-provided install promotion
  const installBtn = document.getElementById("pwaInstallBtn");
  if (installBtn) {
    installBtn.style.display = "none";
  }
  // Clear the deferredPrompt so it can be garbage collected
  deferredPrompt = null;
  console.log('PWA was installed');
  if (typeof trackEvent === "function") trackEvent("pwa_installed", "App Support", "Success");
});

// --- Global Analytics Listener ---
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-analytics]");
  if (btn) {
    const action = btn.getAttribute("data-analytics");
    const label = btn.getAttribute("data-analytics-label") || "";
    if (typeof trackEvent === "function") {
      trackEvent(action, "Feature Usage", label);
    }
  }
});


// --- DAU Analytics Tracking ---
// Track explicit app open (useful for PWA/Offline DAU metrics)
if (typeof trackEvent === 'function') {
  trackEvent('app_opened', 'Engagement');
}

// Track when a user returns to the app from the background
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (typeof trackEvent === 'function') {
      trackEvent('app_returned', 'Engagement');
    }
  }
});



