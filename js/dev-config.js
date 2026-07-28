/**
 * Konfiguracja deweloperska
 * UWAGA: Na produkcji DEV_MODE musi być FALSE!
 * Wszystkie zabezpieczenia są aktywne tylko gdy DEV_MODE = false
 */

window.DEV_CONFIG = {
  DEV_MODE: false,
  SKIP_AUTH_CHECK: false,
  SKIP_PWA_CHECK: false,
  SKIP_MOBILE_CHECK: false,
  ALLOW_DESKTOP: false,
  LOG_VERBOSE: false,
  DISABLE_KEYBOARD_PROTECTION: false
};

// Blokada auto-wykrywania file:// - NIE włączaj DEV_MODE automatycznie!
// W produkcji aplikacja musi działać przez HTTPS z Service Workerem
// Do testów lokalnych użyj `?dev=true` w URL
(function () {
  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get("dev") === "true") {
      console.warn("🔧 TRYB DEWELOPERSKI przez ?dev=true");
      window.DEV_CONFIG.DEV_MODE = true;
      window.DEV_CONFIG.SKIP_AUTH_CHECK = true;
      window.DEV_CONFIG.SKIP_PWA_CHECK = true;
      window.DEV_CONFIG.SKIP_MOBILE_CHECK = true;
      window.DEV_CONFIG.ALLOW_DESKTOP = true;
      window.DEV_CONFIG.LOG_VERBOSE = true;
      window.DEV_CONFIG.DISABLE_KEYBOARD_PROTECTION = true;
    }
  } catch (e) {}
})();

console.log("[Dev Config] Loaded:", window.DEV_CONFIG.DEV_MODE ? "🔧 DEV_MODE" : "🔒 PRODUKCJA");

