"use strict";

const session = requireAuth();
const activeLevel = getQueryLevel();

if (session) {
  if (!activeLevel) {
    window.location.href = "dashboard.html";
  } else {
    document.getElementById("level-title").textContent = LEVELS[activeLevel].name;
    document.getElementById("start-study").href = `study.html?level=${activeLevel}`;
    document.getElementById("start-quiz").href = `quiz.html?level=${activeLevel}`;
    renderLevelTerms();
  }
}

function renderLevelTerms() {
  const levelTermsList = document.getElementById("level-terms-list");
  const terms = termsForLevel(activeLevel);
  levelTermsList.innerHTML = "";
  terms.forEach((t) => {
    const p = getProgress(session, t.id);
    const row = document.createElement("div");
    row.className = "term-row" + (p.mastered ? " mastered" : "");
    row.innerHTML = `
      <div class="term-row-main">
        <strong>${t.term}</strong>
        <span class="term-cat">${t.cat}</span>
      </div>
      <div class="term-row-status">${p.mastered ? "✓ засвоєно" : p.seen ? `${p.correct}/${p.seen}` : "не вивчено"}</div>
    `;
    levelTermsList.appendChild(row);
  });
}
