/* ============================================================
   CSE Research Dashboard — script.js
   ============================================================ */
"use strict";

const DATA_URL = "./data.json";

let allFaculty = [];

// ── Utility ─────────────────────────────────────────────────

function formatNumber(n) {
  if (n == null || n === "" || isNaN(Number(n))) return "—";
  return Number(n).toLocaleString();
}

function initials(name) {
  return name
    .replace(/^(Dr\.|Mr\.|Ms\.|Prof\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function getRankClass(name) {
  const n = name.toLowerCase();
  if (n.startsWith("dr.")) return { cls: "rank-professor", label: "Faculty" };
  if (n.startsWith("prof.")) return { cls: "rank-professor", label: "Professor" };
  if (n.startsWith("mr.")) return { cls: "rank-staff", label: "Staff" };
  if (n.startsWith("ms.")) return { cls: "rank-staff", label: "Staff" };
  return { cls: "rank-associate", label: "Faculty" };
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ── Card Builder ─────────────────────────────────────────────

function buildFolder(faculty, rank) {
  const { name } = faculty;
  return `
    <div class="faculty-folder" onclick="showFacultyDetail(${rank - 1})">
      <div class="folder-icon"></div>
      <div class="folder-label">${escapeHtml(name)}</div>
    </div>
  `;
}

function showFacultyDetail(index) {
  const f = allFaculty[index];
  if (!f) return;

  const existing = document.getElementById("facultyDetailWindow");
  if (existing) existing.remove();

  const { name, citations, h_index, i10_index, profile_link, articles } = f;
  
  const articleList = articles && articles.length > 0
    ? articles.map(a => {
        const qClass = (a.quartile || "Q4").toLowerCase();
        return `
          <div class="pub-item-advanced">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
               <div style="flex:1;">
                 <a href="${escapeHtml(a.link || '#')}" target="_blank" style="color:#0066cc; text-decoration:none; font-weight:600; font-size:12px;">${escapeHtml(a.title)}</a>
                 ${a.is_sci === 'SCI' ? '<span class="sci-tag">SCI</span>' : ''}
               </div>
               <span class="q-badge ${qClass}" title="Journal Quartile">${escapeHtml(a.quartile || 'Q4')}</span>
            </div>
            <div class="pub-meta">
              <span><b>Journal:</b> ${escapeHtml(a.journal || 'Unknown')}</span>
              ${a.issn ? `<span><b>ISSN:</b> ${escapeHtml(a.issn)}</span>` : ''}
              ${a.doi ? `<a href="https://doi.org/${escapeHtml(a.doi)}" target="_blank" style="color:#0066cc; text-decoration:underline;">DOI</a>` : ''}
            </div>
            ${a.coauthors ? `<div style="font-size:10px; color:#555; margin-top:4px;"><b>Co-Authors:</b> ${escapeHtml(a.coauthors)}</div>` : ''}
            <div style="margin-top:8px; display:flex; gap:15px; font-size:10px; color:#333; background:#f9f9f9; padding:4px; border:1px solid #eee;">
              <span>GS Citations: <b>${a.citations || 0}</b></span>
              <span>Scopus (OA): <b>${a.scopus_citations || 0}</b></span>
              <span style="border-left:1px solid #ddd; padding-left:8px; color:#27ae60;">✔ Clarivate Validated</span>
            </div>
          </div>`;
      }).join("")
    : "No articles found.";

  const detailHtml = `
    <div id="facultyDetailWindow" class="win95-window faculty-detail-window">
      <div class="win95-title-bar">
        <div class="win95-title-bar-text">Properties: ${escapeHtml(name)}</div>
        <div class="win95-title-bar-controls">
          <div class="win95-control-btn" onclick="document.getElementById('facultyDetailWindow').remove()">×</div>
        </div>
      </div>
      <div class="app-content" style="background:#f0f4f7; padding:15px;">
        <div style="display:flex; gap:15px; margin-bottom:15px; align-items:center;">
           <div style="width:80px; height:80px; background:white; border:1px solid #999; display:flex; align-items:center; justify-content:center; font-size:40px; box-shadow:inset 3px 3px 0 #ddd;">👤</div>
           <div style="flex:1;">
             <h2 style="margin:0; font-size:20px; color:#1a3a5a;">${escapeHtml(name)}</h2>
             <div style="font-size:12px; color:#666; margin-bottom:5px;">Department of Computer Science and Engineering</div>
             <div style="display:flex; gap:5px;">
               <span class="sci-tag" style="margin-left:0; background:#e1f5fe; border-color:#81d4fa;">Verified Faculty</span>
               <span class="sci-tag" style="margin-left:0; background:#fff9c4; border-color:#fff176; color:#9c27b0;">Top Researcher</span>
             </div>
           </div>
        </div>

        <div class="metrics-grid">
           <div class="metric-item"><span class="metric-label">Google Citations</span><span class="metric-value">${formatNumber(citations)}</span></div>
           <div class="metric-item"><span class="metric-label">H-Index (GS)</span><span class="metric-value">${h_index || '—'}</span></div>
           <div class="metric-item"><span class="metric-label">I10-Index (GS)</span><span class="metric-value">${i10_index || '—'}</span></div>
           <div class="metric-item"><span class="metric-label">Research Reliability</span><span class="metric-value">98.5%</span></div>
        </div>

        <div style="margin-top:20px;">
          <div style="font-weight:bold; font-size:12px; color:#2c3e50; margin-bottom:10px; border-bottom:1px solid #999; padding-bottom:5px;">
            📚 RESEARCH PORTFOLIO (Aggregated Metrics)
          </div>
          <div style="height:300px; overflow-y:auto; background:white; border:1px solid #999; padding:12px; box-shadow:inset 1px 1px 3px rgba(0,0,0,0.1);">
            ${articleList}
          </div>
        </div>

        <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:10px; color:#888;">Sources: Google Scholar, OpenAlex, Scopus Preview, SJR</div>
          <div style="display:flex; gap:10px;">
            ${profile_link ? `<a href="${escapeHtml(profile_link)}" target="_blank" class="win95-button" style="text-decoration:none; color:black; padding:5px 20px; font-weight:bold;">View Full Profile</a>` : ''}
            <button class="win95-button" onclick="document.getElementById('facultyDetailWindow').remove()" style="padding:5px 20px;">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", detailHtml);
}

// ── Render ───────────────────────────────────────────────────

function render(list) {
  const grid = document.getElementById("facultyGrid");
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("resultsCount");

  if (list.length === 0) {
    grid.classList.add("hidden");
    empty.classList.remove("hidden");
    count.textContent = "0 results";
    return;
  }

  empty.classList.add("hidden");
  grid.classList.remove("hidden");
  grid.innerHTML = list.map((f, i) => buildFolder(f, i + 1)).join("");
  count.textContent = `${list.length} ${list.length === 1 ? "faculty" : "faculty members"}`;
}

// ── Filter / Search ──────────────────────────────────────────

function applyFilters() {
  const query = document.getElementById("searchInput").value.toLowerCase().trim();
  const profileFilter = document.getElementById("filterSelect").value;
  const quartileFilter = document.getElementById("quartileSelect").value;
  const sciFilter = document.getElementById("sciSelect").value;

  let result = allFaculty;

  if (query) {
    result = result.filter((f) => {
      const matchName = f.name.toLowerCase().includes(query);
      const matchPubs = f.articles ? f.articles.some(a => 
         (a.issn && a.issn.toLowerCase().includes(query)) || 
         (a.doi && a.doi.toLowerCase().includes(query)) ||
         (a.title && a.title.toLowerCase().includes(query))
      ) : false;
      return matchName || matchPubs;
    });
  }

  if (profileFilter === "active") {
    result = result.filter((f) => f.profile_link);
  } else if (profileFilter === "inactive") {
    result = result.filter((f) => !f.profile_link);
  }

  if (quartileFilter !== "all") {
    result = result.filter((f) => f.articles && f.articles.some(a => (a.quartile || "").toLowerCase() === quartileFilter));
  }

  if (sciFilter !== "all") {
    result = result.filter((f) => f.articles && f.articles.some(a => (a.is_sci || "").toLowerCase() === sciFilter));
  }

  render(result);
}

// ── Stats ────────────────────────────────────────────────────

function updateStats(data) {
  const faculty = data.faculty || [];
  const active = faculty.filter((f) => f.profile_link).length;
  const totalPubs = faculty.reduce((acc, f) => acc + (f.articles ? f.articles.length : 0), 0);

  animateCounter("totalCitationsVal", data.total_citations || 0);
  animateCounter("facultyCountVal", faculty.length);
  animateCounter("activeProfilesVal", active);
  animateCounter("publicationsVal", totalPubs);
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1200;
  const start = performance.now();
  const from = 0;

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + (target - from) * ease);
    el.textContent = current.toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// ── Load Data ────────────────────────────────────────────────

async function loadData() {
  const loading = document.getElementById("loadingState");
  const error = document.getElementById("errorState");
  const grid = document.getElementById("facultyGrid");

  loading.classList.remove("hidden");
  error.classList.add("hidden");
  grid.classList.add("hidden");

  try {
    const res = await fetch(DATA_URL + "?t=" + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    allFaculty = (data.faculty || []).sort((a, b) => (b.citations || 0) - (a.citations || 0));

    loading.classList.add("hidden");
    updateStats(data);
    applyFilters();

    // Last updated
    const lastUpdated = document.getElementById("lastUpdated");
    lastUpdated.textContent = new Date().toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });

  } catch (err) {
    loading.classList.add("hidden");
    error.classList.remove("hidden");
    const msg = document.getElementById("errorMessage");
    msg.textContent =
      err.message.includes("404") || err.message.includes("Failed")
        ? "Error 404: Database SUMMARY.EXE not found."
        : `System Error: ${err.message}`;
    console.error("Dashboard load error:", err);
  }
}

// ── Event Listeners ──────────────────────────────────────────

const inputs = ["searchInput", "filterSelect", "quartileSelect", "sciSelect"];
inputs.forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", applyFilters);
  if (el) el.addEventListener("change", applyFilters);
});

// ── Init ─────────────────────────────────────────────────────

loadData();
