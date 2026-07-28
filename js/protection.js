/**
 * Protection Module - Anti-tamper, anti-debug, anti-copy
 * For production use only
 */
(function () {
  "use strict";

  // Self-destruct if tampered
  if (typeof window === 'undefined' || !document) return;

  // Check if DEV_MODE is active
  function isDevMode() {
    try {
      return (
        window.DEV_CONFIG &&
        window.DEV_CONFIG.DEV_MODE === true
      );
    } catch (e) {
      return false;
    }
  }

  // ---- 1. CONTEXT MENU BLOCK ----
  document.addEventListener("contextmenu", function (e) {
    if (isDevMode()) return;
    e.preventDefault();
    return false;
  }, false);

  // ---- 2. SELECTION BLOCK ----
  document.addEventListener("selectstart", function (e) {
    if (isDevMode()) return;
    e.preventDefault();
    return false;
  }, false);

  // ---- 3. COPY / CUT BLOCK ----
  document.addEventListener("copy", function (e) {
    if (isDevMode()) return;
    e.preventDefault();
    return false;
  }, false);

  document.addEventListener("cut", function (e) {
    if (isDevMode()) return;
    e.preventDefault();
    return false;
  }, false);

  // ---- 4. LONG PRESS BLOCK (mobile) ----
  var longPressTimer = null;

  document.addEventListener("touchstart", function (e) {
    if (isDevMode()) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    longPressTimer = setTimeout(function () {
      e.preventDefault();
    }, 400);
  }, { passive: false });

  document.addEventListener("touchend", function () {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }, false);

  document.addEventListener("touchmove", function () {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }, false);

  // ---- 5. KEYBOARD SHORTCUTS BLOCK ----
  document.addEventListener("keydown", function (e) {
    if (isDevMode()) return;

    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    var blocked = false;
    var ctrl = e.ctrlKey || e.metaKey;

    if (
      (ctrl && (e.key === "c" || e.key === "C")) ||
      (ctrl && (e.key === "x" || e.key === "X")) ||
      (ctrl && (e.key === "u" || e.key === "U")) ||
      (ctrl && (e.key === "s" || e.key === "S")) ||
      (ctrl && (e.key === "a" || e.key === "A")) ||
      (ctrl && (e.key === "p" || e.key === "P")) ||
      e.key === "F12" ||
      (ctrl && e.shiftKey && (e.key === "i" || e.key === "I")) ||
      (ctrl && e.shiftKey && (e.key === "j" || e.key === "J")) ||
      (ctrl && e.shiftKey && (e.key === "c" || e.key === "C")) ||
      (ctrl && e.shiftKey && (e.key === "k" || e.key === "K")) ||
      (e.key === "PrintScreen")
    ) {
      blocked = true;
    }

    if (blocked) {
      e.preventDefault();
      return false;
    }
  }, false);

  // ---- 6. DRAG & DROP BLOCK ----
  document.addEventListener("dragstart", function (e) {
    if (isDevMode()) return;
    e.preventDefault();
    return false;
  }, false);

  // ---- 7. PRINT SCREEN DETECT ----
  document.addEventListener("keyup", function (e) {
    if (isDevMode()) return;
    if (e.key === "PrintScreen") {
      try {
        navigator.clipboard.writeText("");
      } catch (err) {}
      // Flash the screen briefly
      var flash = document.createElement("div");
      flash.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:999999;transition:opacity 0.3s;";
      flash.style.opacity = "0";
      document.body.appendChild(flash);
      requestAnimationFrame(function () {
        flash.style.opacity = "1";
        setTimeout(function () {
          flash.style.opacity = "0";
          setTimeout(function () { flash.remove(); }, 300);
        }, 150);
      });
    }
  });

  // ---- 8. DEVTOOLS DETECTION ----
  (function detectDevTools() {
    if (isDevMode()) return;

    var threshold = 160;
    var checkInterval = 2000;

    function check() {
      var widthDiff = window.outerWidth - window.innerWidth;
      var heightDiff = window.outerHeight - window.innerHeight;

      if (widthDiff > threshold || heightDiff > threshold) {
        // DevTools detected - redirect to index
        try {
          document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-family:sans-serif;text-align:center;padding:20px;"><div><h1>❌</h1><h2>Dostęp zabroniony</h2><p>Narzędzia deweloperskie są wyłączone w tej aplikacji.</p></div></div>';
          setTimeout(function () {
            window.location.href = "./index.html";
          }, 2000);
        } catch (e) {}
      }
    }

    // Check periodically
    setInterval(check, checkInterval);

    // Also check on resize (DevTools often triggers resize)
    window.addEventListener("resize", function () {
      setTimeout(check, 500);
    });
  })();

  // ---- 9. CONSOLE OVERRIDE ----
  if (!isDevMode()) {
    var noop = function () {};
    var originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };

    console.log = noop;
    console.warn = noop;
    console.info = noop;
    console.debug = noop;

    // Keep error for critical messages only
    console.error = function () {
      // Only show specific errors
      var msg = arguments[0] || "";
      if (typeof msg === "string" && (
        msg.includes("[SW]") ||
        msg.includes("[Critical]") ||
        msg.includes("Uncaught")
      )) {
        originalConsole.error.apply(console, arguments);
      }
    };
  }

  // ---- 10. CSS PROTECTION ----
  if (!isDevMode()) {
    try {
      var style = document.createElement("style");
      style.textContent = [
        "* {",
        "  -webkit-user-select: none !important;",
        "  -moz-user-select: none !important;",
        "  -ms-user-select: none !important;",
        "  user-select: none !important;",
        "  -webkit-touch-callout: none !important;",
        "}",
        "input, textarea {",
        "  -webkit-user-select: text !important;",
        "  -moz-user-select: text !important;",
        "  -ms-user-select: text !important;",
        "  user-select: text !important;",
        "}",
        "img {",
        "  pointer-events: none !important;",
        "  -webkit-user-drag: none !important;",
        "}",
        "@media print {",
        "  body { display: none !important; }",
        "}"
      ].join("\n");
      document.head.appendChild(style);
    } catch (e) {}

    // ---- 11. WATERMARK (visible on screenshots) ----
    try {
      var wm = document.createElement("div");
      wm.id = "_pwatm";
      wm.style.cssText = [
        "position: fixed;",
        "top: 50%; left: 50%;",
        "transform: translate(-50%, -50%) rotate(-35deg);",
        "font-size: 48px;",
        "opacity: 0.04;",
        "pointer-events: none;",
        "z-index: 999999;",
        "white-space: nowrap;",
        "color: #000;",
        "font-family: system-ui;",
        "font-weight: 900;",
        "user-select: none;",
        "text-shadow: none;",
        "letter-spacing: 4px;"
      ].join(" ");
      wm.textContent = "xObywatel 4.0 • discord.gg/shadxwshxp";
      document.body.appendChild(wm);
    } catch (e) {}
  }

  // ---- 12. VISIBILITY BLUR (anti-screenshot on Android) ----
  if (!isDevMode()) {
    try {
      var isAndroid = navigator.userAgent.toLowerCase().indexOf("android") !== -1;
      if (isAndroid) {
        document.addEventListener("visibilitychange", function () {
          if (document.hidden) {
            document.body.style.transition = "filter 0.1s";
            document.body.style.filter = "blur(15px)";
          } else {
            document.body.style.filter = "none";
          }
        });
      }
    } catch (e) {}
  }

  // ---- 13. INTEGRITY CHECK ----
  (function integrityCheck() {
    try {
      // Check if protection.js is loaded properly
      var checkEl = document.createElement("div");
      checkEl.id = "_pwa_protection_loaded";
      checkEl.style.display = "none";
      document.body.appendChild(checkEl);

      // If someone removes the element, reload
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          mutation.removedNodes.forEach(function (node) {
            if (node.id === "_pwa_protection_loaded") {
              window.location.reload();
            }
          });
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  })();

  console.log("[Protection] ✅ Zabezpieczenia aktywne");
})();

