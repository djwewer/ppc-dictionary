"use strict";

const session = requireAuth();

if (session) {
  document.getElementById("welcome-name").textContent = session.displayName;

  document.getElementById("logout-btn").addEventListener("click", logout);

  document.getElementById("reset-progress-btn").addEventListener("click", () => {
    if (!confirm("Скинути весь прогрес для цього профілю?")) return;
    resetProgress(session);
    renderDashboard();
  });

  renderDashboard();
}

function renderDashboard() {
  const dashboardLevels = document.getElementById("dashboard-levels");
  const overallProgressText = document.getElementById("overall-progress-text");
  const overallProgressBar = document.getElementById("overall-progress-bar");

  dashboardLevels.innerHTML = "";
  let totalMastered = 0;

  Object.keys(LEVELS).forEach((lvl) => {
    const level = Number(lvl);
    const meta = LEVELS[level];
    const stats = levelStats(session, level);
    totalMastered += stats.mastered;
    const pct = stats.total ? Math.round((stats.mastered / stats.total) * 100) : 0;

    const card = document.createElement("a");
    card.href = `level.html?level=${level}`;
    card.className = "level-card";
    card.style.setProperty("--accent", meta.color);
    card.innerHTML = `
      <div class="level-card-head">
        <span class="level-badge">${meta.short}</span>
        <span class="level-pct">${pct}%</span>
      </div>
      <h3>${meta.name}</h3>
      <p class="level-sub">${stats.mastered} / ${stats.total} засвоєно</p>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      <span class="btn btn-outline open-level">Відкрити рівень</span>
    `;
    dashboardLevels.appendChild(card);
  });

  const totalTerms = PPC_TERMS.length;
  const overallPct = totalTerms ? Math.round((totalMastered / totalTerms) * 100) : 0;
  overallProgressText.textContent = `${totalMastered} / ${totalTerms} термінів засвоєно (${overallPct}%)`;
  overallProgressBar.style.width = overallPct + "%";
}
