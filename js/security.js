/**
 * security.js
 * Implements PIN lock authentication and security-related logic.
 */
// --- PIN LOCK & SECURITY LOGIC ---

let currentPinInput = "";
let expectedPin = "";
let failedSecurityAttempts = 0;
let lockScreenKeydownListener = null;

// PIN brute-force protection
let pinFailedAttempts = 0;
let pinLockoutUntil = 0;

// Recovery code brute-force protection
let recoveryCodeFailedAttempts = 0;
let recoveryCodeLockoutUntil = 0;

function showPinLockScreen() {
  const pinLockOverlay = document.getElementById("pinLockOverlay");
  if (!pinLockOverlay) return;
  expectedPin = state.settings.appPin.pin;
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
    if (!pinLockOverlay.classList.contains("hidden") && modal.style.display !== "block") {
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
  const appContainer = document.getElementById("appContainer");
  if (appContainer) appContainer.classList.remove("hidden");

  let isFirstUnlock = false;
  if (!window.uiInitialized) {
    isFirstUnlock = true;
    if (typeof initializeUI === "function") initializeUI();
    if (typeof initializeGlobalTooltips === "function") initializeGlobalTooltips();
    
    const preloaderElement = document.getElementById("preloader");
    if (preloaderElement) {
      preloaderElement.style.display = "block";
      // Force reflow
      void preloaderElement.offsetWidth;
      preloaderElement.classList.remove("hidden");
      if (typeof executePreloaderSequence === "function") executePreloaderSequence();
    }
  }

  const pinLockOverlay = document.getElementById("pinLockOverlay");
  if (pinLockOverlay) {
    if (isFirstUnlock) {
      // Hide instantly so the preloader is visible without a crossfade
      pinLockOverlay.classList.add("hidden");
      pinLockOverlay.style.opacity = "0";
      if (typeof renderDashboard === "function") renderDashboard();
    } else {
      pinLockOverlay.style.opacity = "0";
      setTimeout(() => {
        pinLockOverlay.classList.add("hidden");
        if (typeof renderDashboard === "function") {
          renderDashboard();
        }
      }, 500); // Wait for fade out
    }
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

async function verifyPin() {
  // Rate limiting: prevent brute-force
  if (Date.now() < pinLockoutUntil) {
    const secsLeft = Math.ceil((pinLockoutUntil - Date.now()) / 1000);
    showNotification(`Too many failed attempts. Try again in ${secsLeft}s.`, "error");
    currentPinInput = "";
    updatePinDots();
    return;
  }

  const currentHash = await hashString(currentPinInput);
  if (currentHash === expectedPin) {
    pinFailedAttempts = 0;
    pinLockoutUntil = 0;
    onAppUnlocked();
    if (typeof trackEvent === "function") trackEvent("pin_login_success", "Security");
  } else {
    pinFailedAttempts++;
    if (pinFailedAttempts >= 5) {
      pinLockoutUntil = Date.now() + 30_000; // 30-second lockout
      pinFailedAttempts = 0;
      showNotification("Too many failed attempts. Locked for 30 seconds.", "error");
    }
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
  const recoveryInput = document.getElementById("recoveryCodeInput");
  if(recoveryInput) recoveryInput.value = "";
  
  form.onsubmit = async (e) => {
    e.preventDefault();
    const answer = document.getElementById("securityAnswerInput").value.trim().toLowerCase();
    const expectedAnswerHash = state.settings.appPin.answer;
    
    const answerHash = await hashString(answer);
    
    if (answerHash === expectedAnswerHash) {
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
      showNotification("Incorrect answer. Please try again.", "error");
      if (failedSecurityAttempts >= 2) {
        emergencyGroup.classList.remove("hidden");
      }
    }
  };
  
  modal.style.display = "block";
}

async function verifyRecoveryCode() {
  // Rate limiting: prevent brute-force
  if (Date.now() < recoveryCodeLockoutUntil) {
    const secsLeft = Math.ceil((recoveryCodeLockoutUntil - Date.now()) / 1000);
    showNotification(`Too many failed attempts. Try again in ${secsLeft}s.`, "error");
    return;
  }

  const inputEl = document.getElementById("recoveryCodeInput");
  const code = inputEl.value.trim().toUpperCase();
  if (!code) return;

  const validHashes = [
    "57842d0fff3625ff3e2a510614641df14f026156f7c7f04db37e7d9c8b68d004",
    "761dccd93d60c365b4906d988aa1dd2e8cc864d2abe9a20b95507b5f0db15e42",
    "25e3412c394a4fc1c9f8b19ef6343427e6cf9d609a72b2f1acf311b689346751",
    "866b9fb5878ea8f4defa43a7f596eec93a9fa44ac3c50f4ccb2c9f6aec4cd76d",
    "c5f4694aa0f062008b3f4dd6f8815f7599323e8914bc30d870c047ea1199994f"
  ];

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (validHashes.includes(hashHex)) {
      // Valid recovery code — reset counters
      recoveryCodeFailedAttempts = 0;
      recoveryCodeLockoutUntil = 0;
      state.settings.appPin = { enabled: false };
      saveData();
      closeModal("securityQuestionModal");
      inputEl.value = "";
      onAppUnlocked();
      showNotification("App unlocked. PIN has been permanently disabled.", "success", 5000);
      
      const toggle = document.getElementById("toggleAppPin");
      if (toggle) toggle.checked = false;
      const opts = document.getElementById("securityManagementOptions");
      if (opts) opts.classList.add("hidden");
    } else {
      recoveryCodeFailedAttempts++;
      if (recoveryCodeFailedAttempts >= 5) {
        recoveryCodeLockoutUntil = Date.now() + 60_000; // 60-second lockout
        recoveryCodeFailedAttempts = 0;
        showNotification("Too many failed attempts. Locked for 60 seconds.", "error");
      } else {
        showNotification("Invalid recovery code.", "error");
      }
      inputEl.value = "";
    }
  } catch (err) {
    console.error("Crypto API failed:", err);
    showNotification("An error occurred verifying the code.", "error");
  }
}

// --- END PIN LOCK LOGIC ---

