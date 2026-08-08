// ===============================
// SEARCH.JS
// Firestore doesn't offer full-text search out of the box, so this page
// fetches active posts once and filters them in the browser by title and
// category (a basic keyword match). This is fine for a small-to-medium
// catalog. If your post count grows large, a dedicated search service
// (e.g. Algolia, Typesense) would scale better than client-side filtering.
// ===============================

import { db } from "./firebase.js";
import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const grid = document.getElementById("searchGrid");
const emptyEl = document.getElementById("searchEmpty");
const statusEl = document.getElementById("searchStatus");
const input = document.getElementById("searchInput");
const form = document.getElementById("searchForm");

let allPosts = []; // [{id, ...data}], loaded once
let postsLoaded = false;
let debounceTimer = null;

document.addEventListener("DOMContentLoaded", async () => {
  const initialQuery = getQueryParam("q") || "";
  input.value = initialQuery;

  await loadAllActivePosts();
  runSearch(initialQuery);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    runSearch(input.value);
  });

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runSearch(input.value), 250);
  });
});

async function loadAllActivePosts() {
  renderSkeletons(6);
  try {
    const q = query(collection(db, "posts"), where("status", "==", "active"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    allPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    postsLoaded = true;
  } catch (err) {
    console.error("Failed to load posts for search:", err);
    grid.innerHTML = "";
    statusEl.hidden = false;
    statusEl.textContent = "Sorry, search is temporarily unavailable.";
  }
}

function runSearch(rawTerm) {
  if (!postsLoaded) return;
  const term = rawTerm.trim().toLowerCase();
  grid.innerHTML = "";

  const results = term
    ? allPosts.filter((post) => matchesTerm(post, term))
    : allPosts;

  if (results.length === 0) {
    emptyEl.hidden = false;
    statusEl.hidden = true;
    return;
  }

  emptyEl.hidden = true;
  statusEl.hidden = false;
  statusEl.textContent = term
    ? `${results.length} result${results.length === 1 ? "" : "s"} for "${rawTerm.trim()}"`
    : `Showing all ${results.length} playlists`;

  results.forEach((post) => grid.appendChild(renderPlaylistCard(post.id, post)));
}

function matchesTerm(post, term) {
  const haystack = [post.title, post.category, post.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(term);
}

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
