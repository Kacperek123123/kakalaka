/**
 * Activation Page - Discord OAuth + Firebase Code Validation
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
const DISCORD_CLIENT_ID = "1530688923137999051";

// ⚠️ WAŻNE: W Discord Developer Portal → OAuth2 → Redirects dodaj:
// https://dizxurtzew.cfolks.pl/activate.html
const REDIRECT_URI = window.location.origin + "/activate.html";

// ===================== Helpers =====================
function $(id) { return document.getElementById(id); }

function normalizeCode(value) {
  return (value || "").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
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
    state: state,
    prompt: "none"
  });
  return "https://discord.com/api/oauth2/authorize?" + params.toString();
}

function parseDiscordTokenFromURL() {
  var hash = window.location.hash.substring(1);
  if (!hash) return null;
  var params = new URLSearchParams(hash);
  var token = params.get("access_token");
  var state = params.get("state");
  var savedState = sessionStorage.getItem("discord_oauth_state");
  if (state && savedState && state !== savedState) {
    console.warn("[Activate] OAuth state mismatch");
    sessionStorage.removeItem("discord_oauth_state");
    return null;
  }
  sessionStorage.removeItem("discord_oauth_state");
  if (token) {
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

// ===================== State =====================

function getState() {
  try {
    var stored = JSON.parse(localStorage.getItem("activate_state") || "{}") || {};
    return {
      discordName: stored.discordName || "",
      discordAvatar: stored.discordAvatar || "",
      activated: localStorage.getItem("activated") === "true",
      plan: stored.plan || "basic",
      deviceName: stored.deviceName || ""
    };
  } catch (_) {
    return { discordName: "", discordAvatar: "", activated: false, plan: "basic", deviceName: "" };
  }
}

function saveState(update) {
  try {
    var current = getState();
    var merged = Object.assign({}, current, update);
    localStorage.setItem("activate_state", JSON.stringify({
      discordName: merged.discordName,
      discordAvatar: merged.discordAvatar,
      plan: merged.plan,
      deviceName: merged.deviceName
    }));
    if (merged.activated) {
      localStorage.setItem("activated", "true");
    } else {
      localStorage.removeItem("activated");
    }
    return merged;
  } catch (_) {}
}

// ===================== UI =====================

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
  if (btn) { btn.disabled = busy; btn.textContent = busy ? "Aktywuję…" : "Aktywuj aplikację"; }
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
    var initial = state.discordName.charAt(0).toUpperCase();
    if (avatar) {
      if (state.discordAvatar) {
        avatar.innerHTML = '<img src="' + state.discordAvatar + '" style="width:44px;height:44px;border-radius:50%;object-fit:cover" alt="">';
      } else {
        avatar.textContent = initial;
      }
    }
    if (name) name.textContent = state.discordName;
    if (status) { status.textContent = "Połączono przez Discord"; status.style.color = "#86efac"; }
    if (btn) { btn.textContent = "Rozłącz"; btn.onclick = disconnectDiscord; }
  } else {
    if (avatar) avatar.textContent = "U";
    if (name) name.textContent = "Konto Discord";
    if (status) { status.textContent = "Nie połączono"; status.style.color = ""; }
    if (btn) { btn.textContent = "Połącz przez Discord"; btn.onclick = loginDiscord; }
  }
}

function renderPackages(state) {
  var list = $("appList");
  if (!list) return;
  var apps = [
    { name: "Basic", desc: "Podstawowy pakiet startowy.", plan: "basic" },
    { name: "Premium", desc: "Rozszerzone funkcje i pelny dostep.", plan: "premium" }
  ];
  list.innerHTML = apps.map(function (a) {
    var active = state.activated && state.plan === a.plan;
    var icon = a.plan === "premium" ? "\u2605" : "\u25CF";
    return '<div class="app-card' + (active ? " active" : "") + '">' +
      '<div class="app-copy">' +
        '<div class="app-icon">' + icon + '</div>' +
        '<div><h4>' + a.name + '</h4><p>' + a.desc + '</p></div>' +
      '</div>' +
      '<span class="app-badge">' + (active ? "Aktywny" : "Dostepny") + '</span>' +
    '</div>';
  }).join("");
}

function renderAll() {
  var state = getState();
  renderDiscordUI(state);
  renderPackages(state);
  var sel = $("planSelect");
  if (sel && state.plan) sel.value = state.plan;
  var dev = $("deviceLabelInput");
  if (dev && state.deviceName) dev.value = state.deviceName;
  if (state.activated) {
    setStatus("success", "Aktywacja zakonczona!", "Pakiet " + (state.plan === "premium" ? "Premium" : "Basic") + " jest aktywny.");
  } else if (state.discordName) {
    setStatus("idle", "Konto Discord polaczone", "Teraz wpisz klucz aktywacyjny.");
  } else {
    setStatus("idle", "Witaj w xObywatel", "Zaloguj sie przez Discord, aby kontynuowac.");
  }
}

// ===================== Discord Actions =====================

function loginDiscord() {
  window.location.href = getDiscordLoginURL();
}

function disconnectDiscord() {
  localStorage.removeItem("activate_state");
  renderAll();
  setStatus("idle", "Rozlaczono Discord", "Zaloguj sie ponownie.");
}

async function tryDiscordAuth() {
  var token = parseDiscordTokenFromURL();
  if (!token) token = sessionStorage.getItem("discord_token");
  if (!token) return;
  var user = await fetchDiscordUser(token);
  if (!user) {
    sessionStorage.removeItem("discord_token");
    return;
  }
  sessionStorage.setItem("discord_token", token);
  var avatarURL = user.avatar ? "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".png?size=64" : "";
  saveState({
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
  if (!state.discordName) {
    showError("Najpierw zaloguj sie przez Discord.");
    setStatus("error", "Wymagane logowanie", "Kliknij 'Polacz przez Discord'.");
    return;
  }
  setBusy(true);
  var key = ($("adminKeyInput")?.value || "").trim();
  var nick = ($("deviceLabelInput")?.value || "").trim();
  var plan = ($("planSelect")?.value || "basic");
  if (!key || !nick) {
    setBusy(false);
    showError("Uzupelnij klucz i nazwe urzadzenia.");
    return;
  }
  if (!db) {
    setBusy(false);
    showError("Brak polaczenia z baza danych.");
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
          showError("Ten klucz zostal juz wykorzystany.");
          setStatus("error", "Kod nieaktywny", "Ten klucz jest juz przypisany.");
          setBusy(false);
          return;
        }
        if (data.plan && data.plan !== plan) {
          showError("Wybrany pakiet nie pasuje do tego klucza.");
          setStatus("error", "Niezgodny plan", "Wybierz pakiet zgodny z kodem.");
          setBusy(false);
          return;
        }
        await updateDoc(doc(db, "codes", docSnap.id), {
          nick: nick,
          used: true,
          usedAt: new Date().toISOString(),
          plan: plan,
          deviceName: nick,
          activatedAt: new Date().toISOString(),
          discordName: state.discordName || "",
          status: "active"
        });
        saveAuth(plan, nick, state.discordName);
        saveState({ activated: true, plan: plan, deviceName: nick });
        showActivationSuccess(plan);
        found = true;
        break;
      }
    }
    if (!found) {
      showError("Nieprawidlowy klucz aktywacyjny.");
      setStatus("error", "Klucz nieznany", "Sprawdz poprawnosc kodu.");
    }
  } catch (error) {
    console.error(error);
    showError("Blad polaczenia. Sprobuj ponownie.");
    setStatus("error", "Problem z aktywacja", "Nie udalo sie polaczyc.");
  } finally {
    setBusy(false);
  }
}

// ===================== IndexedDB =====================

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

// ===================== Success Screen =====================

function showActivationSuccess(plan) {
  var wrap = document.querySelector(".wrap");
  if (!wrap) return;
  var planLabel = plan === "premium" ? "Premium" : "Basic";
  wrap.innerHTML = '' +
    '<div class="hdr">' +
      '<div class="hdr-icon">\u2705</div>' +
      '<h1>Aplikacja aktywna</h1>' +
      '<span class="pill" style="background:rgba(34,197,94,0.12);color:#86efac">' + planLabel + '</span>' +
    '</div>' +
    '<div class="card" style="text-align:center">' +
      '<div style="font-size:48px;margin-bottom:12px">\uD83C\uDF89</div>' +
      '<div class="card-title" style="font-size:20px">Aktywacja zakonczona!</div>' +
      '<div class="card-sub" style="margin-bottom:6px">Pakiet <strong>' + planLabel + '</strong> jest aktywny.</div>' +
      '<div class="card-sub" style="font-size:12px;margin-bottom:18px">Mozesz przejsc do dokumentow lub edytowac profil.</div>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<a class="btn btn-pri btn-block" href="login.html" style="padding:14px;font-size:15px">\uD83D\uDCC4 Przejdz do dokumentow</a>' +
        '<a class="btn btn-sec btn-block" href="profiledata.html" style="padding:14px;font-size:15px">\uD83D\uDC64 Edytuj profil</a>' +
      '</div>' +
      '<div style="margin-top:16px;padding:12px;border-radius:10px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.12);font-size:12px;color:#86efac;text-align:left">' +
        '<strong>\u2139\ufe0f Wazne:</strong> Przy kazdym kolejnym uruchomieniu aplikacja otworzy sie na ekranie logowania.' +
      '</div>' +
    '</div>';
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
