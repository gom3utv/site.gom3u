// ===============================
// UTILS
// Shared helper functions used across every page.
// Safe to edit if you want to change formatting/validation behavior,
// but avoid renaming functions — other files call these by name.
// ===============================

/**
 * Escapes text before inserting it into the DOM as HTML, to prevent
 * XSS from post titles/descriptions that come from Firestore.
 * Always use this (or textContent) instead of innerHTML with raw data.
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Formats a JS Date (or Firestore Timestamp .toDate()) as "07 Aug 2026".
 */
function formatDate(date) {
  if (!date) return '';
  const d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Very basic URL validator used before saving links in the admin panel
 * and before opening ad-verification links. Not a security boundary by
 * itself — Firestore rules and the locker workflow still apply.
 */
function isValidURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

/**
 * Reads a query-string parameter, e.g. getQueryParam('id') on
 * locker.html?id=abc123
 */
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Generates a short, non-identifying per-tab session id, stored in
 * sessionStorage. Used only for duplicate-event protection (view/unlock
 * counters) — not for tracking or fingerprinting. Cleared when the tab closes.
 */
function getSessionId() {
  const key = 'gom3u_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(key, id);
  }
  return id;
}

/**
 * Shows a toast notification. Container is created on first use.
 * type: 'success' | 'error' | 'warning'
 */
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Builds a single playlist card element from Firestore post data.
 * Shared by js/home.js and js/search.js so the markup only lives in one
 * place. Uses textContent throughout (never innerHTML with raw data)
 * since post content is admin-editable.
 */
function renderPlaylistCard(id, post) {
  const DEFAULT_THUMBNAIL = 'assets/default-thumbnail.png';
  const card = document.createElement('article');
  card.className = 'playlist-card';

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  const img = document.createElement('img');
  img.src = post.thumbnailUrl || DEFAULT_THUMBNAIL;
  img.alt = post.title ? `${post.title} thumbnail` : 'Playlist thumbnail';
  img.loading = 'lazy';
  img.onerror = () => { img.src = DEFAULT_THUMBNAIL; };
  thumb.appendChild(img);

  const body = document.createElement('div');
  body.className = 'card-body';

  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = post.category || 'General';

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = post.title || 'Untitled playlist';

  const desc = document.createElement('p');
  desc.className = 'card-desc';
  desc.textContent = post.description || '';

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const time = document.createElement('time');
  const createdDate = post.createdAt && post.createdAt.toDate ? post.createdAt.toDate() : null;
  if (createdDate) {
    time.dateTime = createdDate.toISOString();
    time.textContent = formatDate(createdDate);
  }

  const link = document.createElement('a');
  link.className = 'btn btn-primary btn-sm';
  link.href = `locker.html?id=${encodeURIComponent(id)}`;
  link.textContent = 'Get Link';

  meta.append(time, link);
  body.append(badge, title, desc, meta);
  card.append(thumb, body);
  return card;
}
