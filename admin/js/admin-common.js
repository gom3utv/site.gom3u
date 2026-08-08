// ===============================
// ADMIN-COMMON.JS
// Runs on every admin page (except index.html/login): guards the page
// behind admin auth, wires up the mobile sidebar toggle and logout button.
//
// WHAT TO EDIT: nothing normally.
// ===============================

import { requireAdmin, logoutAdmin } from "../../js/auth.js";

/**
 * Call this at the top of each admin page's own script.
 * onReady(user) fires once the visitor is confirmed as a signed-in admin.
 */
export function initAdminPage(onReady) {
  requireAdmin((user) => {
    wireSidebar();
    wireLogout();
    onReady(user);
  });
}

function wireSidebar() {
  const toggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("adminSidebar");
  if (!toggle || !sidebar) return;
  toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
}

function wireLogout() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    await logoutAdmin();
  });
}
