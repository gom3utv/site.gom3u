// ===============================
// SETTINGS.JS
// Reads and writes the single settings/site Firestore document.
// This document is public-read (for the homepage notice bar, footer
// links, hero copy) but admin-write-only — see firestore.rules.
// ===============================

import { initAdminPage } from "./admin-common.js";
import { db } from "../../js/firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const SETTINGS_REF = () => doc(db, "settings", "site");

initAdminPage(() => {
  loadSettings();
  wireForm();
});

async function loadSettings() {
  try {
    const snap = await getDoc(SETTINGS_REF());
    if (!snap.exists()) return; // defaults stay as typed in the HTML
    const s = snap.data();

    setValue("noticeText", s.noticeText);
    setChecked("noticeEnabled", s.noticeEnabled);
    setChecked("noticeAnimation", s.noticeAnimation);
    setValue("siteName", s.siteName);
    setValue("primaryColor", s.primaryColor || "#6C63FF");
    setValue("heroTitle", s.heroTitle);
    setValue("heroSubtitle", s.heroSubtitle);
    setValue("telegramUrl", s.telegramUrl);
    setValue("facebookUrl", s.facebookUrl);
    setValue("youtubeUrl", s.youtubeUrl);
    setValue("footerText", s.footerText);
  } catch (err) {
    console.error("Failed to load settings:", err);
    showToast("Couldn't load current settings.", "error");
  }
}

function wireForm() {
  const form = document.getElementById("settingsForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("saveSettingsBtn");
    btn.disabled = true;
    btn.textContent = "Saving…";

    const data = {
      noticeText: document.getElementById("noticeText").value.trim(),
      noticeEnabled: document.getElementById("noticeEnabled").checked,
      noticeAnimation: document.getElementById("noticeAnimation").checked,
      siteName: document.getElementById("siteName").value.trim(),
      primaryColor: document.getElementById("primaryColor").value,
      heroTitle: document.getElementById("heroTitle").value.trim(),
      heroSubtitle: document.getElementById("heroSubtitle").value.trim(),
      telegramUrl: document.getElementById("telegramUrl").value.trim(),
      facebookUrl: document.getElementById("facebookUrl").value.trim(),
      youtubeUrl: document.getElementById("youtubeUrl").value.trim(),
      footerText: document.getElementById("footerText").value.trim(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(SETTINGS_REF(), data, { merge: true });
      showToast("Settings saved.", "success");
    } catch (err) {
      console.error("Failed to save settings:", err);
      showToast("Permission denied or network error.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Save Settings";
    }
  });
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined) el.value = value;
}
function setChecked(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined) el.checked = !!value;
}
