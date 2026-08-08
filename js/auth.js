// ===============================
// AUTH.JS
// Shared Firebase Authentication helpers for the Admin Panel.
//
// WHAT TO EDIT: nothing normally. This file is imported by every admin/*.html
// page (except admin/index.html uses it slightly differently — see below).
// WHAT NOT TO EDIT: don't remove the admins/{uid} check — Firebase Auth only
// proves WHO signed in, not that they're allowed into the admin panel. The
// admins collection + matching Firestore rules (Phase 6) is what enforces that.
// ===============================

import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/**
 * Signs an admin in with email + password.
 * Returns { ok: true } or { ok: false, message } — never throws raw
 * Firebase error objects to the UI (see §37 error handling).
 */
export async function loginAdmin(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const isAdmin = await isUserAdmin(cred.user.uid);
    if (!isAdmin) {
      await signOut(auth);
      return { ok: false, message: "This account doesn't have admin access." };
    }
    return { ok: true };
  } catch (err) {
    console.error("Login error:", err);
    return { ok: false, message: "Incorrect email or password." };
  }
}

/**
 * Checks whether a signed-in user's uid has a matching admins/{uid} document.
 * This is a UX convenience only — the real enforcement is in Firestore rules.
 */
export async function isUserAdmin(uid) {
  try {
    const snap = await getDoc(doc(db, "admins", uid));
    return snap.exists();
  } catch (err) {
    console.error("Admin check failed:", err);
    return false;
  }
}

/**
 * Guards an admin page: redirects to admin/index.html if the visitor isn't
 * a signed-in admin. Call this at the top of every admin page except
 * admin/index.html itself. Returns the admin's uid once confirmed.
 */
export function requireAdmin(onReady) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    const isAdmin = await isUserAdmin(user.uid);
    if (!isAdmin) {
      await signOut(auth);
      window.location.href = "index.html";
      return;
    }
    onReady(user);
  });
}

/**
 * Signs the admin out and redirects to the login page (see §56).
 */
export async function logoutAdmin() {
  await signOut(auth);
  window.location.href = "index.html";
}
