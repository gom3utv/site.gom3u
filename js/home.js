// ===============================
// HOME.JS
// Loads active posts from Firestore and renders them into #playlistGrid.
// Runs as an ES module (see index.html: <script type="module" src="js/home.js">)
// so it can import from js/firebase.js.
//
// WHAT TO EDIT:
//   POSTS_PER_PAGE below if you want more/fewer cards per load.
// WHAT NOT TO EDIT:
//   The Firestore query logic, unless you also update firestore.rules
//   to match (Phase 3) — the two must stay in sync.
// ===============================

import { db } from "./firebase.js";
import {
  collection, query, where, orderBy, limit, startAfter, getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const POSTS_PER_PAGE = 8;

let lastVisibleDoc = null;
let isLoading = false;
let reachedEnd = false;

const grid = document.getElementById("playlistGrid");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const paginationControls = document.getElementById("paginationControls");
const emptyState = document.getElementById("emptyState");

document.addEventListener("DOMContentLoaded", () => {
  if (!grid) return; // not on the homepage
  grid.innerHTML = ""; // clear the Phase 1 static sample card
  loadPosts({ isFirstLoad: true });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => loadPosts({ isFirstLoad: false }));
  }
});

/**
 * Fetches the next page of active posts and appends them to the grid.
 */
async function loadPosts({ isFirstLoad }) {
  if (isLoading || reachedEnd) return;
  isLoading = true;
  if (loadMoreBtn) loadMoreBtn.disabled = true;

  if (isFirstLoad) renderSkeletons(POSTS_PER_PAGE);

  try {
    const postsRef = collection(db, "posts");
    // NOTE: only ONE orderBy field is used here on purpose. Combining a
    // where() filter with two orderBy() fields requires a manually-created
    // Firestore "composite index" — without it, this query fails silently
    // and no posts show up. Sorting by sortOrder alone avoids that trap.
    let q = query(
      postsRef,
      where("status", "==", "active"),
      orderBy("sortOrder", "asc"),
      limit(POSTS_PER_PAGE)
    );

    if (lastVisibleDoc) {
      q = query(
        postsRef,
        where("status", "==", "active"),
        orderBy("sortOrder", "asc"),
        startAfter(lastVisibleDoc),
        limit(POSTS_PER_PAGE)
      );
    }

    const snapshot = await getDocs(q);
    if (isFirstLoad) clearSkeletons();

    if (snapshot.empty) {
      if (isFirstLoad) toggleEmptyState(true);
      reachedEnd = true;
      if (paginationControls) paginationControls.hidden = true;
      return;
    }

    toggleEmptyState(false);
    lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];

    snapshot.forEach((doc) => {
      grid.appendChild(renderPlaylistCard(doc.id, doc.data()));
    });

    if (snapshot.docs.length < POSTS_PER_PAGE) {
      reachedEnd = true;
      if (paginationControls) paginationControls.hidden = true;
    }
  } catch (err) {
    // Never expose raw Firebase errors to normal users (see §37).
    console.error("Failed to load posts:", err);
    if (isFirstLoad) {
      clearSkeletons();
      showFriendlyError();
    } else if (typeof showToast === "function") {
      showToast("Couldn't load more playlists — check your connection.", "error");
    }
  } finally {
    isLoading = false;
    if (loadMoreBtn) loadMoreBtn.disabled = false;
  }
}

/**
 * Shows placeholder skeleton cards while the first page is loading,
 * so users never see an empty white screen (see §38).
 */
function renderSkeletons(count) {
  for (let i = 0; i < count; i++) {
    const card = document.createElement("article");
    card.className = "playlist-card skeleton-card";
    card.innerHTML = `
      <div class="thumb skeleton" style="height:140px;"></div>
      <div class="card-body">
        <div class="skeleton" style="width:80px;height:18px;margin-bottom:10px;"></div>
        <div class="skeleton" style="width:100%;height:18px;margin-bottom:8px;"></div>
        <div class="skeleton" style="width:60%;height:14px;"></div>
      </div>`;
    grid.appendChild(card);
  }
}

function clearSkeletons() {
  grid.querySelectorAll(".skeleton-card").forEach((el) => el.remove());
}

function toggleEmptyState(show) {
  if (emptyState) emptyState.hidden = !show;
  if (paginationControls) paginationControls.hidden = show;
}

function showFriendlyError() {
  const notice = document.createElement("p");
  notice.className = "empty-state";
  notice.textContent = "Sorry, playlists couldn't be loaded right now. Please try again shortly.";
  grid.replaceWith(notice);
}
