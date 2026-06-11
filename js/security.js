// --- PIN LOCK & SECURITY LOGIC ---

let currentPinInput = "";
let expectedPin = "";
let failedSecurityAttempts = 0;
let lockScreenKeydownListener = null;

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
      if (typeof renderDashboard === "function") {
        renderDashboard();
      }
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
    if (typeof trackEvent === "function") trackEvent("pin_login_success", "Security");
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

