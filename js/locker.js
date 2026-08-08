// ===============================
// LOCKER.JS
// Loads a single post by ?id=, runs the two-step ad verification
// countdown, and reveals the destination link once both steps are done.
//
// IMPORTANT HONESTY NOTE (see §14/§53 of the project brief):
// Completing a step only means the countdown finished after the ad tab
// was opened in a new tab. Client-side JavaScript cannot verify that an
// ad actually rendered or was viewed — this is a workflow gate, not proof
// of ad views. Don't change the wording in locker.html to claim otherwise.
//
// Anti-abuse (§54): step/unlock state is kept in sessionStorage per postId
// so a page refresh doesn't restart finished steps or double-count an
// unlock/view. This is a UX safeguard, not tamper-proof — a technically
// skilled user can still bypass client-side checks. For real protection,
// move counting to a Cloud Function.
// ===============================

import { db } from "./firebase.js";
import {
  doc, getDoc, updateDoc, setDoc, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const DEFAULT_THUMBNAIL = "assets/default-thumbnail.png";
const postId = getQueryParam("id");

let post = null;
let state = { step1: false, step2: false, unlocked: false, viewCounted: false, unlockCounted: false };
let countdownInterval = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  if (!postId) {
    showError("No playlist was specified.");
    return;
  }

  state = loadState(postId);

  try {
    const snap = await getDoc(doc(db, "posts", postId));
    if (!snap.exists()) {
      showError("This playlist doesn't exist or has been removed.");
      return;
    }
    post = snap.data();

    if (post.status !== "active") {
      showError("Sorry, this playlist is currently unavailable.");
      return;
    }
    if (!post.realLink || !post.adUrl1 || !post.adUrl2) {
      showError("This playlist isn't fully configured yet. Please check back later.");
      return;
    }

    renderPost();
    countView();
    wireSteps();
    restoreStateUI();
  } catch (err) {
    console.error("Failed to load post:", err);
    showError("Sorry, something went wrong loading this playlist.");
  }
}

// ===============================
// RENDER
// ===============================
function renderPost() {
  document.getElementById("lockerSkeleton").hidden = true;
  document.getElementById("lockerContent").hidden = false;

  document.getElementById("lockerCategory").textContent = post.category || "General";
  document.getElementById("lockerTitle").textContent = post.title || "Untitled playlist";
  document.getElementById("lockerDesc").textContent = post.description || "";

  const img = document.getElementById("lockerThumbImg");
  img.src = post.thumbnailUrl || DEFAULT_THUMBNAIL;
  img.alt = `${post.title || "Playlist"} thumbnail`;
  img.onerror = () => { img.src = DEFAULT_THUMBNAIL; };

  if (post.notice) {
    const noticeEl = document.getElementById("postNotice");
    noticeEl.textContent = post.notice;
    noticeEl.hidden = false;
  }

  document.title = `${post.title || "Get Link"} — GoM3U`;
  const metaDesc = document.getElementById("metaDescription");
  if (metaDesc) {
    metaDesc.setAttribute("content", post.description || `Unlock the "${post.title || "playlist"}" link on GoM3U.`);
  }
}

function showError(message) {
  document.getElementById("lockerSkeleton").hidden = true;
  document.getElementById("lockerError").hidden = false;
  document.getElementById("lockerErrorMessage").textContent = message;
}

// ===============================
// VIEW COUNT (duplicate-protected via sessionStorage, see §17)
// ===============================
async function countView() {
  if (state.viewCounted) return;
  try {
    await updateDoc(doc(db, "posts", postId), { viewCount: increment(1) });
    await bumpGlobalStat("totalViews");
    await bumpDailyStat("views");
    state.viewCounted = true;
    saveState(postId, state);
  } catch (err) {
    console.error("Failed to record view:", err); // non-critical, fail silently for the user
  }
}

// ===============================
// VERIFICATION STEPS
// ===============================
function wireSteps() {
  document.getElementById("step1Btn").addEventListener("click", () => startStep(1));
  document.getElementById("step2Btn").addEventListener("click", () => startStep(2));
  document.getElementById("unlockBtn").addEventListener("click", handleUnlock);
  document.getElementById("copyLinkBtn").addEventListener("click", copyLink);
}

function restoreStateUI() {
  if (state.step1) setStepDone(1);
  if (state.step2) setStepDone(2);
  if (state.step1 && state.step2) enableUnlock();
  if (state.unlocked) revealLink();
}

function startStep(stepNumber) {
  const adUrl = stepNumber === 1 ? post.adUrl1 : post.adUrl2;
  const duration = Number(post.verifyTime) || 20;
  const btn = document.getElementById(`step${stepNumber}Btn`);
  const stepEl = document.getElementById(`step${stepNumber}`);

  window.open(adUrl, "_blank", "noopener");

  stepEl.dataset.state = "active";
  btn.disabled = true;
  let remaining = duration;
  updateTimerLabel(btn, remaining);

  countdownInterval = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      completeStep(stepNumber);
      return;
    }
    updateTimerLabel(btn, remaining);
  }, 1000);
}

function updateTimerLabel(btn, seconds) {
  btn.textContent = `Verifying… ${seconds}s`;
}

function completeStep(stepNumber) {
  setStepDone(stepNumber);
  state[`step${stepNumber}`] = true;
  saveState(postId, state);

  if (stepNumber === 1) {
    const step2Btn = document.getElementById("step2Btn");
    step2Btn.disabled = false;
    document.getElementById("step2").dataset.state = "pending";
  }
  if (state.step1 && state.step2) enableUnlock();
}

function setStepDone(stepNumber) {
  const stepEl = document.getElementById(`step${stepNumber}`);
  const btn = document.getElementById(`step${stepNumber}Btn`);
  stepEl.dataset.state = "done";
  btn.textContent = "Completed";
  btn.disabled = true;
}

function enableUnlock() {
  document.getElementById("unlockBtn").disabled = false;
}

// ===============================
// UNLOCK
// ===============================
async function handleUnlock() {
  const btn = document.getElementById("unlockBtn");
  btn.disabled = true;
  btn.textContent = "Unlocking…";

  try {
    if (!state.unlockCounted) {
      await updateDoc(doc(db, "posts", postId), { unlockCount: increment(1) });
      await bumpGlobalStat("totalUnlocks");
      await bumpDailyStat("unlocks");
      state.unlockCounted = true;
    }
    state.unlocked = true;
    saveState(postId, state);
    revealLink();
  } catch (err) {
    console.error("Failed to unlock:", err);
    showToast("Something went wrong — please try again.", "error");
    btn.disabled = false;
    btn.textContent = "Unlock Link";
  }
}

function revealLink() {
  const box = document.getElementById("unlockedBox");
  const input = document.getElementById("unlockedLinkInput");
  const openBtn = document.getElementById("openLinkBtn");
  const unlockBtn = document.getElementById("unlockBtn");

  input.value = post.realLink;
  openBtn.href = post.realLink;
  box.hidden = false;
  unlockBtn.hidden = true;
}

function copyLink() {
  const input = document.getElementById("unlockedLinkInput");
  navigator.clipboard.writeText(input.value)
    .then(() => showToast("Link copied!", "success"))
    .catch(() => {
      input.select();
      showToast("Press Ctrl+C / Cmd+C to copy.", "warning");
    });
}

// ===============================
// STATS HELPERS
// Not fully tamper-proof — a determined user can call these Firestore
// writes directly from the console. For trusted counting, move this
// logic to a Cloud Function that verifies the request server-side.
// ===============================
async function bumpGlobalStat(field) {
  await setDoc(doc(db, "stats", "global"), { [field]: increment(1), updatedAt: serverTimestamp() }, { merge: true });
}

async function bumpDailyStat(field) {
  const todayKey = new Date().toISOString().slice(0, 10);
  await setDoc(doc(db, "stats_daily", todayKey), { [field]: increment(1), date: todayKey }, { merge: true });
}

// ===============================
// SESSION STATE (anti-abuse, §54)
// ===============================
function loadState(id) {
  try {
    const raw = sessionStorage.getItem(`gom3u_locker_${id}`);
    return raw ? JSON.parse(raw) : { step1: false, step2: false, unlocked: false, viewCounted: false, unlockCounted: false };
  } catch (e) {
    return { step1: false, step2: false, unlocked: false, viewCounted: false, unlockCounted: false };
  }
}

function saveState(id, value) {
  try {
    sessionStorage.setItem(`gom3u_locker_${id}`, JSON.stringify(value));
  } catch (e) {
    // sessionStorage unavailable (private browsing etc.) — degrade silently,
    // duplicate protection just won't persist across a refresh.
  }
}
