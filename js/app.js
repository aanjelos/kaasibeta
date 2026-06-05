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
    const selectedYear =
      yearSelector && yearSelector.value
        ? parseInt(yearSelector.value)
        : currentYear;

    renderMonthTabs(selectedYear);

    const monthlySearchInput = $("#monthlySearchInput");
    const clearMonthlySearchBtn = $("#clearMonthlySearchBtn");
    const searchScopeSelect = $("#searchScopeSelect"); // Get the dropdown

    if (monthlySearchInput) {
      monthlySearchInput.value = "";
    }
    if (clearMonthlySearchBtn) {
      clearMonthlySearchBtn.style.display = "none";
      clearMonthlySearchBtn.disabled = true;
    }
    // FIXED: Reset dropdown to 'month' and update the global scope variable
    if (searchScopeSelect) {
      searchScopeSelect.value = "month";
      monthlyViewSearchScope = "month";
    }

    $("#monthlyViewModal").style.display = "block";

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

  if (donateModal && footerDonateBtn && closeDonateModalBtn) {
    footerDonateBtn.addEventListener("click", () => {
      donateModal.style.display = "block";
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
  const searchScopeSelect = $("#searchScopeSelect"); // New dropdown

  const triggerSearch = () => {
    clearTimeout(monthlySearchDebounceTimer);
    monthlySearchDebounceTimer = setTimeout(() => {
      const activeTab = $("#monthTabs .tab-button.active");
      if (activeTab) {
        const month = parseInt(activeTab.dataset.month);
        const year = parseInt(activeTab.dataset.year);
        const searchTerm = monthlySearchInput.value.trim();
        renderMonthlyDetails(month, year, new Set(), searchTerm, true);
      }
    }, 400);
  };

  if (monthlySearchInput && clearMonthlySearchBtn && searchScopeSelect) {
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

    clearMonthlySearchBtn.addEventListener("click", () => {
      clearTimeout(monthlySearchDebounceTimer);
      monthlySearchInput.value = "";
      clearMonthlySearchBtn.style.display = "none";
      clearMonthlySearchBtn.disabled = true;
      triggerSearch();
      monthlySearchInput.focus();
    });

    // NEW: Event listener for the scope dropdown
    searchScopeSelect.addEventListener("change", () => {
      monthlyViewSearchScope = searchScopeSelect.value;
      // Re-run the current search with the new scope
      triggerSearch();
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
        modal.style.display = "block";
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

  if (ccHistorySearchInput && clearCcHistorySearchBtn) {
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
      $("#debtsViewModal").style.display = "block";
    };
  }

  const viewReceivablesBtn = $("#viewReceivablesBtn");
  if (viewReceivablesBtn) {
    viewReceivablesBtn.onclick = () => {
      renderReceivableList();
      $("#receivablesViewModal").style.display = "block";
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
async function initializeSupabase() {
  if (!supabaseClient) {
    console.error("Supabase client not available.");
    return;
  }
  console.log("Checking Supabase auth state...");

  // Handle auth state changes (e.g., login, logout)
  supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("Supabase auth state changed:", event, session);
    const user = session?.user || null;
    supabaseUser = user;
    updateSupabaseUI(user);
  });

  // Check for initial session
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error("Error getting session:", error.message);
      throw error;
    }
    const user = data.session?.user || null;
    supabaseUser = user;
    updateSupabaseUI(user);
    console.log(
      "Initial session check complete. User:",
      user ? user.email : "none"
    );
  } catch (error) {
    console.error("Failed to initialize session:", error);
    updateSupabaseUI(null);
  }
}

/**
 * Updates the Data Management UI based on login state.
 */
function updateSupabaseUI(user) {
  const loggedOutView = $("#cloudBackupLoggedOut");
  const loggedInView = $("#cloudBackupLoggedIn");
  const userEmailEl = $("#userEmail");
  const shortcutCloudInput = $("#shortcutCloud");
  const shortcutCloudLabel = $("#shortcutCloudLabel");
  const shortcutLocalInput = $("#shortcutLocal");

  if (
    !loggedOutView ||
    !loggedInView ||
    !userEmailEl ||
    !shortcutCloudInput ||
    !shortcutCloudLabel
  ) {
    console.warn(
      "Could not find all Supabase UI elements in Settings to update."
    );
    return;
  }

  if (user) {
    // User is logged IN
    loggedOutView.classList.add("hidden");
    loggedInView.classList.remove("hidden");
    userEmailEl.textContent = user.email;
    shortcutCloudInput.disabled = false;
    shortcutCloudLabel.classList.remove(
      "text-gray-400",
      "opacity-60",
      "cursor-not-allowed"
    );
    shortcutCloudLabel.classList.add("text-gray-300");

    // --- NEW: Default to Cloud Backup on login ---
    shortcutCloudInput.checked = true;
    shortcutLocalInput.checked = false;
    // --- END NEW ---
  } else {
    // User is logged OUT
    loggedOutView.classList.remove("hidden");
    loggedInView.classList.add("hidden");
    userEmailEl.textContent = "...";
    shortcutCloudInput.disabled = true;
    shortcutCloudInput.checked = false; // Uncheck it
    if (shortcutLocalInput) shortcutLocalInput.checked = true; // Default to local
    shortcutCloudLabel.classList.add(
      "text-gray-400",
      "opacity-60",
      "cursor-not-allowed"
    );
    shortcutCloudLabel.classList.remove("text-gray-300");
  }

  // Update the header buttons to reflect the (new) shortcut state
  updateHeaderShortcutButtons();
}

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

  // Check if cloud is selected AND enabled
  const isCloud = cloudRadio.checked && !cloudRadio.disabled;

  if (isCloud) {
    // Set to CLOUD mode
    // backupBtn.innerHTML = 'Backup'; // No longer changing text
    // backupBtn.className = "btn btn-primary mr-2"; // No longer changing class
    backupBtn.dataset.tooltip = "Export to Cloud (Ctrl+E)";
    backupBtn.onclick = backupToSupabase; // Assign cloud backup function

    // restoreBtn.innerHTML = 'Restore'; // No longer changing text
    // restoreBtn.className = "btn btn-secondary mr-2"; // No longer changing class
    restoreBtn.dataset.tooltip = "Import from Cloud (Ctrl+I)";
    restoreBtn.onclick = restoreFromSupabase; // Assign cloud restore function
  } else {
    // Set to LOCAL mode (default)
    // backupBtn.innerHTML = 'Exp.'; // No longer changing text
    // backupBtn.className = "btn btn-secondary mr-2"; // No longer changing class
    backupBtn.dataset.tooltip = "Export Local File (Ctrl+E)";
    backupBtn.onclick = exportData; // Assign local export function

    // restoreBtn.innerHTML = 'Imp.'; // No longer changing text
    // restoreBtn.className = "btn btn-secondary mr-2"; // No longer changing class
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

/**
 * Initiates the Google Sign-In flow via Supabase.
 */
async function signInWithGoogle() {
  if (!supabaseClient) return;
  console.log("Attempting Google Sign-In...");
  try {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        // You can add scopes here if needed, e.g., 'email profile'
        // redirectTo: 'https://app.kaasi.com.lk' // Supabase uses the URL Config settings
      },
    });
    if (error) {
      console.error("Error during Google sign-in:", error.message);
      showNotification(`Google Sign-In Error: ${error.message}`, "error");
    } else {
      console.log("Sign-in data:", data);
      // User will be redirected to Google, then back.
    }
  } catch (error) {
    console.error("Exception during sign-in:", error);
    showNotification("An unexpected error occurred during sign-in.", "error");
  }
}

/**
 * Signs the user out from Supabase.
 */
async function signOut() {
  if (!supabaseClient) return;
  console.log("Attempting Sign-Out...");
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error("Error during sign-out:", error.message);
      showNotification(`Sign-Out Error: ${error.message}`, "error");
    } else {
      console.log("User signed out successfully.");
      supabaseUser = null;
      updateSupabaseUI(null);
      showNotification("You have been signed out.", "success");
    }
  } catch (error) {
    console.error("Exception during sign-out:", error);
    showNotification("An unexpected error occurred during sign-out.", "error");
  }
}

/**
 * Backs up the entire local 'state' object to the Supabase database.
 */
async function backupToSupabase() {
  if (!supabaseUser) {
    showNotification("You must be logged in to back up to the cloud.", "error");
    return;
  }

  // Show loading state on button
  const backupBtn = $("#backupToSupabaseBtn");
  const originalText = backupBtn.innerHTML;
  backupBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Backing up...`;
  backupBtn.disabled = true;

  console.log("Starting cloud backup...");

  try {
    // We use 'upsert' to either create a new record or update the existing one for this user.
    // ** THE FIX IS HERE: { onConflict: 'user_id' } **
    // This tells Supabase to use the 'user_id' column to detect conflicts.
    const { data, error } = await supabaseClient
      .from("user_data")
      .upsert(
        {
          user_id: supabaseUser.id,
          data: state, // 'state' is our complete localstorage JSON object
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id", // This is the magic line!
        }
      )
      .select() // Ask Supabase to return the saved row
      .single(); // We only expect one row

    if (error) {
      console.error("Error backing up data:", error.message);
      throw error;
    }

    console.log("Backup successful. Data saved:", data);
    const backupTime = data.updated_at
      ? new Date(data.updated_at).toLocaleString()
      : "just now";
    showNotification(
      `Cloud backup successful! (Last sync: ${backupTime})`,
      "success"
    );
  } catch (error) {
    console.error("Exception during backup:", error);
    showNotification(`Cloud backup failed: ${error.message}`, "error", 7000);
  } finally {
    // Restore button text and state
    backupBtn.innerHTML = originalText;
    backupBtn.disabled = false;
  }
}

/**
 * Restores the 'state' object from Supabase, overwriting local data.
 */
async function restoreFromSupabase() {
  if (!supabaseUser) {
    showNotification(
      "You must be logged in to restore from the cloud.",
      "error"
    );
    return;
  }

  // Show a confirmation modal first
  showConfirmationModal(
    "Restore from Cloud",
    "This will <strong class='text-warning'>OVERWRITE ALL</strong> your current local data with the data from your last cloud backup.<br><br>Are you sure you want to proceed?",
    "Restore & Overwrite",
    "Cancel",
    async () => {
      // onConfirm: Proceed with restore
      console.log("Starting cloud restore...");

      const restoreBtn = $("#restoreFromSupabaseBtn");
      const originalText = restoreBtn.innerHTML;
      restoreBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Restoring...`;
      restoreBtn.disabled = true;

      try {
        // ** THE FIX IS HERE: .order(...).limit(1) **
        // This makes the query more robust by ensuring we *only* get the single, most recent
        // backup for this user, which makes .single() safe to use.
        const { data, error } = await supabaseClient
          .from("user_data")
          .select("data, updated_at")
          .eq("user_id", supabaseUser.id)
          .order("updated_at", { ascending: false }) // Get newest one first
          .limit(1) // Only take that one
          .single(); // Now this is safe

        if (error || !data) {
          if (error && error.code === "PGRST116") {
            // "PostgREST error: No rows found"
            console.warn("No cloud backup found for this user.");
            showNotification("No cloud backup found to restore.", "info");
            return;
          }
          console.error(
            "Error fetching data:",
            error ? error.message : "No data found"
          );
          throw error || new Error("No data found to restore.");
        }

        console.log("Data fetched successfully:", data);

        if (!data.data || typeof data.data !== "object") {
          throw new Error("Cloud data is empty or in an invalid format.");
        }

        // --- Overwrite Local State ---
        // We deep merge into a default state to ensure all functions exist,
        // just like we do in loadData() and importData()
        let importedData = data.data;
        state = deepMerge(getDefaultState(), importedData);

        // Run the same integrity checks as local import
        ensureDefaultAccounts();
        ensureDefaultCategories();

        // Mark setup as done
        if (state.settings) state.settings.initialSetupDone = true;

        // Save the restored state to LocalStorage
        saveData();

        // Fully refresh the entire application UI
        initializeUI(true);

        const backupTime = new Date(data.updated_at).toLocaleString();
        showNotification(
          `Restore successful! (Data from ${backupTime})`,
          "success"
        );
        closeModal("settingsModal");
      } catch (error) {
        console.error("Exception during restore:", error);
        showNotification(
          `Cloud restore failed: ${error.message}`,
          "error",
          7000
        );
      } finally {
        restoreBtn.innerHTML = originalText;
        restoreBtn.disabled = false;
      }
    },
    () => {
      // onCancel: Do nothing
      console.log("Cloud restore cancelled by user.");
    }
  );
}

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
