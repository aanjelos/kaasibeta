/**
 * data-sync.js
 * Handles data import/export, local storage persistence, and cloud synchronization (Supabase).
 */
function downloadKaasiSnapshot(snapshot, prefix = "kaasi-backup") {
  const blob = new Blob([JSON.stringify(portableKaasiData(snapshot), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${prefix}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  link.href = url; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportData() {
  if (isAppLocked() || storageOperationPending) return;
  try {
    const dataStr = JSON.stringify(portableKaasiData(await KaasiStorage.snapshot()), null, 2);
    const dataBlob = new Blob([dataStr], {
      type: "application/json",
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-");
    link.download = `kaasi-backup-${timestamp}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    

    appPreferences.setItem("lastSuccessfulBackupDate", getCurrentDateString());
    
    showNotification("Data exported.", "success");
    if (typeof Milestones !== 'undefined') Milestones.track('local_backup');
  } catch (error) {
    console.error("Export failed:", error);
    showNotification("Data export failed.", "error");
  }
}

function importData(event) {
  if (isAppLocked()) return;
  const file = event.target.files[0];
  if (!file) {
    if (event && event.target) event.target.value = null;
    return;
  }

  showConfirmationModal(
    "Import Data",
    "Importing data will <strong class='text-warning'>OVERWRITE ALL</strong> current data. This action cannot be undone.<br><br>Are you sure you want to proceed?",
    "Import & Overwrite",
    "Cancel",
    () => {
      // onConfirm
      const reader = new FileReader();
      const expectedRevision = KaasiStorage.revision;
      reader.onload = (e) => {
        showNotification("Restoring data... Please wait.", "info");
        setTimeout(async () => {
          try {
            let importedData = JSON.parse(e.target.result);
            if (importedData && typeof importedData === "object") {
              

              const requiredArrays = ["transactions", "accounts", "categories"];
              for (const arr of requiredArrays) {
                if (!Array.isArray(importedData[arr])) {
                  throw new Error(`Corrupted backup file: Missing or invalid '${arr}' structure.`);
                }
              }


              await applyImportedData(importedData, expectedRevision);
            showNotification(
              "Backup imported. Automatic sync is paused.",
              "success"
            );
            await closeModal("settingsModal");
          } else {
            throw new Error(
              "Invalid data structure in imported file. Ensure it's a Kaasi backup."
            );
          }
        } catch (error) {
          console.error("Import failed during processing:", error);
          showNotification(`Import failed: ${error.message}`, "error", 7000);
        } finally {
          if (event && event.target) event.target.value = null;
        }
        }, 350);
      };
      reader.onerror = () => {
        showNotification("Failed to read the import file.", "error");
        if (event && event.target) event.target.value = null;
      };
      reader.readAsText(file);
    },
    () => {
      // onCancel
      if (event && event.target) event.target.value = null;
      showNotification("Import cancelled.", "info");
    },
    "btn-primary"
  );
}

function initiateDeleteAllData() {
  $("#initiateDeleteBtn").classList.add("hidden");
  $("#deleteConfirmationSection").classList.remove("hidden");
  resetDeleteSlider();
}

function cancelDeleteAllData() {
  $("#initiateDeleteBtn").classList.remove("hidden");
  $("#deleteConfirmationSection").classList.add("hidden");
  resetDeleteSlider();
}

let maxTranslateX = 0;
let isDragging = false;
function setupDeleteSlider() {
  const sliderContainer = $("#deleteSliderContainer");
  const handle = $("#deleteSliderHandle");
  const track = sliderContainer.querySelector(".slide-to-confirm-track");
  if (!sliderContainer || !handle || !track) return;

  let startX = 0;
  let currentTranslateX = 0;

  const calculateMaxTranslate = () => {
    maxTranslateX = sliderContainer.offsetWidth - handle.offsetWidth - 4;
  };

  window.resetDeleteSlider = () => {
    isDragging = false;
    currentTranslateX = 0;
    handle.style.transition =
      "transform 0.2s ease-out, background-color 0.2s ease-out";
    track.style.transition =
      "width 0.2s ease-out, background-color 0.2s ease-out";
    handle.style.transform = `translateX(0px)`;
    track.style.width = `0px`;
    track.style.backgroundColor = "var(--button-success-bg)";
    handle.innerHTML = '<i class="fas fa-arrow-right"></i>';
    handle.style.backgroundColor = "var(--accent-primary)";
    handle.style.cursor = "grab";
    sliderContainer.style.cursor = "pointer";
  };

  const startDrag = (clientX) => {
    calculateMaxTranslate();
    isDragging = true;
    startX = clientX - handle.getBoundingClientRect().left;
    handle.style.transition = "none";
    track.style.transition = "none";
    handle.style.cursor = "grabbing";
    sliderContainer.style.cursor = "grabbing";
  };

  const drag = (clientX) => {
    if (!isDragging) return;
    let newTranslateX =
      clientX - sliderContainer.getBoundingClientRect().left - startX;
    currentTranslateX = Math.max(0, Math.min(newTranslateX, maxTranslateX));
    handle.style.transform = `translateX(${currentTranslateX}px)`;
    track.style.width = `${currentTranslateX + handle.offsetWidth / 2}px`;
  };

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    handle.style.cursor = "grab";
    sliderContainer.style.cursor = "pointer";

    handle.style.transition =
      "transform 0.2s ease-out, background-color 0.2s ease-out";
    track.style.transition =
      "width 0.2s ease-out, background-color 0.2s ease-out";

    if (currentTranslateX >= maxTranslateX - 1) {
      completeDeletion();
    } else {
      resetDeleteSlider();
    }
  };

  handle.addEventListener("mousedown", (e) => startDrag(e.clientX));
  document.addEventListener("mousemove", (e) => {
    if (isDragging) drag(e.clientX);
  });
  document.addEventListener("mouseup", endDrag);

  handle.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      startDrag(e.touches[0].clientX);
    },
    {
      passive: false,
    }
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (isDragging) {
        e.preventDefault();
        drag(e.touches[0].clientX);
      }
    },
    {
      passive: false,
    }
  );
  document.addEventListener("touchend", endDrag);

  window.addEventListener("resize", () => {
    if (
      $("#deleteConfirmationSection") &&
      !$("#deleteConfirmationSection").classList.contains("hidden")
    ) {
      calculateMaxTranslate();
      resetDeleteSlider();
    }
  });
}

function completeDeletion() {
  const handle = $("#deleteSliderHandle");
  const track = $(".slide-to-confirm-track");
  handle.innerHTML = '<i class="fas fa-check"></i>';
  handle.style.backgroundColor = "var(--button-success-bg)";
  track.style.width = "100%";
  track.style.backgroundColor = "var(--button-success-bg)";
  handle.style.transform = `translateX(${maxTranslateX}px)`;
  isDragging = false;
  handle.style.pointerEvents = "none";
  setTimeout(async () => {
    // Log out if connected to cloud
    if (typeof supabaseUser !== "undefined" && supabaseUser && typeof signOut === "function") {
      await signOut();
    }
    
    await KaasiStorage.clear();
    await startLocalStorage();
    state = getDefaultState();
    ensureDefaultAccounts();
    ensureDefaultCategories();
    initializeUI(true);
    await closeModal("settingsModal");
    showNotification("All data deleted and logged out.", "success");
    if (typeof openInitialSetupWizard === "function") {
      openInitialSetupWizard();
    }
    handle.style.pointerEvents = "auto";
  }, 500);
}



async function fetchAndUpdateLastCloudSyncTime() {
  return refreshCloudSyncStatus();
}

async function signInWithGoogle() {
  if (!supabaseClient) return;
  console.log("Attempting Google Sign-In...");
  try {
    // Set a flag to indicate we should automatically restore data upon returning
    appPreferences.setItem("pendingCloudRestore", "true");
    await appPreferences.flush();
    
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        // You can add scopes here if needed, e.g., 'email profile'
        // redirectTo: window.location.origin + window.location.pathname // usually automatic
      },
    });
    if (error) {
      appPreferences.removeItem("pendingCloudRestore");
      console.error("Error during Google sign-in:", error.message);
      showNotification(`Google Sign-In Error: ${error.message}`, "error");
    } else {
      console.log("Google Sign-In initiated successfully");
    }
  } catch (err) {
    appPreferences.removeItem("pendingCloudRestore");
    console.error("Exception during Google sign-in:", err);
    showNotification("An unexpected error occurred during sign-in.", "error");
  }
}

async function signOut() {
  if (!supabaseClient) return;
  console.log("Attempting Sign-Out...");
  
  const localSignOutCleanup = () => {
    appPreferences.removeItem("preferredSyncMethod");
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
        localStorage.removeItem(key);
      }
    }
    supabaseUser = null;
    updateSupabaseUI(null);
  };

  if (!navigator.onLine) {
    localSignOutCleanup();
    showNotification("Signed out locally (Offline).", "info");
    return;
  }

  try {
    appPreferences.removeItem("preferredSyncMethod");
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error("Error during sign-out:", error.message);
      localSignOutCleanup();
      showNotification("Signed out locally (Offline).", "info");
    } else {
      console.log("User signed out successfully.");
      supabaseUser = null;
      updateSupabaseUI(null);
      showNotification("You have been signed out.", "success");
    }
  } catch (error) {
    console.error("Exception during sign-out:", error);
    localSignOutCleanup();
    showNotification("Signed out locally.", "info");
  }
}

async function backupToSupabase() {
  return syncCloudData();
}

async function executeBackupToSupabase() {
  return syncCloudData();
}

async function restoreFromSupabase(force = false, isFromDashboard = false) {
  return syncCloudData();
}



function handleBackupReminderDismiss(reminderKey) {
  try {
    appPreferences.setItem(reminderKey, getCurrentDateString());
    console.log(
      `Backup reminder dismissed for key: ${reminderKey} on ${getCurrentDateString()}`
    );
  } catch (e) {
    console.error("Error saving backup reminder dismissal state:", e);
  }
  closeModal("confirmationModal"); // Close the correct modal
}

function showBackupReminderPopup() {
  const title = "Backup Reminder";
  const message =
    "It's a good time to save an offline backup. Local backups protect you from data loss!";

  const reminderKey = "lastBackupReminderDismissedDate";

  // Use the robust confirmation modal for this
  showConfirmationModal(
    title,
    message,
    "Export Local File", // confirmText
    "Dismiss", // cancelText
    () => {
      // onConfirm: This runs when "Export Local File" is clicked
      exportData();
      handleBackupReminderDismiss(reminderKey);
    },
    () => {
      // onCancel: This runs when "Dismiss" is clicked
      handleBackupReminderDismiss(reminderKey);
    },
    "btn-primary" // Use the primary button style for the confirm action
  );
}

function checkAndTriggerBackupReminder() {
  if (!state.settings.initialSetupDone && state.transactions.length === 0) {
    console.log("Skipping backup reminder: Initial setup not done or no transactions.");
    return;
  }

  // Retrieve user preference
  let freqSetting = state.settings.backupReminderFrequency || "default";
  
  if (freqSetting === "off") {
    console.log("Backup reminders are disabled in settings.");
    return;
  }

  // Resolve 'default' dynamically based on cloud sync status
  if (freqSetting === "default") {
    // If Supabase user is logged in (or token exists in storage), default is 7 days, otherwise 3 days.
    const hasSupabaseSession = Object.keys(localStorage).some(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    freqSetting = (typeof supabaseUser !== 'undefined' && supabaseUser) || hasSupabaseSession ? "7" : "3";
  }

  const intervalDays = parseInt(freqSetting, 10);
  if (isNaN(intervalDays)) return;

  const currentDateStr = getCurrentDateString();
  const reminderKey = "lastBackupReminderDismissedDate";
  const lastDismissedStr = appPreferences.getItem(reminderKey);
  const lastBackupStr = appPreferences.getItem("lastSuccessfulBackupDate");
  
  // Parse dates. If no previous date, treat it as epoch 0 to trigger immediately (or based on last sync)
  const today = new Date(currentDateStr);
  
  // Use the most recent of either the last backup OR the last dismissed reminder
  let referenceDate = new Date(0); 
  
  if (lastBackupStr) {
    const d = new Date(lastBackupStr);
    if (!isNaN(d.getTime())) referenceDate = d;
  }
  
  if (lastDismissedStr) {
    const d = new Date(lastDismissedStr);
    if (!isNaN(d.getTime()) && d > referenceDate) {
      referenceDate = d;
    }
  }

  // Calculate elapsed days
  const elapsedMs = today.getTime() - referenceDate.getTime();
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

  if (elapsedDays >= intervalDays) {
    // Use a timeout to show the reminder after the app has loaded
    setTimeout(() => {
      console.log(`Time to show backup reminder. Elapsed: ${elapsedDays} days. Interval: ${intervalDays} days.`);
      showBackupReminderPopup();
    }, 500); // 0.5-second delay
  } else {
    console.log(`Backup reminder not needed yet. Elapsed: ${elapsedDays} days. Interval: ${intervalDays} days.`);
  }
}

// Attach a debug hook to the window object to test it instantly
window.triggerTestBackupReminder = () => {
  console.log("Triggering test backup reminder popup...");
  showBackupReminderPopup();
};



async function initializeSupabase() {
  if (!supabaseClient) {
    console.error("Supabase client not available.");
    return;
  }
  console.log("Checking Supabase auth state...");

  const checkAutoRestore = async (user) => {
    appPreferences.removeItem("pendingCloudRestore");
    if (!state?.settings?.initialSetupDone) {
      // Signing in never replaces data. Sync remains an explicit action.
      openInitialSetupWizard();
      if (user && $("#setupCloudSyncBtn")) $("#setupCloudSyncBtn").hidden = false;
    }
    
    // Hide the preloader if it was kept visible for pending restore
    if (typeof window.hidePreloader === "function") {
      window.hidePreloader();
      delete window.hidePreloader; // cleanup
    }
  };

  // Handle auth state changes (e.g., login, logout)
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log("Supabase auth state changed:", event, session ? session.user?.email : "no session");
    const user = session?.user || null;
    supabaseUser = user;
    if (user) {
      if (!appPreferences.getItem("preferredSyncMethod")) {
        appPreferences.setItem("preferredSyncMethod", "cloud");
      }
    }
    updateSupabaseUI(user);
    
    if (!user && appPreferences.getItem("preferredSyncMethod") === "cloud") {
      openCloudSessionExpiredModal();
    } else {
      await checkAutoRestore(user);
    }
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
    if (user) {
      if (!appPreferences.getItem("preferredSyncMethod")) {
        appPreferences.setItem("preferredSyncMethod", "cloud");
      }
    }
    updateSupabaseUI(user);
    console.log(
      "Initial session check complete. User:",
      user ? user.email : "none"
    );
    
    if (!user && appPreferences.getItem("preferredSyncMethod") === "cloud") {
      openCloudSessionExpiredModal();
    } else {
      await checkAutoRestore(user);
    }
  } catch (error) {
    console.error("Failed to initialize session:", error);
    updateSupabaseUI(null);
  }
}

function updateSupabaseUI(user) {
  resetCloudSyncAccount(user);
  scheduleAutomaticCloudSync(1000);
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


    const savedMethod = appPreferences.getItem("preferredSyncMethod");
    if (savedMethod === "local") {
      shortcutCloudInput.checked = false;
      shortcutLocalInput.checked = true;
    } else {
      shortcutCloudInput.checked = true;
      shortcutLocalInput.checked = false;
    }

    
    fetchAndUpdateLastCloudSyncTime();
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
 * Opens the non-closable cloud session expired modal, forcing the user to either
 * sign back in or choose local mode.
 */
function openCloudSessionExpiredModal() {
  const modal = $("#cloudSessionExpiredModal");
  if (!modal) return;
  
  modal.style.display = "block";
  if (typeof updateBodyScrollState === "function") {
    updateBodyScrollState();
  }
  
  // Set up event handlers for the buttons inside this modal
  const googleBtn = $("#sessionExpiredGoogleLoginBtn");
  const localBtn = $("#sessionExpiredLocalBtn");
  
  if (googleBtn) {
    googleBtn.onclick = () => {
      // Keep preferredSyncMethod as "cloud" (will be confirmed on login)
      signInWithGoogle();
    };
  }
  
  if (localBtn) {
    localBtn.onclick = () => {
      appPreferences.setItem("preferredSyncMethod", "local");
      
      // Default UI switches back to Local
      const localRadio = $("#shortcutLocal");
      const cloudRadio = $("#shortcutCloud");
      if (localRadio) localRadio.checked = true;
      if (cloudRadio) cloudRadio.checked = false;
      
      updateSupabaseUI(null);
      
      modal.style.display = "none";
      if (typeof updateBodyScrollState === "function") {
        updateBodyScrollState();
      }
      
      showNotification("Switched to Local Mode. Cloud sync is disabled.", "success");
    };
  }
}

// Global debug helper to test the session expiration modal
window.triggerTestSessionExpiration = () => {
  console.log("Triggering mock session expiration modal...");
  openCloudSessionExpiredModal();
};

