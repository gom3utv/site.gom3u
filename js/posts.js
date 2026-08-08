// ===============================
// POSTS.JS
// Lists all posts (any status) in the admin table and wires up
// enable/disable and delete actions. Editing happens on post-editor.html.
// ===============================

import { initAdminPage } from "./admin-common.js";
import { db } from "../../js/firebase.js";
import {
  collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const DEFAULT_THUMBNAIL = "../assets/default-thumbnail.png";
let pendingDeleteId = null;

initAdminPage(() => {
  loadPosts();
  wireDeleteModal();
});

async function loadPosts() {
  const tbody = document.getElementById("postsBody");
  const emptyEl = document.getElementById("postsEmpty");
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    tbody.innerHTML = "";

    snap.forEach((docSnap) => {
      tbody.appendChild(renderRow(docSnap.id, docSnap.data()));
    });
  } catch (err) {
    console.error("Failed to load posts:", err);
    tbody.innerHTML = `<tr><td colspan="7" class="form-error">Couldn't load posts.</td></tr>`;
  }
}

function renderRow(id, post) {
  const tr = document.createElement("tr");
  tr.dataset.id = id;

  const thumbTd = document.createElement("td");
  const img = document.createElement("img");
  img.className = "thumb-sm";
  img.src = post.thumbnailUrl || DEFAULT_THUMBNAIL;
  img.alt = "";
  img.onerror = () => { img.src = DEFAULT_THUMBNAIL; };
  thumbTd.appendChild(img);

  const titleTd = document.createElement("td");
  titleTd.className = "title-cell";
  titleTd.textContent = post.title || "Untitled";

  const catTd = document.createElement("td");
  catTd.textContent = post.category || "—";

  const statusTd = document.createElement("td");
  const pill = document.createElement("span");
  pill.className = `status-pill status-${post.status || "draft"}`;
  pill.textContent = post.status || "draft";
  statusTd.appendChild(pill);

  const unlocksTd = document.createElement("td");
  unlocksTd.textContent = post.unlockCount || 0;

  const dateTd = document.createElement("td");
  const created = post.createdAt && post.createdAt.toDate ? post.createdAt.toDate() : null;
  dateTd.textContent = created ? formatDate(created) : "—";

  const actionsTd = document.createElement("td");
  actionsTd.className = "row-actions";

  const editLink = document.createElement("a");
  editLink.className = "btn btn-outline btn-sm";
  editLink.href = `post-editor.html?id=${encodeURIComponent(id)}`;
  editLink.textContent = "Edit";

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "btn btn-outline btn-sm";
  toggleBtn.textContent = post.status === "active" ? "Disable" : "Enable";
  toggleBtn.addEventListener("click", () => toggleStatus(id, post.status));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-outline btn-sm";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => openDeleteModal(id));

  actionsTd.append(editLink, toggleBtn, deleteBtn);
  tr.append(thumbTd, titleTd, catTd, statusTd, unlocksTd, dateTd, actionsTd);
  return tr;
}

async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === "active" ? "disabled" : "active";
  try {
    await updateDoc(doc(db, "posts", id), { status: newStatus, updatedAt: new Date() });
    showToast(`Post ${newStatus === "active" ? "enabled" : "disabled"}.`, "success");
    loadPosts();
  } catch (err) {
    console.error("Failed to update status:", err);
    showToast("Permission denied or network error.", "error");
  }
}

function wireDeleteModal() {
  document.getElementById("cancelDeleteBtn").addEventListener("click", closeDeleteModal);
  document.getElementById("confirmDeleteBtn").addEventListener("click", confirmDelete);
}

function openDeleteModal(id) {
  pendingDeleteId = id;
  document.getElementById("deleteModal").hidden = false;
}

function closeDeleteModal() {
  pendingDeleteId = null;
  document.getElementById("deleteModal").hidden = true;
}

async function confirmDelete() {
  if (!pendingDeleteId) return;
  try {
    await deleteDoc(doc(db, "posts", pendingDeleteId));
    showToast("Post deleted.", "success");
    closeDeleteModal();
    loadPosts();
  } catch (err) {
    console.error("Failed to delete post:", err);
    showToast("Couldn't delete this post.", "error");
    closeDeleteModal();
  }
}
