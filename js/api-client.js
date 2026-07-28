/**
 * API Client - secure communication layer
 * With automatic 401 handling, retry logic, and token management
 */

(function () {
  "use strict";

  const API_BASE_URL = "https://butilive.adadad1314asda.workers.dev";
  const MAX_RETRIES = 3;
  const BASE_DELAY = 500;
  const TIMEOUT_MS = 15000;

  // ============== IndexedDB Helpers ==============

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("obywatel_auth", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("auth_state")) {
          db.createObjectStore("auth_state");
        }
      };
    });
  }

  function getFromDB(db, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("auth_state", "readonly");
      const store = tx.objectStore("auth_state");
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function setInDB(db, key, value) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("auth_state", "readwrite");
      const store = tx.objectStore("auth_state");
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  function clearDB(db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("auth_state", "readwrite");
      const store = tx.objectStore("auth_state");
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============== Error Translation ==============

  function translateErrorMessage(error) {
    const translations = {
      "Session expired": "Sesja wygasła",
      "Unauthorized": "Brak autoryzacji",
      "Token expired": "Token wygasł",
      "Device not found": "Urządzenie nie znalezione",
      "Device revoked": "Urządzenie zostało unieważnione",
      "Admin key blocked": "Klucz administratora został zablokowany",
      "Admin key deleted": "Klucz administratora został usunięty",
      "Admin key expired": "Klucz administratora wygasł",
      "Device not bound to any key": "Urządzenie nie jest powiązane z żadnym kluczem",
      "Refresh failed": "Odświeżanie nie powiodło się",
      "No refresh token": "Brak tokenu odświeżania",
      "Network error": "Błąd połączenia z serwerem",
      "Timeout": "Przekroczono limit czasu połączenia",
      "Failed to fetch": "Nie udało się połączyć z serwerem"
    };
    return translations[error] || error;
  }

  // ============== Auth Cleanup ==============

  async function clearAuthAndRedirect(reason) {
    console.warn("[API Client] Autoryzacja unieważniona:", reason);

    try {
      const db = await openDB();
      await clearDB(db);
      sessionStorage.removeItem("auth_validated");
      sessionStorage.removeItem("auth_validated_at");
      localStorage.removeItem("activated");

      if (window.__devicePrivateKey) {
        delete window.__devicePrivateKey;
      }
    } catch (err) {
      console.error("[API Client] Błąd czyszczenia danych:", err);
    }

    window.location.href = "./index.html";
  }

  // ============== Secure Fetch ==============

  async function apiFetch(url, options = {}) {
    let timeoutId;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
          const error = await response.json().catch(() => ({ error: "Brak autoryzacji" }));
          await clearAuthAndRedirect(error.error || "Brak autoryzacji");
          throw new Error("Przekierowywanie do aktywacji...");
        }

        return response;
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);

        if (err.name === "AbortError") {
          console.error("[API Client] Timeout (próba " + (attempt + 1) + "/" + MAX_RETRIES + ")");
          if (attempt === MAX_RETRIES - 1) {
            throw new Error("Przekroczono limit czasu połączenia. Sprawdź połączenie internetowe.");
          }
        }

        if (err.message === "Przekierowywanie do aktywacji..." || attempt === MAX_RETRIES - 1) {
          if (err.message.includes("fetch")) {
            throw new Error("Nie udało się połączyć z serwerem. Sprawdź połączenie internetowe.");
          }
          throw err;
        }

        const delay = BASE_DELAY * Math.pow(2, attempt);
        console.warn("[API Client] Próba " + (attempt + 1) + "/" + MAX_RETRIES + " nie powiodła się, ponowienie za " + delay + "ms");
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // ============== Auth Headers ==============

  async function getAuthHeaders() {
    const db = await openDB();
    const authState = await getFromDB(db, "auth_state");

    if (!authState || !authState.accessToken) {
      throw new Error("Brak autoryzacji. Zaloguj się ponownie.");
    }

    const installId = await getFromDB(db, "install_id");

    return {
      "Authorization": "Bearer " + authState.accessToken,
      "X-PWA-Install-ID": installId || "",
      "Content-Type": "application/json"
    };
  }

  // ============== Authenticated Request ==============

  async function authenticatedRequest(endpoint, options = {}) {
    const headers = await getAuthHeaders();

    const response = await apiFetch(API_BASE_URL + endpoint, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    });

    return response;
  }

  // ============== Token Refresh ==============

  async function refreshAccessToken() {
    const db = await openDB();
    const authState = await getFromDB(db, "auth_state");

    if (!authState || !authState.refreshToken) {
      await clearAuthAndRedirect("Brak tokenu odświeżania");
      throw new Error("Brak tokenu odświeżania");
    }

    try {
      const response = await apiFetch(API_BASE_URL + "/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_token: authState.refreshToken
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Odświeżanie nie powiodło się" }));
        await clearAuthAndRedirect(error.error || "Odświeżanie nie powiodło się");
        throw new Error("Odświeżanie nie powiodło się");
      }

      const data = await response.json();

      await setInDB(db, "auth_state", {
        ...authState,
        accessToken: data.access_token,
        refreshToken: data.refresh_token
      });

      return data.access_token;
    } catch (err) {
      console.error("[API Client] Odświeżanie nie powiodło się:", err);
      await clearAuthAndRedirect("Odświeżanie nie powiodło się");
      throw err;
    }
  }

  // ============== Export ==============

  window.apiClient = {
    apiFetch: apiFetch,
    authenticatedRequest: authenticatedRequest,
    refreshAccessToken: refreshAccessToken,
    clearAuthAndRedirect: clearAuthAndRedirect,
    getAuthHeaders: getAuthHeaders,
    translateErrorMessage: translateErrorMessage
  };

  console.log("[API Client] ✅ Zainicjalizowano");
})();

