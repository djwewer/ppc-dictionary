"use strict";

const session = requireAuth();
const activeLevel = getQueryLevel();

const quizProgressText = document.getElementById("quiz-progress-text");
const quizQuestion = document.getElementById("quiz-question");
const quizOptions = document.getElementById("quiz-options");
const quizFeedback = document.getElementById("quiz-feedback");
const quizScoreScreen = document.getElementById("quiz-score");

let quizState = null;

if (session) {
  if (!activeLevel) {
    window.location.href = "dashboard.html";
  } else {
    document.getElementById("quiz-back-btn").href = `level.html?level=${activeLevel}`;
    startQuiz();
  }
}

function startQuiz() {
  const terms = shuffle(termsForLevel(activeLevel));
  quizState = { terms, idx: 0, correct: 0, answered: false };
  quizScoreScreen.classList.add("hidden");
  quizQuestion.classList.remove("hidden");
  quizOptions.classList.remove("hidden");
  renderQuizQuestion();
}

function buildOptions(correctTerm) {
  const pool = PPC_TERMS.filter((t) => t.id !== correctTerm.id);
  const distractors = shuffle(pool).slice(0, 3);
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
  updateProgress(session, term.id, isCorrect);
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
      <a class="btn btn-outline" href="level.html?level=${activeLevel}">До рівня</a>
    </div>
  `;
  document.getElementById("quiz-retry").addEventListener("click", startQuiz);
}
