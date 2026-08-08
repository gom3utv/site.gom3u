// ===============================
// SETTINGS-LOADER.JS
// Runs on every public page (index.html, locker.html, search.html) to
// pull the admin-configured settings/site document and apply it to:
//   - the notice bar (text, enabled/disabled, animation on/off)
//   - footer + mobile menu social links (Telegram/Facebook/YouTube)
//
// Loaded as type="module" alongside each page's own module script.
// WHAT TO EDIT: nothing normally — add new settings-driven elements here
// if you add new fields to the Settings admin page.
// ===============================

import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", loadSiteSettings);

async function loadSiteSettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "site"));
    if (!snap.exists()) return; // no settings saved yet — keep static defaults from HTML
    applySettings(snap.data());
  } catch (err) {
    console.error("Failed to load site settings:", err); // non-critical — page still works with defaults
  }
}

function applySettings(s) {
  applyNotice(s);
  applySocialLinks(s);
}

function applyNotice(s) {
  const noticeBar = document.getElementById("noticeBar");
  const noticeTrack = document.getElementById("noticeTrack");
  if (!noticeBar) return;

  if (s.noticeEnabled === false) {
    noticeBar.hidden = true;
    return;
  }
  noticeBar.hidden = false;

  if (s.noticeText && noticeTrack) {
    const span = noticeTrack.querySelector("span");
    if (span) span.textContent = s.noticeText;
  }

  if (s.noticeAnimation === false) {
    noticeBar.classList.add("no-animation");
  } else {
    noticeBar.classList.remove("no-animation");
  }
}

function applySocialLinks(s) {
  const map = {
    footerTelegram: s.telegramUrl,
    footerFacebook: s.facebookUrl,
    footerYoutube: s.youtubeUrl,
    telegramLink: s.telegramUrl
  };
  Object.entries(map).forEach(([id, url]) => {
    const el = document.getElementById(id);
    if (el && url) el.href = url;
  });
}
