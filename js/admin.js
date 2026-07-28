/**
 * Admin Panel - Discord OAuth Authentication
 * Bezpieczne logowanie przez Discord zamiast PIN
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCJVQfa4qwlSw6N2pld1Kji6bBMq9Kdg-8",
  authDomain: "arcynek.firebaseapp.com",
  projectId: "arcynek",
  storageBucket: "arcynek.firebasestorage.app",
  messagingSenderId: "168374544632",
  appId: "1:168374544632:web:21872f0ec62b32aaebf30d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===================== Discord OAuth Config =====================

const DISCORD_CLIENT_ID = "1530688923137999051";
const DISCORD_REDIRECT_URI = window.location.origin + "/admin.html";

// ===================== State =====================

let isAuthenticated = false;
let adminUser = null;

// ===================== DOM Elements =====================

function $(id) { return document.getElementById(id); }

// ===================== Discord OAuth =====================

function getDiscordLoginURL() {
  const state = btoa(JSON.stringify({
    t: Date.now(),
    r: Math.random().toString(36).substring(2)
  }));
  sessionStorage.setItem("discord_oauth_state", state);

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "token",
    scope: "identify",
    state: state,
    prompt: "none"
  });

  return "https://discord.com/api/oauth2/authorize?" + params.toString();
}

function parseDiscordToken() {
  const hash = window.location.hash.substring(1);
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const token = params.get("access_token");
  const state = params.get("state");

  const savedState = sessionStorage.getItem("discord_oauth_state");
  if (state && savedState && state !== savedState) {
    console.warn("[Admin] OAuth state mismatch - possible CSRF");
    return null;
  }

  sessionStorage.removeItem("discord_oauth_state");

  if (token) {
    sessionStorage.setItem("discord_access_token", token);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  return token;
}

async function fetchDiscordUser(token) {
  try {
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: "Bearer " + token }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function authenticate() {
  let token = parseDiscordToken();
  if (!token) token = sessionStorage.getItem("discord_access_token");
  if (!token) { showLogin(); return; }

  const user = await fetchDiscordUser(token);
  if (!user) {
    sessionStorage.removeItem("discord_access_token");
    showLogin();
    return;
  }

  adminUser = {
    id: user.id,
    username: user.username,
    avatar: user.avatar
      ? "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".png"
      : "https://cdn.discordapp.com/embed/avatars/0.png",
    global_name: user.global_name || user.username
  };

  isAuthenticated = true;

  try {
    localStorage.setItem("admin_session", JSON.stringify({
      user: adminUser,
      time: Date.now()
    }));
  } catch (e) {}

  showAdmin();
  loadCodes();
}

function logout() {
  isAuthenticated = false;
  adminUser = null;
  sessionStorage.removeItem("discord_access_token");
  localStorage.removeItem("admin_session");
  showLogin();
}

// ===================== UI Functions =====================

function showLogin() {
  const loginSection = $("loginSection");
  const adminContent = $("adminContent");
  if (loginSection) loginSection.classList.remove("is-authenticated");
  if (adminContent) adminContent.classList.remove("is-authenticated");

  try {
    const cached = JSON.parse(localStorage.getItem("admin_session") || "{}");
    if (cached.user && (Date.now() - cached.time < 3600000)) {
      adminUser = cached.user;
      isAuthenticated = true;
      showAdmin();
      loadCodes();
      return;
    }
  } catch (e) {}

  const status = $("loginStatus");
  if (status) {
    status.textContent = "Zaloguj sie przez Discord, aby uzyskac dostep do panelu.";
  }
}

function showAdmin() {
  const loginSection = $("loginSection");
  const adminContent = $("adminContent");
  if (loginSection) loginSection.classList.add("is-authenticated");
  if (adminContent) adminContent.classList.add("is-authenticated");

  if (adminUser) {
    const avatar = $("adminAvatar");
    const name = $("adminName");
    const badge = $("adminRoleBadge");
    if (avatar) avatar.src = adminUser.avatar;
    if (name) name.textContent = adminUser.global_name || adminUser.username;
    if (badge) {
      badge.textContent = "● " + adminUser.username;
      badge.style.borderColor = "rgba(88, 101, 242, 0.3)";
      badge.style.background = "rgba(88, 101, 242, 0.12)";
    }
  }
  setStatus("Panel odblokowany. Mozesz zarzadzac kluczami.");
}

// ===================== Code Management =====================

function normalizeCode(value) {
  return (value || "").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatCode(value) {
  const normalized = normalizeCode(value);
  return normalized.replace(/(.{4})(?=.)/g, "$1-").slice(0, 19);
}

function randomCode() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

function setStatus(message, isError) {
  const statusEl = $("statusMessage");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = "status-message";
  if (isError) statusEl.classList.add("is-error");
}

function renderSummary(codes) {
  const container = $("summaryStats");
  if (!container) return;

  const total = codes.length;
  const active = codes.filter(c => !c.used).length;
  const used = codes.filter(c => c.used).length;
  const premium = codes.filter(c => c.plan === "premium").length;

  container.innerHTML = `
    <div class="summary-card"><strong>${total}</strong><span>Wszystkie</span></div>
    <div class="summary-card"><strong>${active}</strong><span>Aktywne</span></div>
    <div class="summary-card"><strong>${used}</strong><span>Uzyte</span></div>
    <div class="summary-card"><strong>${premium}</strong><span>Premium</span></div>
  `;
}

async function loadCodes() {
  try {
    const snap = await getDocs(collection(db, "codes"));
    const container = $("codes");
    if (!container) return;

    const rows = snap.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    renderSummary(rows);

    if (!rows.length) {
      container.innerHTML = '<div class="empty-state">Brak kodow w bazie. Wygeneruj pierwszy klucz aktywacyjny.</div>';
      return;
    }

    container.innerHTML = rows.map(item => {
      const planLabel = item.plan === "premium" ? "Premium" : "Basic";
      const statusLabel = item.used ? "Uzyty" : "Aktywny";
      const statusClass = item.used ? "badge--used" : "badge--active";
      const createdText = item.createdAt
        ? new Date(item.createdAt).toLocaleString("pl-PL", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          })
        : "brak daty";

      return `
        <div class="code-item">
          <div class="code-top">
            <div>
              <div class="code-title">${item.nick || "Klient"}</div>
              <div class="code-value">${item.code || "---"}</div>
            <div class="badge ${statusClass}">${statusLabel}</div>
          <div class="code-meta">
            <div><span class="badge badge--plan">${planLabel}</span></div>
            <div>Utworzono: ${createdText}</div>
            ${item.note ? `<div>Notatka: ${item.note}</div>` : ""}
            ${item.usedAt ? `<div>Uzyto: ${new Date(item.usedAt).toLocaleString("pl-PL")}</div>` : ""}
          </div>
          <div class="code-actions">
            <button type="button" data-action="copy" data-id="${item.id}">Kopiuj</button>
            <button type="button" data-action="delete" data-id="${item.id}" class="btn-danger-action">Usun</button>
          </div>
      `;
    }).join("");
  } catch (error) {
    const container = $("codes");
    if (container) {
      container.innerHTML = '<div class="empty-state">Blad ladowania kodow.</div>';
    }
  }
}

async function generate() {
  if (!isAuthenticated) {
    setStatus("Musisz byc zalogowany.", true);
    return;
  }

  const nick = ($("nick")?.value || "").trim();
  const plan = ($("planSelect")?.value || "basic");
  const quantity = Math.min(Math.max(parseInt($("quantity")?.value || "1", 10) || 1, 1), 20);
  const note = ($("note")?.value || "").trim();

  if (!nick) {
    setStatus("Podaj nazwe klienta.", true);
    return;
  }

  try {
    const payloads = [];
    let lastCode = "";
    for (let i = 0; i < quantity; i++) {
      const code = formatCode(randomCode());
      lastCode = code;
      payloads.push({
        code: code,
        nick: nick,
        plan: plan,
        note: note,
        used: false,
        createdAt: new Date().toISOString()
      });
    }
    await Promise.all(payloads.map(item => addDoc(collection(db, "codes"), item)));
    setStatus("Wygenerowano " + quantity + " kod(" + (quantity > 1 ? "y" : "") + ") dla " + nick);

    const display = $("generatedKeyDisplay");
    const value = $("generatedKeyValue");
    if (display && value) {
      display.style.display = "block";
      value.textContent = lastCode;
    }
    if ($("nick")) $("nick").value = "";
    if ($("quantity")) $("quantity").value = "1";
    if ($("note")) $("note").value = "";
    await loadCodes();
  } catch (error) {
    setStatus("Nie udalo sie wygenerowac kodow.", true);
  }
}

async function deleteCode(id) {
  if (!isAuthenticated) { setStatus("Musisz byc zalogowany.", true); return; }
  if (!confirm("Czy na pewno usunac ten kod?")) return;
  try {
    await deleteDoc(doc(db, "codes", id));
    setStatus("Kod usuniety.");
    await loadCodes();
  } catch (error) {
    setStatus("Nie udalo sie usunac kodu.", true);
  }
}

async function copyCode(id) {
  const item = document.querySelector('[data-id="' + id + '"]');
  const codeValue = item?.closest(".code-item")?.querySelector(".code-value")?.textContent;
  if (!codeValue) { setStatus("Nie znaleziono kodu.", true); return; }
  try {
    await navigator.clipboard.writeText(codeValue);
    setStatus("Kod skopiowany.");
  } catch (error) {
    setStatus("Blad kopiowania.", true);
  }
}

function bindEvents() {
  const genBtn = $("genBtn");
  const codesContainer = $("codes");
  const discordBtn = $("discordLoginBtn");
  const logoutBtn = $("logoutBtn");
  const copyKeyBtn = $("copyKeyBtn");

  if (genBtn) genBtn.addEventListener("click", generate);
  if (discordBtn) discordBtn.addEventListener("click", () => { window.location.href = getDiscordLoginURL(); });
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
  if (copyKeyBtn) copyKeyBtn.addEventListener("click", async () => {
    const value = $("generatedKeyValue");
    if (value && value.textContent) {
      try { await navigator.clipboard.writeText(value.textContent); setStatus("Kod skopiowany!"); }
      catch (e) { setStatus("Blad kopiowania.", true); }
    }
  });
  if (codesContainer) {
    codesContainer.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const action = button.getAttribute("data-action");
      const id = button.getAttribute("data-id");
      if (!id) return;
      if (action === "delete") await deleteCode(id);
      else if (action === "copy") await copyCode(id);
    });
  }
}

bindEvents();
authenticate();
