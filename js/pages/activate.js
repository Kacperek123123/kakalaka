/**
 * Activation Page - Discord OAuth + Firebase Code Validation
 * Kolejność: Zaloguj przez Discord → Wpisz klucz → Aktywuj
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===================== Firebase Config =====================

const firebaseConfig = {
  apiKey: "AIzaSyCJVQfa4qwlSw6N2pld1Kji6bBMq9Kdg-8",
  authDomain: "arcynek.firebaseapp.com",
  projectId: "arcynek",
  storageBucket: "arcynek.firebasestorage.app",
  messagingSenderId: "168374544632",
  appId: "1:168374544632:web:21872f0ec62b32aaebf30d",
};

let app = null;
let db = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase init failed", error);
}

// ===================== Discord OAuth Config =====================
// UWAGA: ZAREJESTRUJ SWOJĄ APLIKACJĘ DISCORD I WSTAW CLIENT ID TUTAJ!
const DISCORD_CLIENT_ID = "1530688923137999051";
const REDIRECT_URI = window.location.origin + "/activate.html";

// ===================== Helpers =====================

function $(id) { return document.getElementById(id); }

function normalizeCode(value) {
  return (value || "").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getPlanMeta(plan) {
  return plan === "premium"
    ? { key: "premium", label: "Premium", description: "Rozszerzone funkcje i pełne doświadczenie." }
    : { key: "basic", label: "Basic", description: "Szybki start z podstawowymi możliwościami." };
}

// ===================== Discord OAuth =====================

function getDiscordLoginURL() {
  var state = btoa(JSON.stringify({ t: Date.now(), r: Math.random().toString(36).substring(2) }));
  sessionStorage.setItem("discord_oauth_state", state);

  var params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "token",
    scope: "identify",
    state: state
  });

  return "https://discord.com/api/oauth2/authorize?" + params.toString();
}

function parseDiscordTokenFromURL() {
  var hash = window.location.hash.substring(1);
  if (!hash) return null;

  var params = new URLSearchParams(hash);
  var token = params.get("access_token");
  var state = params.get("state");

  // Weryfikacja state (CSRF protection)
  var savedState = sessionStorage.getItem("discord_oauth_state");
  if (state && savedState && state !== savedState) {
    console.warn("[Activate] OAuth state mismatch");
    sessionStorage.removeItem("discord_oauth_state");
    return null;
  }
  sessionStorage.removeItem("discord_oauth_state");

  if (token) {
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  return token;
}

async function fetchDiscordUser(token) {
  try {
    var res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: "Bearer " + token }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// ===================== State Management =====================

function getState() {
  try {
    var stored = JSON.parse(localStorage.getItem("activate_state") || "{}") || {};
    return {
      discordToken: stored.discordToken || sessionStorage.getItem("discord_token") || "",
      discordUser: stored.discordUser || null,
      discordName: stored.discordName || "",
      discordAvatar: stored.discordAvatar || "",
      activated: localStorage.getItem("activated") === "true",
      plan: stored.plan || "basic",
      deviceName: stored.deviceName || ""
    };
  } catch (_) {
    return { discordToken: "", discordUser: null, discordName: "", discordAvatar: "", activated: false, plan: "basic", deviceName: "" };
  }
}

function saveState(update) {
  try {
    var current = getState();
    var merged = Object.assign({}, current, update);

    // Zapisz token w sessionStorage (bezpieczniej niż localStorage)
    if (merged.discordToken) {
      sessionStorage.setItem("discord_token", merged.discordToken);
    }

    // Do localStorage tylko dane nie-wrażliwe
    localStorage.setItem("activate_state", JSON.stringify({
      discordName: merged.discordName,
      discordAvatar: merged.discordAvatar,
      discordUser: merged.discordUser ? { id: merged.discordUser.id, username: merged.discordUser.username } : null,
      plan: merged.plan,
      deviceName: merged.deviceName
    }));

    // activated w osobnym kluczu dla pwa-gate
    if (merged.activated) {
      localStorage.setItem("activated", "true");
    } else {
      localStorage.removeItem("activated");
    }

    return merged;
  } catch (_) {}
}

// ===================== UI Updates =====================

function setStatus(type, title, message) {
  var card = $("activationStatusCard");
  var titleEl = $("activationStatusTitle");
  var textEl = $("activationStatusText");
  if (!card || !titleEl || !textEl) return;

  card.className = "st-card";
  if (type === "success") card.classList.add("good");
  else if (type === "error") card.classList.add("bad");

  titleEl.textContent = title;
  textEl.textContent = message;
}

function showError(message) {
  var err = $("keyError");
  if (!err) return;
  err.textContent = message;
  err.classList.add("show");
}

function clearError() {
  var err = $("keyError");
  if (!err) return;
  err.textContent = "";
  err.classList.remove("show");
}

function setBusy(busy) {
  var btn = $("activateSubmitButton");
  var key = $("adminKeyInput");
  var dev = $("deviceLabelInput");
  var sel = $("planSelect");
  var paste = $("pasteButton");

  if (btn) { btn.disabled = busy; btn.textContent = busy ? "Aktywuję…" : "Aktywuj"; }
  if (key) key.disabled = busy;
  if (dev) dev.disabled = busy;
  if (sel) sel.disabled = busy;
  if (paste) paste.disabled = busy;
}

function renderDiscordUI(state) {
  var avatar = $("discordAvatar");
  var name = $("discordName");
  var status = $("discordStatus");
  var btn = $("discordLoginBtn");

  if (state.discordName) {
    // Zalogowany
    var initial = state.discordName.charAt(0).toUpperCase();
    if (avatar) {
      if (state.discordAvatar) {
        avatar.innerHTML = '<img src="' + state.discordAvatar + '" style="width:44px;height:44px;border-radius:50%;object-fit:cover" alt="">';
      } else {
        avatar.textContent = initial;
      }
    }
    if (name) name.textContent = state.discordName;
    if (status) { status.textContent = "✅ Połączono przez Discord"; status.style.color = "#86efac"; }
    if (btn) { btn.textContent = "Rozłącz"; btn.onclick = disconnectDiscord; }
  } else {
    // Niezalogowany
    if (avatar) { avatar.innerHTML = "U"; avatar.style.background = ""; }
    if (name) name.textContent = "Konto Discord";
    if (status) { status.textContent = "Nie połączono"; status.style.color = ""; }
    if (btn) { btn.textContent = "Połącz"; btn.onclick = loginDiscord; }
  }
}

function renderPackages(state) {
  var list = $("appList");
  if (!list) return;

  var apps = [
    { name: "Basic", desc: "Podstawowy pakiet startowy.", plan: "basic" },
    { name: "Premium", desc: "Rozszerzone funkcje i pełny dostęp.", plan: "premium" }
  ];

  list.innerHTML = apps.map(function (a) {
    var active = state.activated && state.plan === a.plan;
    var icon = a.plan === "premium" ? "★" : "●";
    return '<div class="app-card' + (active ? " active" : "") + '">' +
      '<div class="app-copy">' +
        '<div class="app-icon">' + icon + '</div>' +
        '<div><h4>' + a.name + '</h4><p>' + a.desc + '</p></div>' +
      '</div>' +
      '<span class="app-badge">' + (active ? "Aktywny" : "Dostępny") + '</span>' +
    '</div>';
  }).join("");
}

function renderAll() {
  var state = getState();
  renderDiscordUI(state);
  renderPackages(state);

  // Ustaw select
  var sel = $("planSelect");
  if (sel && state.plan) sel.value = state.plan;

  var dev = $("deviceLabelInput");
  if (dev && state.deviceName) dev.value = state.deviceName;

  // Status
  if (state.activated) {
    setStatus("success", "Aktywacja zakończona!", "Pakiet " + (state.plan === "premium" ? "Premium" : "Basic") + " jest aktywny.");
  } else if (state.discordName) {
    setStatus("idle", "Konto Discord połączone", "Teraz wpisz klucz aktywacyjny i wybierz pakiet.");
  } else {
    setStatus("idle", "Witaj w xObywatel", "Zaloguj się przez Discord, aby kontynuować.");
  }
}

// ===================== Discord Actions =====================

function loginDiscord() {
  window.location.href = getDiscordLoginURL();
}

function disconnectDiscord() {
  var token = sessionStorage.getItem("discord_token");

  // Revoke token
  if (token) {
    fetch("https://discord.com/api/v10/oauth2/token/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: token, client_id: DISCORD_CLIENT_ID })
    }).catch(function () {});
  }

  sessionStorage.removeItem("discord_token");
  localStorage.removeItem("activate_state");
  renderAll();
  setStatus("idle", "Rozłączono Discord", "Zaloguj się ponownie, aby kontynuować.");
}

async function tryDiscordAuth() {
  // Sprawdź czy mamy token w URL (OAuth redirect)
  var token = parseDiscordTokenFromURL();

  if (!token) {
    // Sprawdź czy mamy token w session
    token = sessionStorage.getItem("discord_token");
  }

  if (!token) return;

  // Pobierz dane użytkownika
  var user = await fetchDiscordUser(token);
  if (!user) {
    sessionStorage.removeItem("discord_token");
    return;
  }

  var avatarURL = user.avatar
    ? "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".png"
    : "";

  saveState({
    discordToken: token,
    discordUser: user,
    discordName: user.global_name || user.username,
    discordAvatar: avatarURL
  });

  renderAll();
  setStatus("success", "Zalogowano jako " + (user.global_name || user.username), "Teraz wpisz klucz aktywacyjny.");
}

// ===================== Activation =====================

async function handleActivate(event) {
  event.preventDefault();
  clearError();

  var state = getState();

  // Krok 1: Sprawdź czy zalogowany przez Discord
  if (!state.discordName) {
    showError("Najpierw zaloguj się przez Discord.");
    setStatus("error", "Wymagane logowanie", "Kliknij 'Połącz' obok konta Discord.");
    return;
  }

  setBusy(true);

  var keyInput = $("adminKeyInput");
  var deviceInput = $("deviceLabelInput");
  var planSelect = $("planSelect");

  var key = (keyInput?.value || "").trim();
  var nick = (deviceInput?.value || "").trim();
  var plan = planSelect?.value || "basic";

  if (!key || !nick) {
    setBusy(false);
    showError("Uzupełnij klucz i nazwę urządzenia.");
    setStatus("error", "Brak danych", "Wprowadź klucz aktywacyjny i nazwę urządzenia.");
    return;
  }

  if (!db) {
    setBusy(false);
    showError("Brak połączenia z bazą danych.");
    setStatus("error", "Błąd systemu", "Spróbuj ponownie za chwilę.");
    return;
  }

  try {
    var normalizedKey = normalizeCode(key);
    var snapshot = await getDocs(collection(db, "codes"));
    var found = false;

    for (var docSnap of snapshot.docs) {
      var data = docSnap.data();
      if (normalizeCode(data.code) === normalizedKey) {
        found = true;

        if (data.used === true) {
          showError("Ten klucz został już wykorzystany.");
          setStatus("error", "Kod nieaktywny", "Ten klucz jest już przypisany do innego urządzenia.");
          setBusy(false);
          return;
        }

        if (data.plan && data.plan !== plan) {
          showError("Wybrany pakiet nie pasuje do tego klucza.");
          setStatus("error", "Niezgodny plan", "Wybierz pakiet zgodny z kodem.");
          setBusy(false);
          return;
        }

        // Aktywuj!
        await updateDoc(doc(db, "codes", docSnap.id), {
          nick: nick,
          used: true,
          usedAt: new Date().toISOString(),
          plan: plan,
          deviceName: nick,
          activatedAt: new Date().toISOString(),
          discordId: state.discordUser?.id || "",
          discordName: state.discordName || "",
          status: "active"
        });

        // Zapisz auth w IndexedDB
        saveAuth(plan, nick, state.discordName);

        saveState({ activated: true, plan: plan, deviceName: nick });
        renderAll();
        showActivationSuccess(plan);

        break;
      }
    }

    if (!found) {
      showError("Nieprawidłowy klucz aktywacyjny.");
      setStatus("error", "Klucz nieznany", "Sprawdź poprawność kodu i spróbuj ponownie.");
    }
  } catch (error) {
    console.error(error);
    showError("Błąd połączenia. Spróbuj ponownie.");
    setStatus("error", "Problem z aktywacją", "Nie udało się połączyć z usługą aktywacyjną.");
  } finally {
    setBusy(false);
  }
}

// ===================== IndexedDB Auth Save =====================

function saveAuth(plan, deviceName, discordName) {
  var request = indexedDB.open("obywatel_auth", 1);

  request.onupgradeneeded = function (event) {
    var dbRef = event.target.result;
    if (!dbRef.objectStoreNames.contains("auth_state")) {
      dbRef.createObjectStore("auth_state");
    }
  };

  request.onsuccess = function (event) {
    var dbRef = event.target.result;
    var tx = dbRef.transaction("auth_state", "readwrite");
    var store = tx.objectStore("auth_state");

    store.put({
      refreshToken: "OK",
      activated: true,
      plan: plan,
      deviceName: deviceName,
      discordName: discordName
    }, "auth_state");

    tx.oncomplete = function () {
      localStorage.setItem("activated", "true");
      localStorage.setItem("profile_completed", "true");
      localStorage.setItem("activation_plan", plan);
      sessionStorage.setItem("auth_validated", "true");
    };
  };
}

// ===================== Activation Success Screen =====================

function showActivationSuccess(plan) {
  var wrap = document.querySelector(".wrap");
  if (!wrap) return;

  var planLabel = plan === "premium" ? "Premium" : "Basic";
  var planIcon = plan === "premium" ? "⭐" : "●";

  wrap.innerHTML = `
    <!-- Header -->
    <div class="hdr">
      <div class="hdr-icon">✅</div>
      <h1>Aplikacja aktywna</h1>
      <span class="pill pill--success">${planLabel}</span>
    </div>

    <!-- Success card -->
    <div class="card" style="text-align:center">
      <div style="font-size:48px;margin-bottom:12px">🎉</div>
      <div class="card-title" style="font-size:20px">Aktywacja zakończona!</div>
      <div class="card-sub" style="margin-bottom:6px">
        Pakiet <strong>${planLabel}</strong> jest teraz aktywny na tym urządzeniu.
      </div>
      <div class="card-sub" style="font-size:12px;margin-bottom:18px">
        Możesz teraz przejść do dokumentów lub edytować swój profil.
      </div>

      <div style="display:flex;flex-direction:column;gap:10px">
        <a class="btn btn-pri btn-block" href="login.html" style="padding:14px 18px;font-size:15px">
          📄 Przejdź do dokumentów
        </a>
        <a class="btn btn-sec btn-block" href="profiledata.html" style="padding:14px 18px;font-size:15px">
          👤 Edytuj profil
        </a>
      </div>

      <div style="margin-top:16px;padding:12px;border-radius:10px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.12);font-size:12px;color:#86efac;text-align:left">
        <strong>ℹ️ Ważne:</strong> Po kliknięciu "Przejdź do dokumentów" zostaniesz poproszony o ustawienie hasła. Przy każdym kolejnym uruchomieniu aplikacja będzie otwierać się bezpośrednio na ekranie logowania.
      </div>
    </div>
  `;

  // Dodaj style dla nowego pill-a
  var style = document.createElement("style");
  style.textContent = ".pill--success{background:rgba(34,197,94,0.12);color:#86efac}";
  document.head.appendChild(style);
}

// ===================== Events =====================

function bindEvents() {
  var form = $("activateForm");
  var pasteBtn = $("pasteButton");
  var planSelect = $("planSelect");
  var discordBtn = $("discordLoginBtn");

  if (form) form.addEventListener("submit", handleActivate);

  if (pasteBtn) {
    pasteBtn.addEventListener("click", async function () {
      try {
        var text = await navigator.clipboard.readText();
        var input = $("adminKeyInput");
        if (input) input.value = text.trim();
      } catch (_) {}
    });
  }

  if (planSelect) {
    planSelect.addEventListener("change", function () {
      saveState({ plan: planSelect.value });
      renderPackages(getState());
    });
  }

  // Discord button handler
  if (discordBtn) {
    discordBtn.addEventListener("click", function () {
      var state = getState();
      if (state.discordName) {
        disconnectDiscord();
      } else {
        loginDiscord();
      }
    });
  }
}

// ===================== Init =====================

document.addEventListener("DOMContentLoaded", function () {
  bindEvents();
  tryDiscordAuth().then(function () {
    renderAll();
  });
});

