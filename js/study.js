"use strict";

const session = requireAuth();
const activeLevel = getQueryLevel();

const studyCard = document.getElementById("study-card");
const studyProgressText = document.getElementById("study-progress-text");
const studyFront = document.getElementById("study-front");
const studyBack = document.getElementById("study-back");

let studyState = null;

if (session) {
  if (!activeLevel) {
    window.location.href = "dashboard.html";
  } else {
    document.getElementById("study-back-btn").href = `level.html?level=${activeLevel}`;
    studyState = { terms: shuffle(termsForLevel(activeLevel)), idx: 0, flipped: false };
    renderStudyCard();
  }
}

function renderStudyCard() {
  const { terms, idx } = studyState;
  if (idx >= terms.length) {
    studyFront.innerHTML = `<div class="study-done">🎉 Готово!<br>Ти пройшов усі картки цього рівня.</div>`;
    studyBack.innerHTML = "";
    studyProgressText.textContent = `${terms.length} / ${terms.length}`;
    studyCard.classList.remove("flipped");
    document.getElementById("study-actions-know").style.display = "none";
    return;
  }
  document.getElementById("study-actions-know").style.display = "flex";
  const t = terms[idx];
  studyFront.textContent = t.term;
  studyBack.innerHTML = `<div class="def">${t.def}</div><div class="cat-tag">${t.cat}</div>`;
  studyProgressText.textContent = `${idx + 1} / ${terms.length}`;
  studyCard.classList.remove("flipped");
  studyState.flipped = false;
}

studyCard.addEventListener("click", () => {
  if (!studyState || studyState.idx >= studyState.terms.length) return;
  studyState.flipped = !studyState.flipped;
  studyCard.classList.toggle("flipped", studyState.flipped);
});

document.getElementById("know-btn").addEventListener("click", () => nextStudyCard(true));
document.getElementById("dont-know-btn").addEventListener("click", () => nextStudyCard(false));

function nextStudyCard(knew) {
  const t = studyState.terms[studyState.idx];
  if (t) updateProgress(session, t.id, knew);
  studyState.idx += 1;
  renderStudyCard();
}
