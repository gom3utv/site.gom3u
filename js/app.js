// ===============================
// APP.JS
// Global behavior that runs on every page: mobile menu, search toggle,
// notice bar. Firebase init and adblock detection are added in later phases.
// ===============================

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initSearchToggle();
  initNoticeBar();
  initAdblockDetection();
  initOfflineBanner();
  registerServiceWorker();
});

// ===============================
// MOBILE MENU
// ===============================
function initMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (!menuToggle || !mobileMenu) return;

  menuToggle.addEventListener('click', () => {
    const isOpen = !mobileMenu.hidden;
    mobileMenu.hidden = isOpen;
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (mobileMenu.hidden) return;
    if (!mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
      mobileMenu.hidden = true;
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !mobileMenu.hidden) {
      mobileMenu.hidden = true;
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.focus();
    }
  });
}

// ===============================
// SEARCH TOGGLE (expandable bar under header)
// ===============================
function initSearchToggle() {
  const searchToggle = document.getElementById('searchToggle');
  const searchBar = document.getElementById('searchBar');
  if (!searchToggle || !searchBar) return;

  searchToggle.addEventListener('click', () => {
    const isOpen = !searchBar.hidden;
    searchBar.hidden = isOpen;
    searchToggle.setAttribute('aria-expanded', String(!isOpen));
    if (!isOpen) {
      const input = searchBar.querySelector('input');
      if (input) input.focus();
    }
  });
}

// ===============================
// NOTICE BAR
// Phase 1: reads static markup already in the page.
// Phase 3 (Admin Settings) will replace this with a Firestore-driven
// version that sets text / visibility / animation from settings/site.
// ===============================
function initNoticeBar() {
  const noticeBar = document.getElementById('noticeBar');
  if (!noticeBar) return;
  // Text/visibility/animation are applied by js/settings-loader.js once
  // settings/site loads from Firestore. This function just ensures the
  // static HTML placeholder is visible by default before that happens.
}

// ===============================
// ADBLOCK DETECTION
// IMPORTANT: this is a best-effort heuristic, not a guarantee. It baits
// a hidden element with class names common ad-blocker filter lists
// target, then checks whether the element got hidden/removed. Some
// blockers (and all DNS-level blockers like Pi-hole/AdGuard DNS/NextDNS)
// won't be caught by this method — the modal copy says so explicitly.
// Never claim 100% detection accuracy (see §27).
// ===============================
function initAdblockDetection() {
  Promise.all([checkBaitElement(), checkAdNetworkRequest()]).then(([baitBlocked, networkBlocked]) => {
    if (baitBlocked || networkBlocked) showAdblockModal();
  });
}

/**
 * Method 1: a hidden div with classic ad-related class names. Only
 * catches blockers whose filter lists include cosmetic (CSS-hiding)
 * rules for these exact class names — many modern blockers (Brave
 * Shields, DNS-level blockers) don't work this way, so this alone is
 * NOT enough. Kept as one signal among two.
 */
function checkBaitElement() {
  return new Promise((resolve) => {
    const bait = document.createElement('div');
    bait.className = 'ad ads adsbox adsbygoogle ad-banner adunit advertisement';
    bait.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;';
    document.body.appendChild(bait);

    window.setTimeout(() => {
      const blocked = bait.offsetParent === null
        || bait.offsetHeight === 0
        || getComputedStyle(bait).display === 'none'
        || getComputedStyle(bait).visibility === 'hidden';
      bait.remove();
      resolve(blocked);
    }, 200);
  });
}

/**
 * Method 2: try to reach a well-known ad-serving domain. Extension-based
 * blockers (uBlock Origin, AdGuard, Brave Shields) block the request at
 * the network layer; DNS-level blockers (Pi-hole, AdGuard DNS, NextDNS)
 * block it by failing DNS resolution for that domain — both surface as
 * a rejected fetch(), so this single check catches both categories.
 * mode:'no-cors' means we can't read the response, only whether the
 * request succeeded or was blocked/failed outright.
 */
function checkAdNetworkRequest() {
  return new Promise((resolve) => {
    // If the device itself has no internet connection, a failed request
    // here means "offline", not "ad blocker" — skip this check rather
    // than showing a misleading modal.
    if (!navigator.onLine) {
      resolve(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1500);

    fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
      mode: 'no-cors',
      signal: controller.signal
    })
      .then(() => { window.clearTimeout(timeout); resolve(false); })
      .catch(() => { window.clearTimeout(timeout); resolve(true); });
  });
}

function showAdblockModal() {
  let modal = document.getElementById('adblockNotice');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'adblockNotice';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'adblockNoticeTitle');
    modal.innerHTML = `
      <div class="modal-box">
        <h3 id="adblockNoticeTitle">Ad blocker detected</h3>
        <p>Please disable your ad blocker to continue. DNS-level blockers such as Pi-hole, AdGuard DNS, or NextDNS can also prevent verification from loading.</p>
        <div class="modal-actions">
          <button class="btn btn-primary" id="adblockRecheckBtn">I've Disabled It — Reload</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.hidden = false;

  const recheckBtn = document.getElementById('adblockRecheckBtn');
  if (recheckBtn) {
    recheckBtn.focus();
    recheckBtn.addEventListener('click', () => window.location.reload());
  }
}

// ===============================
// OFFLINE BANNER
// Friendly network-status feedback (see §37) — doesn't block the page,
// just lets the person know why things might not be loading.
// ===============================
function initOfflineBanner() {
  window.addEventListener('offline', () => {
    if (typeof showToast === 'function') {
      showToast("You're offline — some features may not work.", 'warning');
    }
  });
  window.addEventListener('online', () => {
    if (typeof showToast === 'function') {
      showToast('Back online.', 'success');
    }
  });
}

// ===============================
// SERVICE WORKER REGISTRATION
// Safe to skip in dev — if it fails (e.g. served over plain HTTP), the
// site works exactly the same, just without offline shell caching.
// ===============================
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.warn('Service worker registration failed:', err);
  });
}
