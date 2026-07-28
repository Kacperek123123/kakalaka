import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

function normalizeCode(value) {
  return (value || "").toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getPlanMeta(plan = "basic") {
  return plan === "premium"
    ? {
        key: "premium",
        label: "Premium",
        description: "Rozszerzone funkcje i pełne doświadczenie dla klienta.",
      }
    : {
        key: "basic",
        label: "Basic",
        description: "Szybki start z podstawowymi możliwościami aplikacji.",
      };
}

function getPanelState() {
  try {
    const stored = JSON.parse(localStorage.getItem("panel_state") || "{}") || {};
    return {
      activated: localStorage.getItem("activated") === "true",
      discordName: stored.discordName || "Discord user",
      discordStatus: stored.discordStatus || "Nie połączono jeszcze",
      plan: stored.plan || "basic",
      deviceName: stored.deviceName || "",
    };
  } catch (_) {
    return {
      activated: false,
      discordName: "Discord user",
      discordStatus: "Nie połączono jeszcze",
      plan: "basic",
      deviceName: "",
    };
  }
}

function savePanelState(nextState = {}) {
  const current = getPanelState();
  const state = { ...current, ...nextState };
  localStorage.setItem("panel_state", JSON.stringify(state));
  return state;
}

function setStatus(type, title, message) {
  const card = document.getElementById("activationStatusCard");
  const titleEl = document.getElementById("activationStatusTitle");
  const textEl = document.getElementById("activationStatusText");

  if (!card || !titleEl || !textEl) return;

  card.classList.remove("is-success", "is-error");
  if (type === "success") {
    card.classList.add("is-success");
  } else if (type === "error") {
    card.classList.add("is-error");
  }

  titleEl.textContent = title;
  textEl.textContent = message;
}

function showError(message) {
  const error = document.getElementById("keyError");
  if (!error) return;
  error.textContent = message;
  error.classList.add("show");
}

function clearError() {
  const error = document.getElementById("keyError");
  if (!error) return;
  error.textContent = "";
  error.classList.remove("show");
}

function setFormBusy(isBusy) {
  const button = document.getElementById("activateSubmitButton");
  const keyInput = document.getElementById("adminKeyInput");
  const deviceInput = document.getElementById("deviceLabelInput");
  const planInput = document.getElementById("planSelect");
  const pasteButton = document.getElementById("pasteButton");

  if (button) {
    button.disabled = isBusy;
    button.textContent = isBusy ? "Aktywuję…" : "Aktywuj aplikację";
  }

  if (keyInput) keyInput.disabled = isBusy;
  if (deviceInput) deviceInput.disabled = isBusy;
  if (planInput) planInput.disabled = isBusy;
  if (pasteButton) pasteButton.disabled = isBusy;
}

function renderPanel() {
  const state = getPanelState();
  const avatar = document.getElementById("discordAvatar");
  const name = document.getElementById("discordName");
  const status = document.getElementById("discordStatus");
  const appList = document.getElementById("appList");
  const deviceInput = document.getElementById("deviceLabelInput");
  const planSelect = document.getElementById("planSelect");
  const planMeta = getPlanMeta(state.plan);

  if (avatar) {
    const initial = (state.discordName || "U").trim().charAt(0).toUpperCase() || "U";
    avatar.textContent = initial;
  }

  if (name) {
    name.textContent = state.discordName || "Discord user";
  }

  if (status) {
    status.textContent = state.discordStatus || "Nie połączono jeszcze";
  }

  if (deviceInput) {
    deviceInput.value = state.deviceName || "";
  }

  if (planSelect && state.plan) {
    planSelect.value = state.plan;
  }

  if (appList) {
    const apps = [
      {
        name: "Dokument Basic",
        desc: "Pakiet podstawowy dla szybkiego startu i prostego dostępu.",
        plan: "basic",
      },
      {
        name: "Dokument Premium",
        desc: "Rozszerzone funkcje, lepsza personalizacja i pełniejsze doświadczenie.",
        plan: "premium",
      },
    ];

    appList.innerHTML = apps
      .map((app) => {
        const active = state.plan === app.plan;
        const icon = app.plan === "premium" ? "★" : "•";
        return `
          <div class="app-card ${active ? "active" : ""}">
            <div class="app-copy">
              <div class="app-icon">${icon}</div>
              <div>
                <h4>${app.name}</h4>
                <p>${app.desc}</p>
              </div>
            <span class="app-badge ${active ? "active" : ""}">${active ? "Aktywny" : "Dostępny"}</span>
          </div>
        `;
      })
      .join("");
  }

  const card = document.getElementById("activationStatusCard");
  if (card && !card.classList.contains("is-success") && !card.classList.contains("is-error")) {
    const statusTitle = document.getElementById("activationStatusTitle");
    const statusText = document.getElementById("activationStatusText");
    if (statusTitle && statusText) {
      statusTitle.textContent = `Wariant ${planMeta.label}`;
      statusText.textContent = `${planMeta.description} Zaczynasz od wyboru klucza i urządzenia.`;
    }
  }
}

function saveAuth(plan, deviceName, discordName) {
  const request = indexedDB.open("obywatel_auth", 1);

  request.onupgradeneeded = function (event) {
    const dbRef = event.target.result;
    if (!dbRef.objectStoreNames.contains("auth_state")) {
      dbRef.createObjectStore("auth_state");
    }
  };

  request.onsuccess = function (event) {
    const dbRef = event.target.result;
    const tx = dbRef.transaction("auth_state", "readwrite");
    const store = tx.objectStore("auth_state");

    store.put(
      {
        refreshToken: "OK",
        activated: true,
        plan,
        deviceName,
      },
      "auth_state"
    );

    tx.oncomplete = function () {
      localStorage.setItem("activated", "true");
      localStorage.setItem("profile_completed", "true");
      localStorage.setItem("activation_plan", plan);
      sessionStorage.setItem("auth_validated", "true");

      savePanelState({
        activated: true,
        plan,
        deviceName,
        discordName: discordName || getPanelState().discordName,
        discordStatus: "Połączono i aktywowane",
      });

      renderPanel();
      setStatus("success", "Aktywacja zakończona", `Pakiet ${getPlanMeta(plan).label} jest gotowy. Przekierowujemy Cię do panelu.`);

      // Przekieruj do admin.html zamiast login.html
      window.setTimeout(() => {
        window.location.assign("admin.html");
      }, 900);
    };
  };

  request.onerror = function () {
    setStatus("error", "Błąd zapisu aktywacji", "Nie udało się zapisać stanu aktywacji w pamięci urządzenia.");
  };
}

function openDiscordModal() {
  const modal = document.getElementById("discordModal");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  const input = document.getElementById("discordNameInput");
  if (input) {
    input.value = getPanelState().discordName || "";
    requestAnimationFrame(() => input.focus());
  }
}

function closeDiscordModal() {
  const modal = document.getElementById("discordModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function connectDiscord() {
  openDiscordModal();
}

function bindEvents() {
  const form = document.getElementById("activateForm");
  const pasteBtn = document.getElementById("pasteButton");
  const discordBtn = document.getElementById("discordLoginBtn");
  const discordForm = document.getElementById("discordForm");
  const modal = document.getElementById("discordModal");
  const planSelect = document.getElementById("planSelect");

  if (planSelect) {
    planSelect.addEventListener("change", () => {
      savePanelState({ plan: planSelect.value });
      renderPanel();
    });
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearError();
      setFormBusy(true);

      const keyInput = document.getElementById("adminKeyInput");
      const deviceInput = document.getElementById("deviceLabelInput");

      const key = (keyInput?.value || "").trim();
      const nick = (deviceInput?.value || "").trim();
      const plan = planSelect?.value || "basic";
      const state = getPanelState();
      const normalizedKey = normalizeCode(key);

      if (!normalizedKey || !nick) {
        setFormBusy(false);
        showError("Uzupełnij klucz i nazwę urządzenia.");
        setStatus("error", "Brak danych", "Wprowadź klucz aktywacyjny i nazwę urządzenia, aby kontynuować.");
        return;
      }

      try {
        if (!db) {
          throw new Error("Firebase unavailable");
        }

        const snapshot = await getDocs(collection(db, "codes"));
        let found = false;

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          if (normalizeCode(data.code) === normalizedKey) {
            found = true;

            if (data.used === true) {
              showError("Ten klucz został już wykorzystany.");
              setStatus("error", "Kod nieaktywny", "Ten klucz jest już przypisany do innego urządzenia.");
              setFormBusy(false);
              return;
            }

            if (data.plan && data.plan !== plan) {
              showError("Wybrany wariant nie pasuje do tego klucza.");
              setStatus("error", "Niezgodny plan", "Wybierz wariant zgodny z kodem aktywacyjnym.");
              setFormBusy(false);
              return;
            }

            await updateDoc(doc(db, "codes", docSnap.id), {
              nick,
              used: true,
              usedAt: new Date().toISOString(),
              plan,
              deviceName: nick,
              activatedAt: new Date().toISOString(),
              discordName: state.discordName || "",
              status: "active",
            });

            saveAuth(plan, nick, state.discordName || "Discord user");
            setFormBusy(false);
            return;
          }
        }

        if (!found) {
          showError("Nieprawidłowy klucz aktywacyjny.");
          setStatus("error", "Klucz nieznany", "Sprawdź poprawność kodu i spróbuj ponownie.");
          setFormBusy(false);
        }
      } catch (error) {
        console.error(error);
        showError("Błąd połączenia z bazą lub aktywacji. Spróbuj ponownie.");
        setStatus("error", "Problem z aktywacją", "Nie udało się połączyć z usługą aktywacyjną. Sprawdź połączenie i ustawienia projektu.");
        setFormBusy(false);
      }
    });
  }

  if (pasteBtn) {
    pasteBtn.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        const input = document.getElementById("adminKeyInput");
        if (input) {
          input.value = text.trim();
        }
      } catch (_) {}
    });
  }

  if (discordBtn) {
    discordBtn.addEventListener("click", connectDiscord);
  }

  if (discordForm) {
    discordForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.getElementById("discordNameInput");
      const safeName = input && input.value ? input.value.trim() : "Discord user";
      savePanelState({
        discordName: safeName,
        discordStatus: "Połączono przez panel aplikacji",
      });
      renderPanel();
      closeDiscordModal();
    });
  }

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target && event.target.hasAttribute("data-close-modal")) {
        closeDiscordModal();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDiscordModal();
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderPanel();
  bindEvents();
  setStatus("idle", "Przygotowanie do aktywacji", "Wprowadź klucz aktywacyjny, wybierz wariant aplikacji i rozpocznij swoją ścieżkę dostępu.");
});
