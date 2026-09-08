"use strict";

/* ---------- Storage helpers ---------- */
const DB_KEY = "ppc_trainer_db_v1";
const SESSION_KEY = "ppc_trainer_session_v1";

function loadDB() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) || { users: {} };
  } catch (e) {
    return { users: {} };
  }
}
function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}
function hashPin(pin) {
  // Not real security — just avoids storing the raw PIN in plaintext-obvious form.
  let h = 0;
  for (let i = 0; i < pin.length; i++) {
    h = (h * 31 + pin.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

/* ---------- State ---------- */
let currentUser = null; // { name }
let db = loadDB();
let activeLevel = null;
let quizState = null;
let studyState = null;

/* ---------- DOM refs ---------- */
const screens = {
  login: document.getElementById("screen-login"),
  dashboard: document.getElementById("screen-dashboard"),
  level: document.getElementById("screen-level"),
  study: document.getElementById("screen-study"),
  quiz: document.getElementById("screen-quiz"),
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

/* ---------- Auth ---------- */
const loginForm = document.getElementById("login-form");
const loginName = document.getElementById("login-name");
const loginPin = document.getElementById("login-pin");
const loginError = document.getElementById("login-error");

function ensureUser(name, pin) {
  const key = name.trim().toLowerCase();
  if (!key) return { ok: false, msg: "Введи ім'я." };
  if (!/^\d{4,6}$/.test(pin)) return { ok: false, msg: "PIN — це 4–6 цифр." };

  const existing = db.users[key];
  if (existing) {
    if (existing.pinHash !== hashPin(pin)) {
      return { ok: false, msg: "Невірний PIN для цього імені." };
    }
    return { ok: true, key, displayName: existing.displayName };
  }
  // create new profile
  db.users[key] = {
    displayName: name.trim(),
    pinHash: hashPin(pin),
    progress: {},
    createdAt: Date.now(),
  };
  saveDB(db);
  return { ok: true, key, displayName: name.trim(), created: true };
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const res = ensureUser(loginName.value, loginPin.value);
  if (!res.ok) {
    loginError.textContent = res.msg;
    return;
  }
  currentUser = { key: res.key, displayName: res.displayName };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
  enterApp();
});

function tryRestoreSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (session && db.users[session.key]) {
      currentUser = session;
      return true;
    }
  } catch (e) {}
  return false;
}

document.getElementById("logout-btn").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  currentUser = null;
  loginForm.reset();
  showScreen("login");
});

document.getElementById("reset-progress-btn").addEventListener("click", () => {
  if (!currentUser) return;
  if (!confirm("Скинути весь прогрес для цього профілю?")) return;
  db.users[currentUser.key].progress = {};
  saveDB(db);
  renderDashboard();
});

/* ---------- Progress helpers ---------- */
function getProgress(termId) {
  const p = db.users[currentUser.key].progress;
  return p[termId] || { seen: 0, correct: 0, streak: 0, mastered: false };
}
function updateProgress(termId, isCorrect) {
  const p = db.users[currentUser.key].progress;
  const cur = p[termId] || { seen: 0, correct: 0, streak: 0, mastered: false };
  cur.seen += 1;
  if (isCorrect) {
    cur.correct += 1;
    cur.streak += 1;
  } else {
    cur.streak = 0;
  }
  cur.mastered = cur.streak >= 3;
  p[termId] = cur;
  saveDB(db);
}

function termsForLevel(level) {
  return PPC_TERMS.filter((t) => t.level === level);
}
function levelStats(level) {
  const terms = termsForLevel(level);
  const mastered = terms.filter((t) => getProgress(t.id).mastered).length;
  return { total: terms.length, mastered };
}

/* ---------- Dashboard ---------- */
const dashboardLevels = document.getElementById("dashboard-levels");
const welcomeName = document.getElementById("welcome-name");
const overallProgressText = document.getElementById("overall-progress-text");
const overallProgressBar = document.getElementById("overall-progress-bar");

function enterApp() {
  showScreen("dashboard");
  renderDashboard();
}

function renderDashboard() {
  welcomeName.textContent = currentUser.displayName;
  dashboardLevels.innerHTML = "";

  let totalMastered = 0;
  Object.keys(LEVELS).forEach((lvl) => {
    const level = Number(lvl);
    const meta = LEVELS[level];
    const stats = levelStats(level);
    totalMastered += stats.mastered;

    const pct = stats.total ? Math.round((stats.mastered / stats.total) * 100) : 0;

    const card = document.createElement("div");
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
      <button class="btn btn-outline open-level" data-level="${level}">Відкрити рівень</button>
    `;
    dashboardLevels.appendChild(card);
  });

  const totalTerms = PPC_TERMS.length;
  const overallPct = totalTerms ? Math.round((totalMastered / totalTerms) * 100) : 0;
  overallProgressText.textContent = `${totalMastered} / ${totalTerms} термінів засвоєно (${overallPct}%)`;
  overallProgressBar.style.width = overallPct + "%";

  document.querySelectorAll(".open-level").forEach((btn) => {
    btn.addEventListener("click", () => openLevel(Number(btn.dataset.level)));
  });
}

/* ---------- Level screen ---------- */
const levelTitle = document.getElementById("level-title");
const levelTermsList = document.getElementById("level-terms-list");

function openLevel(level) {
  activeLevel = level;
  levelTitle.textContent = LEVELS[level].name;
  renderLevelTerms();
  showScreen("level");
}

function renderLevelTerms() {
  const terms = termsForLevel(activeLevel);
  levelTermsList.innerHTML = "";
  terms.forEach((t) => {
    const p = getProgress(t.id);
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

document.getElementById("back-to-dashboard").addEventListener("click", () => {
  renderDashboard();
  showScreen("dashboard");
});
document.getElementById("start-study").addEventListener("click", () => startStudy(activeLevel));
document.getElementById("start-quiz").addEventListener("click", () => startQuiz(activeLevel));

/* ---------- Study (flashcards) ---------- */
const studyCard = document.getElementById("study-card");
const studyProgressText = document.getElementById("study-progress-text");
const studyFront = document.getElementById("study-front");
const studyBack = document.getElementById("study-back");

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startStudy(level) {
  studyState = { terms: shuffle(termsForLevel(level)), idx: 0, flipped: false };
  showScreen("study");
  renderStudyCard();
}

function renderStudyCard() {
  const { terms, idx } = studyState;
  if (idx >= terms.length) {
    studyFront.innerHTML = `<div class="study-done">🎉 Готово! Ти пройшов усі картки цього рівня.</div>`;
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
  if (studyState.idx >= studyState.terms.length) return;
  studyState.flipped = !studyState.flipped;
  studyCard.classList.toggle("flipped", studyState.flipped);
});

document.getElementById("know-btn").addEventListener("click", () => nextStudyCard(true));
document.getElementById("dont-know-btn").addEventListener("click", () => nextStudyCard(false));

function nextStudyCard(knew) {
  const t = studyState.terms[studyState.idx];
  if (t) updateProgress(t.id, knew);
  studyState.idx += 1;
  renderStudyCard();
}

document.getElementById("study-back-btn").addEventListener("click", () => {
  renderLevelTerms();
  showScreen("level");
});

/* ---------- Quiz (multiple choice) ---------- */
const quizProgressText = document.getElementById("quiz-progress-text");
const quizQuestion = document.getElementById("quiz-question");
const quizOptions = document.getElementById("quiz-options");
const quizFeedback = document.getElementById("quiz-feedback");
const quizScoreScreen = document.getElementById("quiz-score");

function startQuiz(level) {
  const terms = shuffle(termsForLevel(level));
  quizState = { terms, idx: 0, correct: 0, answered: false };
  showScreen("quiz");
  quizScoreScreen.classList.add("hidden");
  quizQuestion.classList.remove("hidden");
  quizOptions.classList.remove("hidden");
  renderQuizQuestion();
}

function buildOptions(correctTerm) {
  const sameLevelPool = PPC_TERMS.filter((t) => t.id !== correctTerm.id);
  const distractors = shuffle(sameLevelPool).slice(0, 3);
  return shuffle([correctTerm, ...distractors]);
}

function renderQuizQuestion() {
  const { terms, idx } = quizState;
  if (idx >= terms.length) {
    finishQuiz();
    return;
  }
  quizState.answered = false;
  const t = terms[idx];
  quizProgressText.textContent = `${idx + 1} / ${terms.length}`;
  quizQuestion.textContent = t.term;
  quizFeedback.textContent = "";
  quizFeedback.className = "quiz-feedback";

  const options = buildOptions(t);
  quizOptions.innerHTML = "";
  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = opt.def;
    btn.addEventListener("click", () => selectAnswer(opt.id === t.id, btn, t));
    quizOptions.appendChild(btn);
  });
}

function selectAnswer(isCorrect, btn, term) {
  if (quizState.answered) return;
  quizState.answered = true;
  updateProgress(term.id, isCorrect);
  if (isCorrect) quizState.correct += 1;

  Array.from(quizOptions.children).forEach((child) => (child.disabled = true));
  btn.classList.add(isCorrect ? "correct" : "wrong");
  quizFeedback.textContent = isCorrect ? "Правильно!" : `Неправильно. Правильна відповідь: «${term.def}»`;
  quizFeedback.className = "quiz-feedback " + (isCorrect ? "ok" : "bad");

  setTimeout(() => {
    quizState.idx += 1;
    renderQuizQuestion();
  }, isCorrect ? 900 : 1900);
}

function finishQuiz() {
  quizQuestion.classList.add("hidden");
  quizOptions.classList.add("hidden");
  quizFeedback.textContent = "";
  quizScoreScreen.classList.remove("hidden");
  const { correct, terms } = quizState;
  const pct = terms.length ? Math.round((correct / terms.length) * 100) : 0;
  quizScoreScreen.innerHTML = `
    <div class="score-big">${pct}%</div>
    <p>${correct} із ${terms.length} правильно</p>
    <div class="score-actions">
      <button class="btn btn-primary" id="quiz-retry">Пройти ще раз</button>
      <button class="btn btn-outline" id="quiz-to-level">До рівня</button>
    </div>
  `;
  document.getElementById("quiz-retry").addEventListener("click", () => startQuiz(activeLevel));
  document.getElementById("quiz-to-level").addEventListener("click", () => {
    renderLevelTerms();
    showScreen("level");
  });
}

document.getElementById("quiz-back-btn").addEventListener("click", () => {
  renderLevelTerms();
  showScreen("level");
});

/* ---------- Init ---------- */
(function init() {
  if (tryRestoreSession()) {
    enterApp();
  } else {
    showScreen("login");
  }
})();
