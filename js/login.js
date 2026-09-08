"use strict";

// If already logged in, skip straight to the dashboard.
if (getSession()) {
  window.location.href = "dashboard.html";
}

const loginForm = document.getElementById("login-form");
const loginName = document.getElementById("login-name");
const loginPin = document.getElementById("login-pin");
const loginError = document.getElementById("login-error");

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const res = ensureUser(loginName.value, loginPin.value);
  if (!res.ok) {
    loginError.textContent = res.msg;
    return;
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ key: res.key, displayName: res.displayName }));
  window.location.href = "dashboard.html"; // redirect to main page
});
