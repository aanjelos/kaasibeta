/**
 * data-sync.js
 * Handles data import/export, local storage persistence, and cloud synchronization (Supabase).
 */
function exportData() {
  try {
    const dataStr = JSON.stringify(state, null, 2);
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
    

    localStorage.setItem("lastSuccessfulBackupDate", getCurrentDateString());
    
    showNotification("Data exported.", "success");
  } catch (error) {
    console.error("Export failed:", error);
    showNotification("Data export failed.", "error");
  }
}

function importData(event) {
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
      reader.onload = (e) => {
        showNotification("Restoring data... Please wait.", "info");
        setTimeout(() => {
          try {
            let importedData = JSON.parse(e.target.result);
            if (importedData && typeof importedData === "object") {
              

              const requiredArrays = ["transactions", "accounts", "categories"];
              for (const arr of requiredArrays) {
                if (!Array.isArray(importedData[arr])) {
                  throw new Error(`Corrupted backup file: Missing or invalid '${arr}' structure.`);
                }
              }


              sanitizeAndMergeImportedData(importedData);

            if (!state.settings) state.settings = getDefaultState().settings;
            state.settings.initialSetupDone = true;

            saveData();
            initializeUI(true);
            showNotification(
              "Data imported and sanitized successfully. Application refreshed.",
              "success"
            );
            closeModal("settingsModal");
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
    
    localStorage.removeItem(STORAGE_KEY);
    state = getDefaultState();
    ensureDefaultAccounts();
    ensureDefaultCategories();
    initializeUI(true);
    closeModal("settingsModal");
    showNotification("All data deleted and logged out.", "success");
    if (typeof openInitialSetupWizard === "function") {
      openInitialSetupWizard();
    }
    handle.style.pointerEvents = "auto";
  }, 500);
}



async function fetchAndUpdateLastCloudSyncTime() {
  if (!supabaseUser || !supabaseClient) return;

  const timeEl = $("#lastCloudBackupTime");
  if (timeEl) timeEl.textContent = "Last backed up: Fetching...";

  try {
    const { data, error } = await supabaseClient
      .from("user_data")
      .select("updated_at")
      .eq("user_id", supabaseUser.id)
      .single();

    if (error || !data || !data.updated_at) {
      if (timeEl) timeEl.textContent = "Last backed up: Never";
      lastCloudSyncTimeString = "Never";
    } else {
      const date = new Date(data.updated_at);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      const formattedTime = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
      let formatted = "";
      
      if (diffMins <= 1) {
        formatted = "Just now";
      } else {
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();
        
        if (isToday) {
          formatted = `Today at ${formattedTime}`;
        } else if (isYesterday) {
          formatted = `Yesterday at ${formattedTime}`;
        } else {
          formatted = `${date.toLocaleDateString()} at ${formattedTime}`;
        }
      }
      
      lastCloudSyncTimeString = formatted;
      

      const lastSyncedCloudUpdatedAt = localStorage.getItem("lastSyncedCloudUpdatedAt");
      const lastLocalCloudSync = parseInt(localStorage.getItem("lastLocalCloudSync") || "0", 10);
      const lastLocalDataModification = parseInt(localStorage.getItem("lastLocalDataModification") || "0", 10);
      
      window.currentCloudSyncStatus = "synced";
      
      if (data.updated_at !== lastSyncedCloudUpdatedAt && lastSyncedCloudUpdatedAt) {
        window.currentCloudSyncStatus = "cloud_newer";
      } else if (lastLocalDataModification > lastLocalCloudSync + 2000) {
        const currentDataStr = localStorage.getItem("KaasiData");
        const currentHash = typeof generateDataHash === "function" ? generateDataHash(currentDataStr) : null;
        const syncedHash = localStorage.getItem("kaasi_synced_state_hash");
        
        if (currentHash && syncedHash && currentHash === syncedHash) {
          window.currentCloudSyncStatus = "synced";
        } else {
          window.currentCloudSyncStatus = "local_newer";
        }
      }

      
      if (timeEl) {
        if (window.currentCloudSyncStatus === "cloud_newer") {
          timeEl.textContent = `Last backed up: ${formatted} (elsewhere)`;
        } else {
          timeEl.textContent = `Last backed up: ${formatted}`;
        }
      }
    }
    
    updateHeaderShortcutButtons();
  } catch (err) {
    console.error("Failed to fetch last backup time", err);
    if (timeEl) timeEl.textContent = "Last backed up: Unknown";
    lastCloudSyncTimeString = "";
  }
}

async function signInWithGoogle() {
  if (!supabaseClient) return;
  console.log("Attempting Google Sign-In...");
  try {
    // Set a flag to indicate we should automatically restore data upon returning
    localStorage.setItem("pendingCloudRestore", "true");
    
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        // You can add scopes here if needed, e.g., 'email profile'
        // redirectTo: window.location.origin + window.location.pathname // usually automatic
      },
    });
    if (error) {
      localStorage.removeItem("pendingCloudRestore");
      console.error("Error during Google sign-in:", error.message);
      showNotification(`Google Sign-In Error: ${error.message}`, "error");
    } else {
      console.log("Google Sign-In initiated successfully");
    }
  } catch (err) {
    localStorage.removeItem("pendingCloudRestore");
    console.error("Exception during Google sign-in:", err);
    showNotification("An unexpected error occurred during sign-in.", "error");
  }
}

async function signOut() {
  if (!supabaseClient) return;
  console.log("Attempting Sign-Out...");
  
  const localSignOutCleanup = () => {
    localStorage.removeItem("preferredSyncMethod");
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
    localStorage.removeItem("preferredSyncMethod");
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
  if (!supabaseUser) {
    showNotification("You must be logged in to back up to the cloud.", "error");
    return;
  }

  if (window.currentCloudSyncStatus === "cloud_newer") {
    showConfirmationModal(
      "Overwrite Newer Cloud Data?",
      "<p class='mb-3'>Your cloud backup contains <strong class='text-warning'>newer data</strong> than what is currently on this device.</p><p>If you proceed, you will permanently overwrite the newer cloud data with your older local data.</p>",
      "Overwrite Cloud Data",
      "Cancel",
      async () => {
        await executeBackupToSupabase();
      }
    );
  } else {
    await executeBackupToSupabase();
  }
}

async function executeBackupToSupabase() {

  // Show loading state on button
  const backupBtn = $("#backupToSupabaseBtn");
  const originalText = backupBtn.innerHTML;
  backupBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Backing up...`;
  backupBtn.disabled = true;

  console.log("Starting cloud backup...");
  showNotification("Saving backup...", "info", 5000);

  try {
    // We use 'upsert' to either create a new record or update the existing one for this user.


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

    console.log("Backup successful.");
    const backupTime = data.updated_at
      ? new Date(data.updated_at).toLocaleString()
      : "just now";
      

    if (data.updated_at) localStorage.setItem("lastSyncedCloudUpdatedAt", data.updated_at);
    const now = Date.now().toString();
    localStorage.setItem("lastLocalCloudSync", now);
    localStorage.setItem("lastLocalDataModification", now);
    localStorage.setItem("lastSuccessfulCloudBackupDate", getCurrentDateString());
    const currentDataStr = localStorage.getItem("KaasiData");
    if (currentDataStr && typeof generateDataHash === "function") {
      localStorage.setItem("kaasi_synced_state_hash", generateDataHash(currentDataStr));
    }

    
    showNotification(
      `Cloud backup successful! (Last sync: ${backupTime})`,
      "success"
    );
    
    // Refresh the UI timestamp and tooltips
    fetchAndUpdateLastCloudSyncTime();
  } catch (error) {
    console.error("Exception during backup:", error);
    showNotification(`Cloud backup failed: ${error.message}`, "error", 7000);
  } finally {
    // Restore button text and state
    backupBtn.innerHTML = originalText;
    backupBtn.disabled = false;
  }
}

async function restoreFromSupabase(force = false, isFromDashboard = false) {
  // Prevent MouseEvent from being evaluated as true when called via onclick
  if (typeof force !== "boolean") force = false;

  if (isFromDashboard && localStorage.getItem("skipRestoreWarning") === "true") {
    force = true;
  }
  if (!supabaseUser) {
    showNotification(
      "You must be logged in to restore from the cloud.",
      "error"
    );
    return;
  }
  
  if (window.isRestoringFromCloud) return;

  const doRestore = async () => {
    window.isRestoringFromCloud = true;
    // onConfirm: Proceed with restore
    console.log("Starting cloud restore...");

    const restoreBtn = $("#restoreFromSupabaseBtn");
    const originalText = restoreBtn ? restoreBtn.innerHTML : "Restore";
    if (restoreBtn) {
      restoreBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Restoring...`;
      restoreBtn.disabled = true;
    }
    showNotification("Restoring from cloud...", "info", 5000);

      try {

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

        console.log("Data fetched successfully.");

        if (!data.data || typeof data.data !== "object") {
          throw new Error("Cloud data is empty or in an invalid format.");
        }

        // --- Overwrite Local State ---
        // We deep merge into a default state to ensure all functions exist,
        // just like we do in loadData() and importData()
        let importedData = data.data;
        const previousState = JSON.parse(JSON.stringify(state)); // In-memory backup
        
        try {
          state = deepMerge(getDefaultState(), importedData);

          // Run the same integrity checks as local import
          ensureDefaultAccounts();
          ensureDefaultCategories();

          // Mark setup as done
          if (state.settings) state.settings.initialSetupDone = true;
        } catch (mergeError) {
          state = previousState; // Revert to backup on failure
          console.error("State merge failed:", mergeError);
          throw new Error("Failed to merge cloud data. State reverted.");
        }

        // Save the restored state to LocalStorage
        saveData();

        // Fully refresh the entire application UI
        initializeUI(true);


        if (data.updated_at) localStorage.setItem("lastSyncedCloudUpdatedAt", data.updated_at);
        const now = Date.now().toString();
        localStorage.setItem("lastLocalCloudSync", now);
        localStorage.setItem("lastLocalDataModification", now);
        const currentDataStr = localStorage.getItem("KaasiData");
        if (currentDataStr && typeof generateDataHash === "function") {
          localStorage.setItem("kaasi_synced_state_hash", generateDataHash(currentDataStr));
        }


        const backupTime = new Date(data.updated_at).toLocaleString();
        showNotification(
          `Restore successful! (Data from ${backupTime})`,
          "success"
        );

        // Refresh the UI timestamp and tooltips
        fetchAndUpdateLastCloudSyncTime();

        closeModal("settingsModal");
      } catch (error) {
        console.error("Exception during restore:", error);
        showNotification(
          `Cloud restore failed: ${error.message}`,
          "error",
          7000
        );
      } finally {
        if (restoreBtn) {
          restoreBtn.innerHTML = originalText;
          restoreBtn.disabled = false;
        }
        window.isRestoringFromCloud = false;
      }
  };

    if (force) {
      await doRestore();
    } else {
      let extraHtml = "";
      if (isFromDashboard) {
        extraHtml = `<div class="mt-4 pt-4 border-t border-gray-700">
          <label class="flex items-start gap-2.5 cursor-pointer group text-left max-w-[260px] mx-auto">
            <input type="checkbox" id="dontShowRestoreWarning" class="peer sr-only">
            <div class="shrink-0 w-4 h-4 rounded border border-gray-500 peer-checked:border-accent-500 flex items-center justify-center transition-colors text-transparent peer-checked:text-accent-500 mt-[3px]">
              <svg class="w-3 h-3 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <span class="text-sm text-gray-300 group-hover:text-white transition-colors leading-[1.35]">Don't show this warning again when restoring from the dashboard</span>
          </label>
        </div>`;
      }

      // Show a confirmation modal first
      showConfirmationModal(
        "Restore from Cloud",
        `<div class="text-gray-300">
          <p class="mb-3">This will <strong class="text-warning">OVERWRITE ALL</strong> your current local data with the data from your last cloud backup.</p>
          <p>Are you sure you want to proceed?</p>
        </div>${extraHtml}`,
        "Restore & Overwrite",
        "Cancel",
        () => {
          if (isFromDashboard && document.getElementById("dontShowRestoreWarning")?.checked) {
            localStorage.setItem("skipRestoreWarning", "true");
          }
          doRestore();
        },
        () => {
          // onCancel: Do nothing
          console.log("Cloud restore cancelled by user.");
        }
      );
    }
}



function handleBackupReminderDismiss(reminderKey) {
  try {
    localStorage.setItem(reminderKey, getCurrentDateString());
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
  const lastDismissedStr = localStorage.getItem(reminderKey);
  const lastBackupStr = localStorage.getItem("lastSuccessfulBackupDate");
  
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
    if (user && (!state || !state.settings || !state.settings.initialSetupDone)) {
      if (typeof restoreFromSupabase === "function") {
        console.log("User signed in with incomplete setup, attempting auto-restore...");
        try {
          await restoreFromSupabase(true);
        } finally {
          localStorage.removeItem("pendingCloudRestore");
        }
        
        if (state && state.settings && state.settings.initialSetupDone) {
          if (typeof closeModal === "function") closeModal("initialSetupModal");
          if (typeof renderDashboard === "function") renderDashboard();
        } else {
          // If restore failed or user had no data, and setup is still incomplete
          if (typeof openInitialSetupWizard === "function") {
            console.log("Auto-restore did not complete setup. Opening wizard.");
            openInitialSetupWizard();
          }
        }
      }
    } else {
      localStorage.removeItem("pendingCloudRestore");
      if (!state || !state.settings || !state.settings.initialSetupDone) {
        if (typeof openInitialSetupWizard === "function") {
          console.log("No user session found, opening setup wizard.");
          openInitialSetupWizard();
        }
      }
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
      if (!localStorage.getItem("preferredSyncMethod")) {
        localStorage.setItem("preferredSyncMethod", "cloud");
      }
    }
    updateSupabaseUI(user);
    
    if (!user && localStorage.getItem("preferredSyncMethod") === "cloud") {
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
      if (!localStorage.getItem("preferredSyncMethod")) {
        localStorage.setItem("preferredSyncMethod", "cloud");
      }
    }
    updateSupabaseUI(user);
    console.log(
      "Initial session check complete. User:",
      user ? user.email : "none"
    );
    
    if (!user && localStorage.getItem("preferredSyncMethod") === "cloud") {
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


    const savedMethod = localStorage.getItem("preferredSyncMethod");
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
      localStorage.setItem("preferredSyncMethod", "local");
      
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

