/**
 * app.js
 * Main entry point and initialization logic for the application.
 * Sets up UI, event listeners, and coordinates core components.
 */
function initializeUI(isRefresh = false) {
  if (window.uiInitialized && !isRefresh) return;
  window.uiInitialized = true;
  console.log("Initializing UI...");


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


  // The onclick logic is now dynamic, so we set it in updateHeaderShortcutButtons()
  // This function will set their initial state (icons, tooltips, onclick)
  updateHeaderShortcutButtons();
  setupMobileDropdown();
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


  const donateModal = document.getElementById("donateModal");
  const footerDonateBtn = document.getElementById("footerDonateBtn");
  const closeDonateModalBtn = document.getElementById("closeDonateModal");

  if (donateModal && footerDonateBtn && closeDonateModalBtn) {
    if (!isRefresh) {
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
          
          if (navigator.clipboard && window.isSecureContext) {
            // Modern Clipboard API
            navigator.clipboard.writeText(textToCopy).then(() => {
              button.textContent = "Copied!";
              setTimeout(() => {
                button.innerHTML = '<i class="far fa-copy"></i>';
              }, 2000);
            }).catch(err => {
              console.error("Clipboard API failed:", err);
              button.textContent = "Failed!";
              setTimeout(() => {
                button.innerHTML = '<i class="far fa-copy"></i>';
              }, 2000);
            });
          } else {
            // Fallback (must be executed synchronously to preserve user gesture)
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;
            
            // Minimal styling to prevent page jump but keep it selectable
            textArea.style.position = "fixed";
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.width = "2em";
            textArea.style.height = "2em";
            textArea.style.padding = "0";
            textArea.style.border = "none";
            textArea.style.outline = "none";
            textArea.style.boxShadow = "none";
            textArea.style.background = "transparent";
            document.body.appendChild(textArea);
            
            textArea.focus();
            textArea.select();

            try {
              document.execCommand("copy");
              button.textContent = "Copied!";
            } catch (err) {
              console.error("Fallback clipboard failed:", err);
              button.textContent = "Failed!";
            }
            
            document.body.removeChild(textArea);
            setTimeout(() => {
              button.innerHTML = '<i class="far fa-copy"></i>';
            }, 2000);
          }
        });
      });
    }
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

    const filterDateRange = $("#filterDateRange");
    const customDateInputs = $("#customDateInputs");
    if (filterDateRange) filterDateRange.value = "none";
    if (customDateInputs) customDateInputs.style.display = "none";

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

  window.openMonthlyViewWithCategories = (categories) => {
    // 1. Setup month tabs
    const yearSelector = $("#yearSelector");
    const currentYear = new Date().getFullYear();
    if (yearSelector) {
      yearSelector.value = currentYear;
    }
    if (typeof renderMonthTabs === "function") {
      renderMonthTabs(currentYear);
    }

    // 2. Reset filters (without triggering search yet)
    if (typeof window.resetAdvancedFiltersAndSearch === "function") {
      window.resetAdvancedFiltersAndSearch(false);
    }

    // 3. Apply category filters
    const filterCategoryDropdown = $("#filterCategoryDropdown");
    if (filterCategoryDropdown && categories && categories.length > 0) {
      const allCheckboxes = filterCategoryDropdown.querySelectorAll(".filter-category-checkbox");
      const masterCheckbox = document.getElementById("filterCategoryAll");
      
      if (masterCheckbox) masterCheckbox.checked = false;
      
      let checkedCount = 0;
      let checkedLabel = "";
      allCheckboxes.forEach(cb => {
        if (categories.includes(cb.value)) {
          cb.checked = true;
          checkedCount++;
          checkedLabel = cb.nextElementSibling ? cb.nextElementSibling.textContent : cb.value;
        } else {
          cb.checked = false;
        }
      });
      
      const filterCategoryBtnText = $("#filterCategoryBtnText");
      if (filterCategoryBtnText) {
        if (checkedCount === 1) {
          filterCategoryBtnText.textContent = checkedLabel;
        } else if (checkedCount > 1) {
          filterCategoryBtnText.textContent = `${checkedCount} Categories`;
        } else {
          filterCategoryBtnText.textContent = "All Categories";
        }
      }
    }

    // 4. Set filter type to 'expense'
    if ($("#filterType")) {
      $("#filterType").value = "expense";
    }

    // 5. Expand advanced filters to show the active state
    const advancedFiltersAccordion = $("#advancedFiltersAccordion");
    if (advancedFiltersAccordion) {
      advancedFiltersAccordion.classList.remove("hidden");
    }

    // 6. Set current month tab to active
    const currentMonth = new Date().getMonth();
    const currentMonthTab = $(
      `#monthTabs .tab-button[data-month='${currentMonth}'][data-year='${currentYear}']`
    );
    if (currentMonthTab) {
      $$("#monthTabs .tab-button").forEach((btn) => {
        btn.classList.remove("active");
        btn.removeAttribute("data-logically-active");
      });
      currentMonthTab.classList.add("active");
      currentMonthTab.setAttribute("data-logically-active", "true");
      if (typeof updateTabIndicator === 'function') {
        setTimeout(updateTabIndicator, 10);
      }
    }

    // 7. Trigger search
    if (typeof triggerSearch === "function") {
      triggerSearch();
    }

    // 8. Open the modal
    if (typeof openModalHelper === "function") {
      openModalHelper("monthlyViewModal");
    }
    
    // 9. Scroll to current month tab
    if (currentMonthTab) {
      setTimeout(() => {
        currentMonthTab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }, 50);
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
        renderMonthlyDetails(month, year, new Set(), false, searchTerm, true);
      }
    }, 400);
  };
  const filterDateRange = $("#filterDateRange");
  const customDateInputs = $("#customDateInputs");
  
  if (filterDateRange && !isRefresh) {
    filterDateRange.addEventListener("change", (e) => {
      const range = e.target.value;
      const filterStartDate = $("#filterStartDate");
      const filterEndDate = $("#filterEndDate");
      
      if (range === "custom") {
        if (customDateInputs) customDateInputs.style.display = "flex";
        return; // wait for user to select dates
      } else {
        if (customDateInputs) customDateInputs.style.display = "none";
      }

      if (range === "none") {
        if (filterStartDate) filterStartDate.value = "";
        if (filterEndDate) filterEndDate.value = "";
      } else {
        const now = new Date();
        let start = new Date();
        let end = new Date();
        
        switch (range) {
          case "allTime":
            start = new Date(2000, 0, 1);
            end = new Date(2100, 11, 31);
            break;
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
        
        if (filterStartDate) filterStartDate.value = start.toLocaleDateString("en-CA");
        if (filterEndDate) filterEndDate.value = end.toLocaleDateString("en-CA");
      }
      
      if (typeof triggerSearch === 'function') triggerSearch();
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
          if (filterDateRange) filterDateRange.value = "custom";
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
        localStorage.setItem("preferredSyncMethod", e.target.value);
        updateHeaderShortcutButtons();
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
    if (!transactionTypeSelect) return;
    const isIncome = transactionTypeSelect.value === "income";
    const isTransfer = transactionTypeSelect.value === "transfer";
    const isExpense = transactionTypeSelect.value === "expense";

    const normalAccountGroup = $("#normalAccountGroup");
    const transferAccountsGroup = $("#transferAccountsGroup");
    const transferFeeGroup = $("#transferFeeGroup");
    const categoryLabel = $("#categoryLabel");
    const categorySelect = $("#category");
    const descriptionLabel = document.querySelector('label[for="description"]');

    if (normalAccountGroup) normalAccountGroup.style.display = isTransfer ? "none" : "block";
    if (transferAccountsGroup) transferAccountsGroup.style.display = isTransfer ? "block" : "none";
    if (transferFeeGroup) transferFeeGroup.style.display = isTransfer ? "block" : "none";

    const toggleFeeDetails = () => {
      const feeInput = $("#transferFee");
      if (!feeInput || transactionTypeSelect.value !== "transfer") return;
      const feeVal = parseFloat(String(feeInput.value).replace(/,/g, ''));
      const shouldDisable = isNaN(feeVal) || feeVal <= 0;
      
      const descGroup = descriptionInput ? descriptionInput.parentElement : null;
      
      if (shouldDisable) {
        if (categoryGroup) categoryGroup.classList.add('opacity-50', 'pointer-events-none', 'transition-opacity', 'duration-300');
        if (descGroup) descGroup.classList.add('opacity-50', 'pointer-events-none', 'transition-opacity', 'duration-300');
        
        if (descriptionInput) descriptionInput.value = "-";
        if (categorySelect) {
           let dashOpt = categorySelect.querySelector('option[value="-disabled-"]');
           if (!dashOpt) {
             dashOpt = document.createElement("option");
             dashOpt.value = "-disabled-";
             dashOpt.textContent = "-";
             categorySelect.insertBefore(dashOpt, categorySelect.firstChild);
           }
           categorySelect.value = "-disabled-";
        }
      } else {
        if (categoryGroup) categoryGroup.classList.remove('opacity-50', 'pointer-events-none');
        if (descGroup) descGroup.classList.remove('opacity-50', 'pointer-events-none');
        
        if (categorySelect) {
          const dashOpt = categorySelect.querySelector('option[value="-disabled-"]');
          if (dashOpt) dashOpt.remove();
          
          if (!categorySelect.value || categorySelect.value === "-disabled-") {
            const defaultCat = state.settings.defaultTransferFeeCategory || "Bank Charges";
            if (Array.from(categorySelect.options).some(opt => opt.value === defaultCat)) {
              categorySelect.value = defaultCat;
            } else if (categorySelect.options.length > 1) {
               categorySelect.value = categorySelect.options[1].value;
            }
          }
        }
        if (descriptionInput && (descriptionInput.value === "-" || !descriptionInput.value)) {
          descriptionInput.value = "Transfer Fee";
        }
      }
    };

    if (categoryGroup) {
      if (isIncome) {
        categoryGroup.style.display = "none";
        if (categorySelect) categorySelect.required = false;
        if (descriptionLabel) descriptionLabel.textContent = "Description";
        if (descriptionInput) {
          descriptionInput.placeholder = "e.g., Monthly Salary";
          if (descriptionInput.value === "Transfer Fee" || descriptionInput.value === "-") descriptionInput.value = "";
        }
      } else if (isTransfer) {
        categoryGroup.style.display = "block";
        if (categorySelect) categorySelect.required = true;
        if (categoryLabel) categoryLabel.textContent = "Fee Category";
        if (descriptionLabel) descriptionLabel.textContent = "Fee Description";
        if (descriptionInput) {
          descriptionInput.placeholder = "e.g., Transfer to Savings";
          if (!descriptionInput.value) descriptionInput.value = "Transfer Fee";
        }
        
        // Auto-select default fee category if available
        if (categorySelect) {
          const defaultCat = state.settings.defaultTransferFeeCategory || "Bank Charges";
          if (Array.from(categorySelect.options).some(opt => opt.value === defaultCat)) {
            categorySelect.value = defaultCat;
          }
        }
        
        // Setup toggle Fee Details on input
        const feeInput = $("#transferFee");
        if (feeInput) {
          if (!feeInput.value) {
            feeInput.value = state.settings.defaultTransferFee !== undefined ? state.settings.defaultTransferFee : 25;
          }
          feeInput.removeEventListener("input", toggleFeeDetails);
          feeInput.addEventListener("input", toggleFeeDetails);
          toggleFeeDetails(); // Initial evaluate
        }
      } else {
        // Expense
        categoryGroup.style.display = "block";
        
        // Clean up classes if switching from transfer
        const descGroup = descriptionInput ? descriptionInput.parentElement : null;
        if (categoryGroup) categoryGroup.classList.remove('opacity-50', 'pointer-events-none');
        if (descGroup) descGroup.classList.remove('opacity-50', 'pointer-events-none');
        if (categorySelect) {
          const dashOpt = categorySelect.querySelector('option[value="-disabled-"]');
          if (dashOpt) dashOpt.remove();
        }

        if (categorySelect) categorySelect.required = true;
        if (categoryLabel) categoryLabel.textContent = "Category";
        if (descriptionLabel) descriptionLabel.textContent = "Description";
        if (descriptionInput) {
          descriptionInput.placeholder = "e.g., Lunch, Groceries";
          if (descriptionInput.value === "Transfer Fee" || descriptionInput.value === "-") descriptionInput.value = "";
        }
      }
    }

    const dateInput = $("#date");
    if (dateInput && !dateInput.value) {
      dateInput.value = getCurrentDateString();
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
      triggerDataImport();
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
  
  if (state.settings && state.settings.appPin && state.settings.appPin.enabled) {
    // Hide main container until unlocked to prevent inspect-element vulnerability
    const appContainer = document.getElementById("appContainer");
    if (appContainer) appContainer.classList.add("hidden");
    
    // Hide preloader so it doesn't run its timer in the background
    const preloaderElement = document.getElementById("preloader");
    if (preloaderElement) {
      preloaderElement.style.display = "none";
      preloaderElement.classList.add("hidden");
    }
    
    showPinLockScreen();
  } else {
    initializeUI(); // Set up all initial UI elements, event listeners, and render initial views
    initializeGlobalTooltips(); // Initialize the global tooltip handler
    if (typeof executePreloaderSequence === "function") executePreloaderSequence();
    onAppUnlocked();
  }

  // --- AUTO-LOCK INACTIVITY TIMER ---
  let inactivityTimer;
  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    const pinOverlay = document.getElementById("pinLockOverlay");
    if (state.settings && state.settings.appPin && state.settings.appPin.enabled && pinOverlay && pinOverlay.classList.contains("hidden")) {
      inactivityTimer = setTimeout(() => {
        showPinLockScreen();
      }, 5 * 60 * 1000); // 5 minutes
    }
  }

  ["touchstart", "mousemove", "keydown", "scroll", "click"].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer, { passive: true });
  });
  resetInactivityTimer();
  // --- END AUTO-LOCK ---

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
});

window.executePreloaderSequence = function() {
  // Preloader logic
  const preloaderElement = document.getElementById("preloader");
  const appContentElement = document.getElementById("app-content");
  const preloaderDuration = 1250; // Duration preloader is visible

  // Initialize random preloader loading screen tips
  const PRELOADER_TIPS = [
    // Supabase & Backups
    "Access Cloud Backups in Settings > Data.",
    
    // UI Customize & Theme
    "Toggle Dark & Light Mode in Settings > Appearance.",
    "Hide Cash Counter, Debts, or Installments in Settings > Appearance.",
    "Hide unused bank accounts in Settings > Accounts.",
    
    // Tools & Shortcuts
    "Type basic math (+, -, *, /) directly into amount fields.",
    "Click the calculator icon inside inputs to open the Math Toolbar.",
    "Transfer money between accounts by selecting 'Transfer' in Add Transaction.",
    
    // Details & Charts
    "Tap a transaction to view its full details and description.",
    "Click legends in the dashboard chart to toggle lines visibility.",
    "Click the chart title icon to toggle between daily and monthly views.",
    "Filter history by category, amount, or date in All Transactions.",
    "Export print-friendly PDF reports inside All Transactions.",
    "Exclude categories from charts or PDFs in Category Settings.",
    "Enable a PIN lock screen in Settings > Security.",
    
    // Easter Eggs & Local-First
    "Kaasi works 100% offline. No signal, no problem!",
    "Adulting is expensive. Kaasi helps you keep track.",
    "Fun Fact: Kaasi means coins in Sinhala.",
    "Your financial secrets are safe. All data stays local by default.",
    "Budgeting: because coffee isn't free.",
    "Rumor has it that budgeting makes you rich. Let's find out!"
  ];

  // Dynamically add keyboard shortcuts for non-mobile/desktop users
  const isMobile = window.innerWidth < 768;
  if (!isMobile) {
    PRELOADER_TIPS.push(
      "Quickly backup with Ctrl+E and restore with Ctrl+I.",
      "Press the 'A' key to view All Transactions.",
      "Press the '?' key to view Keyboard Shortcuts."
    );
  }
  
  PRELOADER_TIPS.push(
    "Tip: You can edit past transactions by tapping them.",
    "A budget is telling your money where to go, instead of wondering where it went.",
    "Pro Tip: You can customize your categories in the Categories view.",
    "Use the date filter to see exactly how much you spent last month.",
    "Did you know? Setting limits on categories helps control spending.",
    "Every Rupee counts! Keep tracking."
  );

  const tipTextElement = document.getElementById("preloader-tip-text");
  if (tipTextElement && PRELOADER_TIPS.length > 0) {
    const randomTip = PRELOADER_TIPS[Math.floor(Math.random() * PRELOADER_TIPS.length)];
    tipTextElement.textContent = randomTip;
  }

  if (preloaderElement && appContentElement) {
    if (localStorage.getItem("pendingCloudRestore") === "true") {
      console.log("Pending cloud restore detected. Keeping preloader visible until restore completes.");
      // We attach a global helper to hide it later when restore finishes
      window.hidePreloader = () => {
        console.log("Manual trigger: Hiding preloader, showing app content.");
        preloaderElement.classList.add("hidden");
        appContentElement.classList.add("visible");
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
};

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


/**
 * Global Tooltip System
 * Manages a single body-level tooltip to prevent overflow clipping in scrollable containers.
 */
function initializeGlobalTooltips() {
  const tooltipEl = document.createElement("div");
  tooltipEl.id = "global-tooltip";
  tooltipEl.className = "hidden";
  document.body.appendChild(tooltipEl);

  let activeTarget = null;
  let animationFrameId = null;

  function updateTooltipPosition() {
    if (!activeTarget) return;

    const rect = activeTarget.getBoundingClientRect();
    const tooltipText = activeTarget.getAttribute("data-tooltip");
    if (!tooltipText) {
      hideTooltip();
      return;
    }

    tooltipEl.textContent = tooltipText;
    tooltipEl.classList.remove("hidden");

    // Center of target horizontally
    let left = rect.left + rect.width / 2;
    // Position below target by default
    let top = rect.bottom + 8;

    const tooltipRect = tooltipEl.getBoundingClientRect();

    // If it overflows the bottom viewport edge, show it above the target
    if (top + tooltipRect.height > window.innerHeight - 8) {
      top = rect.top - tooltipRect.height - 8;
    }

    // Keep it horizontally within screen bounds
    if (left - tooltipRect.width / 2 < 8) {
      left = tooltipRect.width / 2 + 8;
    } else if (left + tooltipRect.width / 2 > window.innerWidth - 8) {
      left = window.innerWidth - tooltipRect.width / 2 - 8;
    }

    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.left = `${left}px`;
    
    // Add class on next tick to trigger transition
    requestAnimationFrame(() => {
      tooltipEl.classList.add("visible");
    });
  }

  function hideTooltip() {
    activeTarget = null;
    tooltipEl.classList.remove("visible");
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    setTimeout(() => {
      if (!activeTarget) {
        tooltipEl.classList.add("hidden");
      }
    }, 150);
  }

  // Event delegation for hover states (only trigger tooltips on hover-capable pointer devices)
  document.addEventListener("mouseover", (e) => {
    if (window.matchMedia("(hover: hover)").matches) {
      const target = e.target.closest("[data-tooltip]");
      if (target) {
        activeTarget = target;
        updateTooltipPosition();
      }
    }
  });

  document.addEventListener("mouseout", (e) => {
    if (activeTarget && (!e.relatedTarget || !activeTarget.contains(e.relatedTarget))) {
      hideTooltip();
    }
  });

  // Mobile tap-to-tooltip support
  document.addEventListener("click", (e) => {
    if (!window.matchMedia("(hover: hover)").matches) {
      const target = e.target.closest("[data-tooltip]");
      if (target) {
        // Skip buttons so tooltips don't stick over opened modals
        if (target.tagName.toLowerCase() === "button" || target.closest("button")) {
          if (activeTarget) hideTooltip();
          return;
        }

        if (activeTarget !== target) {
          activeTarget = target;
          updateTooltipPosition();
          
          // Auto-hide after 2 seconds
          setTimeout(() => {
            if (activeTarget === target) hideTooltip();
          }, 2000);
        }
      } else if (activeTarget) {
        // Tap outside dismisses immediately
        hideTooltip();
      }
    }
  });

  // Keep positioned during window scrolling or resizing
  window.addEventListener("scroll", () => {
    if (activeTarget) {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateTooltipPosition);
    }
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (activeTarget) {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateTooltipPosition);
    }
  }, { passive: true });
}




