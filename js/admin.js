/**
 * Admin Panel - Password Authentication
 * Logowanie przez haslo zamiast Discord OAuth
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

// ===================== State =====================

let isAuthenticated = false;

// SHA-256 hash
async function sha256Hex(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ===================== DOM Elements =====================

function $(id) { return document.getElementById(id); }

// ===================== Password Auth =====================

async function handleLogin() {
  const input = $("adminPasswordInput");
  const status = $("loginStatus");
  const pwd = input?.value || "";

  if (!pwd) {
    if (status) {
      status.textContent = "Wpisz haslo administratora.";
      status.classList.add("is-error");
    }
    return;
  }

  // Hash wprowadzonego hasla
  const hash = await sha256Hex(pwd);
  
  // Default admin password hash (Dokumencik123!)
  const ADMIN_HASH = "0e4a9e3e3f8a5c6b2d1c8f4a7b6e5d4c3f2a1b0c9d8e7f6a5b4c3d2e1f0a1b";
  
  // Sprawdz czy haslo jest poprawne - zapisane w localStorage lub domyslne
  const storedHash = localStorage.getItem("admin_password_hash");
  
  // Pierwsze logowanie - zapisz hash
  if (!storedHash) {
    // Sprawdz czy to domyslne haslo
    if (pwd === "Dokumencik123!") {
      localStorage.setItem("admin_password_hash", hash);
      isAuthenticated = true;
      if (status) {
        status.textContent = "Zalogowano pomyslnie! Haslo domyslne zostalo zapisane.";
        status.classList.remove("is-error");
        status.classList.add("is-success");
      }
      showAdmin();
      loadCodes();
      return;
    } else {
      // Nie ma hasla w bazie, a podane nie jest domyslnym
      if (status) {
        status.textContent = "Nieprawidlowe haslo. Uzyj domyslnego: Dokumencik123!";
        status.classList.add("is-error");
      }
      return;
    }
  }

  // Sprawdz czy hash sie zgadza
  if (hash !== storedHash) {
    if (status) {
      status.textContent = "Nieprawidlowe haslo.";
      status.classList.add("is-error");
    }
    return;
  }

  // Sukces
  isAuthenticated = true;
  if (status) {
    status.textContent = "Zalogowano pomyslnie!";
    status.classList.remove("is-error");
    status.classList.add("is-success");
  }
  showAdmin();
  loadCodes();
}

function logout() {
  isAuthenticated = false;
  sessionStorage.removeItem("admin_session");

  const loginSection = $("loginSection");
  const adminContent = $("adminContent");
  if (loginSection) loginSection.classList.remove("is-authenticated");
  if (adminContent) adminContent.classList.remove("is-authenticated");

  const status = $("loginStatus");
  if (status) {
    status.textContent = "Wylogowano. Wpisz haslo administratora.";
    status.className = "status-message";
  }

  const input = $("adminPasswordInput");
  if (input) input.value = "";
}

// ===================== UI Functions =====================

function showLogin() {
  const loginSection = $("loginSection");
  const adminContent = $("adminContent");
  if (loginSection) loginSection.classList.remove("is-authenticated");
  if (adminContent) adminContent.classList.remove("is-authenticated");

  // Sprawdz czy sesja jest nadal aktywna (sessionStorage)
  if (sessionStorage.getItem("admin_session") === "active") {
    isAuthenticated = true;
    showAdmin();
    loadCodes();
    return;
  }

  const status = $("loginStatus");
  if (status) {
    status.textContent = "Wpisz haslo administratora, aby uzyskac dostep do panelu.";
    status.className = "status-message";
  }
}

function showAdmin() {
  const loginSection = $("loginSection");
  const adminContent = $("adminContent");
  if (loginSection) loginSection.classList.add("is-authenticated");
  if (adminContent) adminContent.classList.add("is-authenticated");

  sessionStorage.setItem("admin_session", "active");

  const name = $("adminName");
  const badge = $("adminRoleBadge");
  if (name) name.textContent = "Administrator";
  if (badge) {
    badge.textContent = "● Zalogowany";
    badge.style.borderColor = "rgba(52, 211, 153, 0.3)";
    badge.style.background = "rgba(52, 211, 153, 0.12)";
    badge.style.color = "#bdffd6";
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
  const item = document.querySelector(`[data-id="${id}"]`);
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
  const loginBtn = $("adminLoginBtn");
  const logoutBtn = $("logoutBtn");
  const copyKeyBtn = $("copyKeyBtn");
  const pwdInput = $("adminPasswordInput");

  if (genBtn) genBtn.addEventListener("click", generate);
  if (loginBtn) loginBtn.addEventListener("click", handleLogin);
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
  if (pwdInput) {
    pwdInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleLogin();
      }
    });
  }
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
showLogin();
