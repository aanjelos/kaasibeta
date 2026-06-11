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
        try {
          let importedData = JSON.parse(e.target.result);
          if (importedData && typeof importedData === "object") {
            // Sanitization logic from your previous full script.js
            if (Array.isArray(importedData.transactions)) {
              importedData.transactions.forEach((t) => {
                if (typeof t.amount === "number")
                  t.amount = roundToTwoDecimals(t.amount);
              });
            }
            if (Array.isArray(importedData.accounts)) {
              importedData.accounts.forEach((acc) => {
                if (typeof acc.balance === "number")
                  acc.balance = roundToTwoDecimals(acc.balance);
              });
            }
            if (Array.isArray(importedData.debts)) {
              importedData.debts.forEach((d) => {
                if (typeof d.amount === "number")
                  d.amount = roundToTwoDecimals(d.amount);
                if (typeof d.originalAmount === "number")
                  d.originalAmount = roundToTwoDecimals(d.originalAmount);
                if (typeof d.remainingAmount === "number")
                  d.remainingAmount = roundToTwoDecimals(d.remainingAmount);
              });
            }
            if (Array.isArray(importedData.receivables)) {
              importedData.receivables.forEach((r) => {
                if (typeof r.amount === "number")
                  r.amount = roundToTwoDecimals(r.amount);
                if (typeof r.originalAmount === "number")
                  r.originalAmount = roundToTwoDecimals(r.originalAmount);
                if (typeof r.remainingAmount === "number")
                  r.remainingAmount = roundToTwoDecimals(r.remainingAmount);
              });
            }
            if (Array.isArray(importedData.installments)) {
              importedData.installments.forEach((i) => {
                if (typeof i.monthlyAmount === "number")
                  i.monthlyAmount = roundToTwoDecimals(i.monthlyAmount);
                if (typeof i.originalFullAmount === "number")
                  i.originalFullAmount = roundToTwoDecimals(
                    i.originalFullAmount
                  );
              });
            }
            if (
              importedData.creditCard &&
              typeof importedData.creditCard === "object"
            ) {
              if (typeof importedData.creditCard.limit === "number") {
                importedData.creditCard.limit = roundToTwoDecimals(
                  importedData.creditCard.limit
                );
              }
              if (Array.isArray(importedData.creditCard.transactions)) {
                importedData.creditCard.transactions.forEach((ccTrans) => {
                  if (typeof ccTrans.amount === "number")
                    ccTrans.amount = roundToTwoDecimals(ccTrans.amount);
                  if (typeof ccTrans.paidAmount === "number")
                    ccTrans.paidAmount = roundToTwoDecimals(ccTrans.paidAmount);
                  if (
                    ccTrans.paidAmount >=
                    roundToTwoDecimals(ccTrans.amount - 0.005)
                  ) {
                    ccTrans.paidOff = true;
                    ccTrans.paidAmount = ccTrans.amount;
                  } else {
                    ccTrans.paidOff = false;
                  }
                });
              }
            }

            state = deepMerge(getDefaultState(), importedData);
            ensureDefaultAccounts();
            ensureDefaultCategories();

            state.accounts.forEach((acc) => {
              if (isNaN(acc.balance) || typeof acc.balance !== "number")
                acc.balance = 0;
              else acc.balance = roundToTwoDecimals(acc.balance);
            });

            if (!state.creditCard)
              state.creditCard = { limit: 0, transactions: [] };
            if (
              isNaN(state.creditCard.limit) ||
              typeof state.creditCard.limit !== "number"
            )
              state.creditCard.limit = 0;
            else
              state.creditCard.limit = roundToTwoDecimals(
                state.creditCard.limit
              );

            if (!Array.isArray(state.creditCard.transactions))
              state.creditCard.transactions = [];
            state.creditCard.transactions.forEach((t) => {
              if (typeof t.amount !== "number" || isNaN(t.amount)) t.amount = 0;
              else t.amount = roundToTwoDecimals(t.amount);
              if (typeof t.paidAmount !== "number" || isNaN(t.paidAmount))
                t.paidAmount = 0;
              else t.paidAmount = roundToTwoDecimals(t.paidAmount);
              if (t.paidAmount >= roundToTwoDecimals(t.amount - 0.005)) {
                t.paidOff = true;
                t.paidAmount = t.amount;
              } else {
                t.paidOff = false;
              }
              if (!t.timestamp) t.timestamp = new Date(t.date).getTime();
            });
            state.transactions.forEach((t) => {
              if (!t.timestamp) t.timestamp = new Date(t.date).getTime();
            });
            state.debts.forEach((d) => {
              if (!d.timestamp) d.timestamp = new Date(d.dueDate).getTime();
            });
            state.receivables.forEach((r) => {
              if (!r.timestamp) r.timestamp = new Date(r.dateGiven).getTime();
            });
            state.installments.forEach((i) => {
              if (!i.timestamp) i.timestamp = new Date(i.startDate).getTime();
            });

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
      
      // --- NEW: Smart Contextual Sync Status ---
      const lastSyncedCloudUpdatedAt = localStorage.getItem("lastSyncedCloudUpdatedAt");
      const lastLocalCloudSync = parseInt(localStorage.getItem("lastLocalCloudSync") || "0", 10);
      const lastLocalDataModification = parseInt(localStorage.getItem("lastLocalDataModification") || "0", 10);
      
      window.currentCloudSyncStatus = "synced";
      
      if (data.updated_at !== lastSyncedCloudUpdatedAt && lastSyncedCloudUpdatedAt) {
        window.currentCloudSyncStatus = "cloud_newer";
      } else if (lastLocalDataModification > lastLocalCloudSync + 2000) {
        window.currentCloudSyncStatus = "local_newer";
      }
      // --- END NEW ---
      
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
      console.log("Google Sign-In initiated:", data);
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
      
    // --- NEW: Sync Timestamps ---
    if (data.updated_at) localStorage.setItem("lastSyncedCloudUpdatedAt", data.updated_at);
    const now = Date.now().toString();
    localStorage.setItem("lastLocalCloudSync", now);
    localStorage.setItem("lastLocalDataModification", now);
    // --- END NEW ---
    
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

        // --- NEW: Sync Timestamps ---
        if (data.updated_at) localStorage.setItem("lastSyncedCloudUpdatedAt", data.updated_at);
        const now = Date.now().toString();
        localStorage.setItem("lastLocalCloudSync", now);
        localStorage.setItem("lastLocalDataModification", now);
        // --- END NEW ---

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
          <label class="flex items-start gap-3 cursor-pointer group text-left" style="max-width: 260px; margin: 0 auto;">
            <input type="checkbox" id="dontShowRestoreWarning" class="peer sr-only">
            <div class="shrink-0 w-4 h-4 rounded border border-gray-500 peer-checked:border-accent-500 flex items-center justify-center transition-colors text-transparent peer-checked:text-accent-500" style="margin-top: 3px;">
              <svg class="w-3 h-3 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <span class="text-sm text-gray-300 group-hover:text-white transition-colors" style="line-height: 1.35;">Don't show this warning again when restoring from the dashboard</span>
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

function showBackupReminderPopup(reminderKey) {
  const title = "Backup Reminder";
  const message =
    "It's a good day to back up your data. Regular backups protect you from data loss!";

  // Use the robust confirmation modal for this
  showConfirmationModal(
    title,
    message,
    "Backup Now", // confirmText
    "Dismiss", // cancelText
    () => {
      // onConfirm: This runs when "Backup Now" is clicked
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
    console.log(
      "Skipping backup reminder: Initial setup not done or no transactions."
    );
    return;
  }

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 3 = Wednesday
  const currentDateStr = getCurrentDateString();

  let reminderKey = null;

  if (dayOfWeek === 0) {
    // Sunday
    reminderKey = "lastReminderShownForSunday";
  } else if (dayOfWeek === 3) {
    // Wednesday
    reminderKey = "lastReminderShownForWednesday";
  }

  if (reminderKey) {
    try {
      const lastShownDate = localStorage.getItem(reminderKey);
      if (lastShownDate !== currentDateStr) {
        // Use a timeout to show the reminder after the app has loaded
        setTimeout(() => {
          console.log(
            `Time to show backup reminder for: ${reminderKey}. Last shown: ${lastShownDate}, Current: ${currentDateStr}`
          );
          showBackupReminderPopup(reminderKey);
        }, 500); // 5-second delay
      } else {
        console.log(
          `Backup reminder already shown for ${reminderKey} on ${currentDateStr}`
        );
      }
    } catch (e) {
      console.error(
        "Error checking backup reminder state from localStorage:",
        e
      );
    }
  }
}



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
    console.log("Supabase auth state changed:", event, session);
    const user = session?.user || null;
    supabaseUser = user;
    updateSupabaseUI(user);
    await checkAutoRestore(user);
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
    await checkAutoRestore(user);
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

    // --- NEW: Default to Cloud Backup on login ---
    shortcutCloudInput.checked = true;
    shortcutLocalInput.checked = false;
    // --- END NEW ---
    
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

