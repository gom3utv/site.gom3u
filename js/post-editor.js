// ===============================
// POST-EDITOR.JS
// Handles both creating a new post and editing an existing one
// (edit mode is detected via ?id=POST_ID in the URL, same pattern as
// locker.html?id=POST_ID on the public site).
// ===============================

import { initAdminPage } from "./admin-common.js";
import { db, storage } from "../../js/firebase.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const MAX_THUMB_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_THUMBNAIL = "../assets/default-thumbnail.png";

let postId = getQueryParam("id"); // null = creating a new post
let selectedFile = null;
let existingThumbnailUrl = "";

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

    if (post.thumbnailUrl) {
      existingThumbnailUrl = post.thumbnailUrl;
      document.getElementById("thumbPreview").src = post.thumbnailUrl;
    }
  } catch (err) {
    console.error("Failed to load post:", err);
    showToast("Couldn't load this post.", "error");
  }
}

function wireThumbnailInput() {
  const input = document.getElementById("thumbInput");
  const preview = document.getElementById("thumbPreview");
  const errorEl = document.getElementById("thumbError");

  input.addEventListener("change", () => {
    errorEl.hidden = true;
    const file = input.files[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      errorEl.textContent = "Please choose a JPG, PNG, or WEBP image.";
      errorEl.hidden = false;
      input.value = "";
      return;
    }
    if (file.size > MAX_THUMB_BYTES) {
      errorEl.textContent = "Image must be under 2MB.";
      errorEl.hidden = false;
      input.value = "";
      return;
    }

    selectedFile = file;
    preview.src = URL.createObjectURL(file); // local preview before upload
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

    if (!isValidURL(realLink) || !isValidURL(adUrl1) || !isValidURL(adUrl2)) {
      showToast("Please enter valid http(s):// links for all URL fields.", "error");
      return;
    }

    const saveBtn = document.getElementById("saveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    try {
      const id = postId || doc(db, "posts", crypto.randomUUID()).id;
      let thumbnailUrl = existingThumbnailUrl || "";

      if (selectedFile) {
        thumbnailUrl = await uploadThumbnail(id, selectedFile);
      }

      const data = {
        title: document.getElementById("title").value.trim(),
        description: document.getElementById("description").value.trim(),
        category: document.getElementById("category").value.trim(),
        realLink: document.getElementById("realLink").value.trim(),
        adUrl1: document.getElementById("adUrl1").value.trim(),
        adUrl2: document.getElementById("adUrl2").value.trim(),
        verifyTime: Number(document.getElementById("verifyTime").value) || 20,
        notice: document.getElementById("notice").value.trim(),
        status: document.getElementById("status").value,
        sortOrder: Number(document.getElementById("sortOrder").value) || 0,
        thumbnailUrl: thumbnailUrl || DEFAULT_THUMBNAIL,
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

/**
 * Uploads a thumbnail to /thumbnails/{postId}/image and returns its
 * public download URL. Matches the Storage path used in storage.rules.
 */
async function uploadThumbnail(id, file) {
  const fileRef = ref(storage, `thumbnails/${id}/image`);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return await getDownloadURL(fileRef);
}
