"use strict";

/* ---------- Storage ---------- */
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

let db = loadDB();

/* ---------- Auth ---------- */
function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && db.users[session.key]) return session;
    return null;
  } catch (e) {
    return null;
  }
}

// Call at the top of every protected page. Redirects to login if not authenticated.
function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

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
  db.users[key] = {
    displayName: name.trim(),
    pinHash: hashPin(pin),
    progress: {},
    createdAt: Date.now(),
  };
  saveDB(db);
  return { ok: true, key, displayName: name.trim(), created: true };
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

/* ---------- Progress ---------- */
function getProgress(session, termId) {
  const p = db.users[session.key].progress;
  return p[termId] || { seen: 0, correct: 0, streak: 0, mastered: false };
}
function updateProgress(session, termId, isCorrect) {
  const p = db.users[session.key].progress;
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
function resetProgress(session) {
  db.users[session.key].progress = {};
  saveDB(db);
}

function termsForLevel(level) {
  return PPC_TERMS.filter((t) => t.level === level);
}
function levelStats(session, level) {
  const terms = termsForLevel(level);
  const mastered = terms.filter((t) => getProgress(session, t.id).mastered).length;
  return { total: terms.length, mastered };
}

/* ---------- Utils ---------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function getQueryLevel() {
  const params = new URLSearchParams(window.location.search);
  const lvl = Number(params.get("level"));
  return [1, 2, 3].includes(lvl) ? lvl : null;
}
