// ===============================
// DASHBOARD.JS
// Populates the stat cards and recent-activity tables on admin/dashboard.html.
//
// Post counts use getCountFromServer() (a lightweight Firestore count query
// that doesn't download every document). View/unlock totals read from the
// stats/global and stats/daily/{today} documents — those are written by
// locker.html once Phase 4/5 adds the unlock/view workflow, so they'll
// read as 0 until then. That's expected, not a bug.
// ===============================

import { initAdminPage } from "./admin-common.js";
import { db } from "../../js/firebase.js";
import {
  collection, query, where, orderBy, limit, getDocs, getCountFromServer, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

initAdminPage(async () => {
  loadPostStats();
  loadActivityStats();
  loadRecentPosts();
  initStatsChart();
});

async function loadPostStats() {
  try {
    const postsRef = collection(db, "posts");
    const [totalSnap, activeSnap, disabledSnap] = await Promise.all([
      getCountFromServer(postsRef),
      getCountFromServer(query(postsRef, where("status", "==", "active"))),
      getCountFromServer(query(postsRef, where("status", "==", "disabled")))
    ]);
    setText("statTotalPosts", totalSnap.data().count);
    setText("statActivePosts", activeSnap.data().count);
    setText("statDisabledPosts", disabledSnap.data().count);
  } catch (err) {
    console.error("Failed to load post stats:", err);
  }
}

async function loadActivityStats() {
  try {
    const globalSnap = await getDoc(doc(db, "stats", "global"));
    const globalData = globalSnap.exists() ? globalSnap.data() : {};
    setText("statTotalViews", globalData.totalViews || 0);
    setText("statTotalUnlocks", globalData.totalUnlocks || 0);

    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const dailySnap = await getDoc(doc(db, "stats_daily", todayKey));
    const dailyData = dailySnap.exists() ? dailySnap.data() : {};
    setText("statTodayUnlocks", dailyData.unlocks || 0);
  } catch (err) {
    console.error("Failed to load activity stats:", err);
  }
}

async function loadRecentPosts() {
  const tbody = document.getElementById("recentPostsBody");
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(5));
    const snap = await getDocs(q);
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="4" class="form-hint">No posts yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = "";
    snap.forEach((docSnap) => {
      const post = docSnap.data();
      const tr = document.createElement("tr");

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

      const dateTd = document.createElement("td");
      const created = post.createdAt && post.createdAt.toDate ? post.createdAt.toDate() : null;
      dateTd.textContent = created ? formatDate(created) : "—";

      tr.append(titleTd, catTd, statusTd, dateTd);
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load recent posts:", err);
    tbody.innerHTML = `<tr><td colspan="4" class="form-error">Couldn't load recent posts.</td></tr>`;
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ===============================
// STATS CHART (§50)
// A small hand-rolled canvas bar chart — avoids pulling in a full charting
// library for two bars. Periods: Today / 7 Days / 30 Days / All Time.
// Daily figures come from stats_daily/{YYYY-MM-DD} docs written by
// locker.js; All Time reads the running totals on stats/global directly.
// ===============================

function initStatsChart() {
  const buttons = document.querySelectorAll("#statsPeriodButtons button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active-period"));
      btn.classList.add("active-period");
      loadAndDrawChart(btn.dataset.period);
    });
  });
  loadAndDrawChart("today");
}

async function loadAndDrawChart(period) {
  const hint = document.getElementById("statsChartHint");
  hint.textContent = "Loading…";

  try {
    let views = 0;
    let unlocks = 0;

    if (period === "all") {
      const globalSnap = await getDoc(doc(db, "stats", "global"));
      const g = globalSnap.exists() ? globalSnap.data() : {};
      views = g.totalViews || 0;
      unlocks = g.totalUnlocks || 0;
    } else {
      const days = period === "today" ? 1 : Number(period);
      const dateKeys = lastNDateKeys(days);
      const snaps = await Promise.all(dateKeys.map((key) => getDoc(doc(db, "stats_daily", key))));
      snaps.forEach((snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        views += d.views || 0;
        unlocks += d.unlocks || 0;
      });
    }

    drawBarChart(views, unlocks);
    hint.textContent = `Views: ${views} · Unlocks: ${unlocks}`;
  } catch (err) {
    console.error("Failed to load stats chart:", err);
    hint.textContent = "Couldn't load statistics.";
  }
}

function lastNDateKeys(n) {
  const keys = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function drawBarChart(views, unlocks) {
  const canvas = document.getElementById("statsChart");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const max = Math.max(views, unlocks, 1);
  const barWidth = 90;
  const gap = 60;
  const chartHeight = height - 50;
  const startX = width / 2 - barWidth - gap / 2;

  const bars = [
    { label: "Views", value: views, x: startX, color: "#6C63FF" },
    { label: "Unlocks", value: unlocks, x: startX + barWidth + gap, color: "#10B981" }
  ];

  bars.forEach((bar) => {
    const barHeight = (bar.value / max) * (chartHeight - 20);
    const y = chartHeight - barHeight;

    ctx.fillStyle = bar.color;
    ctx.fillRect(bar.x, y, barWidth, barHeight);

    ctx.fillStyle = "#1E293B";
    ctx.font = "600 14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(bar.value), bar.x + barWidth / 2, y - 10);

    ctx.fillStyle = "#64748B";
    ctx.font = "500 13px Inter, sans-serif";
    ctx.fillText(bar.label, bar.x + barWidth / 2, chartHeight + 22);
  });
}
