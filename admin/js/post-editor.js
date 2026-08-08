// ===============================
// POST-EDITOR.JS
// Handles both creating a new post and editing an existing one
// (edit mode is detected via ?id=POST_ID in the URL, same pattern as
// locker.html?id=POST_ID on the public site).
//
// THUMBNAILS: this version uses a pasted external image URL (e.g. from
// imgbb.com or postimages.org) instead of uploading to Firebase Storage.
// Firebase Storage now requires the paid Blaze plan even for small
// projects, so this keeps the whole project usable on the free Spark
// plan. If you later move to Blaze and want direct uploads again, swap
// this back to Firebase Storage's uploadBytes()/getDownloadURL().
// ===============================

import { initAdminPage } from "./admin-common.js";
import { db } from "../../js/firebase.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let postId = getQueryParam("id"); // null = creating a new post

initAdminPage(() => {
  if (postId) {
    document.getElementById("editorHeading").textContent = "Edit Post";
    loadExistingPost(postId);
  }
  wireThumbnailInput();
  wireForm();
});

async function loadExistingPost(id) {
  try {
    const snap = await getDoc(doc(db, "posts", id));
    if (!snap.exists()) {
      showToast("That post no longer exists.", "error");
      window.location.href = "posts.html";
      return;
    }
    const post = snap.data();
    document.getElementById("title").value = post.title || "";
    document.getElementById("description").value = post.description || "";
    document.getElementById("category").value = post.category || "";
    document.getElementById("realLink").value = post.realLink || "";
    document.getElementById("adUrl1").value = post.adUrl1 || "";
    document.getElementById("adUrl2").value = post.adUrl2 || "";
    document.getElementById("verifyTime").value = post.verifyTime || 20;
    document.getElementById("notice").value = post.notice || "";
    document.getElementById("status").value = post.status || "draft";
    document.getElementById("sortOrder").value = post.sortOrder || 0;

    // Skip any old broken relative default-thumbnail path baked in by a
    // previous version of this file — treat it as "no thumbnail set".
    if (post.thumbnailUrl && !post.thumbnailUrl.includes("default-thumbnail.png")) {
      document.getElementById("thumbnailUrl").value = post.thumbnailUrl;
      document.getElementById("thumbPreview").src = post.thumbnailUrl;
    }

    const statsDisplay = document.getElementById("statsDisplay");
    if (statsDisplay) {
      document.getElementById("statViews").textContent = post.viewCount || 0;
      document.getElementById("statUnlocks").textContent = post.unlockCount || 0;
      statsDisplay.hidden = false;
    }
  } catch (err) {
    console.error("Failed to load post:", err);
    showToast("Couldn't load this post.", "error");
  }
}

function wireThumbnailInput() {
  const urlInput = document.getElementById("thumbnailUrl");
  const preview = document.getElementById("thumbPreview");
  const errorEl = document.getElementById("thumbError");
  const defaultSrc = "../assets/default-thumbnail.png";

  urlInput.addEventListener("input", () => {
    errorEl.hidden = true;
    const value = urlInput.value.trim();
    if (!value) {
      preview.src = defaultSrc;
      return;
    }
    preview.src = value;
  });

  preview.addEventListener("error", () => {
    if (urlInput.value.trim()) {
      errorEl.textContent = "Couldn't load an image from that URL — double check the link.";
      errorEl.hidden = false;
    }
    preview.src = defaultSrc;
  });
}

function wireForm() {
  const form = document.getElementById("postForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return; // native required/url/number validation

    const realLink = document.getElementById("realLink").value.trim();
    const adUrl1 = document.getElementById("adUrl1").value.trim();
    const adUrl2 = document.getElementById("adUrl2").value.trim();
    const thumbnailUrl = document.getElementById("thumbnailUrl").value.trim();

    if (!isValidURL(realLink) || !isValidURL(adUrl1) || !isValidURL(adUrl2)) {
      showToast("Please enter valid http(s):// links for all URL fields.", "error");
      return;
    }
    if (thumbnailUrl && !isValidURL(thumbnailUrl)) {
      showToast("Thumbnail URL doesn't look valid — leave it blank or fix the link.", "error");
      return;
    }

    const saveBtn = document.getElementById("saveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
      const id = postId || doc(db, "posts", crypto.randomUUID()).id;

      const data = {
        title: document.getElementById("title").value.trim(),
        description: document.getElementById("description").value.trim(),
        category: document.getElementById("category").value.trim(),
        realLink,
        adUrl1,
        adUrl2,
        verifyTime: Number(document.getElementById("verifyTime").value) || 20,
        notice: document.getElementById("notice").value.trim(),
        status: document.getElementById("status").value,
        sortOrder: Number(document.getElementById("sortOrder").value) || 0,
        // Empty string when left blank — every page applies its own
        // correctly-scoped default thumbnail path when this is empty.
        thumbnailUrl: thumbnailUrl,
        updatedAt: serverTimestamp()
      };

      if (!postId) {
        data.createdAt = serverTimestamp();
        data.unlockCount = 0;
        data.viewCount = 0;
      }

      await setDoc(doc(db, "posts", id), data, { merge: true });
      showToast(postId ? "Post updated successfully." : "Post created successfully.", "success");
      window.location.href = "posts.html";
    } catch (err) {
      console.error("Failed to save post:", err);
      showToast("Permission denied or network error — post not saved.", "error");
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Post";
    }
  });
}
