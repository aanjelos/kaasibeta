function showPinLockScreen() {
  const pinLockOverlay = document.getElementById("pinLockOverlay");
  if (!pinLockOverlay) return;
  expectedPin = atob(state.settings.appPin.pin);
  currentPinInput = "";
  failedSecurityAttempts = 0;
  updatePinDots();
  pinLockOverlay.classList.remove("hidden");
  // Small delay to allow display block to apply before opacity transition
  setTimeout(() => {
    pinLockOverlay.style.opacity = "1";
  }, 10);
  
  // Add keyboard listener for desktop users
  lockScreenKeydownListener = (e) => {
    const modal = document.getElementById("securityQuestionModal");
    // Only listen if overlay is visible and modal is NOT open
    if (!pinLockOverlay.classList.contains("hidden") && modal.style.display !== "flex") {
      if (e.key >= "0" && e.key <= "9") {
        addPinDigit(parseInt(e.key));
      } else if (e.key === "Backspace") {
        removePinDigit();
      }
    }
  };
  document.addEventListener("keydown", lockScreenKeydownListener);
}

function onAppUnlocked() {
  const pinLockOverlay = document.getElementById("pinLockOverlay");
  if (pinLockOverlay) {
    pinLockOverlay.style.opacity = "0";
    setTimeout(() => {
      pinLockOverlay.classList.add("hidden");
    }, 500); // Wait for fade out
  }
  
  if (lockScreenKeydownListener) {
    document.removeEventListener("keydown", lockScreenKeydownListener);
    lockScreenKeydownListener = null;
  }
  
  // Trigger backup reminder only AFTER app is unlocked
  checkAndTriggerBackupReminder();
}

function addPinDigit(digit) {
  if (currentPinInput.length < 4) {
    currentPinInput += digit.toString();
    updatePinDots();
    
    if (currentPinInput.length === 4) {
      setTimeout(verifyPin, 150); // slight delay to show the 4th dot
    }
  }
}

function removePinDigit() {
  if (currentPinInput.length > 0) {
    currentPinInput = currentPinInput.slice(0, -1);
    updatePinDots();
  }
}

function updatePinDots() {
  const dots = document.querySelectorAll("#pinLockDots > div");
  dots.forEach((dot, index) => {
    if (index < currentPinInput.length) {
      dot.classList.add("pin-dot-filled");
    } else {
      dot.classList.remove("pin-dot-filled");
    }
  });
}

function verifyPin() {
  if (currentPinInput === expectedPin) {
    onAppUnlocked();
  } else {
    // Error animation
    const dotsContainer = document.getElementById("pinLockDots");
    dotsContainer.classList.add("pin-error");
    setTimeout(() => {
      dotsContainer.classList.remove("pin-error");
      currentPinInput = "";
      updatePinDots();
    }, 400);
  }
}

function showForgotPinModal() {
  const modal = document.getElementById("securityQuestionModal");
  if (!modal) return;
  
  const displayEl = document.getElementById("securityQuestionDisplay");
  const emergencyGroup = document.getElementById("emergencyResetGroup");
  const form = document.getElementById("securityQuestionForm");
  
  emergencyGroup.classList.add("hidden"); // Hide initially
  
  document.getElementById("securityModalTitle").innerText = "Security Recovery";
  document.getElementById("securityModalDesc").innerText = "Answer your security question to unlock the app.";
  
  displayEl.innerText = state.settings.appPin.question;
  document.getElementById("securityAnswerInput").value = "";
  
  form.onsubmit = (e) => {
    e.preventDefault();
    const answer = document.getElementById("securityAnswerInput").value.trim().toLowerCase();
    const expectedAnswer = atob(state.settings.appPin.answer).toLowerCase();
    
    if (answer === expectedAnswer) {
      // Correct! Unlock app and remove PIN
      state.settings.appPin = { enabled: false };
      saveData();
      closeModal("securityQuestionModal");
      onAppUnlocked();
      showNotification("App unlocked. PIN has been disabled.", "success");
      
      // Update settings UI if it's already rendered
      const toggle = document.getElementById("toggleAppPin");
      if (toggle) toggle.checked = false;
      const opts = document.getElementById("securityManagementOptions");
      if (opts) opts.classList.add("hidden");
    } else {
      failedSecurityAttempts++;
      showNotification("Incorrect answer.", "error");
      if (failedSecurityAttempts >= 2) {
        emergencyGroup.classList.remove("hidden");
      }
    }
  };
  
  modal.style.display = "block";
}

function emergencyExportAndWipe() {
  if (confirm("WARNING: This will download a backup of your data and then completely wipe Kaasi from your device. Are you absolutely sure?")) {
    exportData(); // Downloads JSON
    setTimeout(() => {
      localStorage.removeItem("kaasi_state");
      localStorage.removeItem("kaasi_cloud_sync");
      window.location.reload();
    }, 1500);
  }
}

// --- END PIN LOCK LOGIC ---

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

/* --------------------------------------------------- */
/* --- INLINE AMOUNT CALCULATION & MATH TOOLBAR --- */
/* --------------------------------------------------- */

// Create the global math toolbar
const mathToolbar = document.createElement("div");
mathToolbar.className = "math-toolbar";
mathToolbar.innerHTML = `
  <div class="math-btn" data-op="+">+</div>
  <div class="math-btn" data-op="-">-</div>
  <div class="math-btn" data-op="*">×</div>
  <div class="math-btn" data-op="/">÷</div>
  <div class="math-btn math-btn-equal" data-op="=">=</div>
`;
document.body.appendChild(mathToolbar);

let activeCalcInput = null;
let toolbarHideTimeout = null;

