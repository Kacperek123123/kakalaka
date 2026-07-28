(function () {
  "use strict";

  function initHeaderTitleObserver(options) {
    try {
      var opts = options || {};
      var run = function () {
        try {
          var header = document.querySelector(opts.headerSelector || "header");
          var mainTitle = document.getElementById(
            opts.mainTitleId || "main-title"
          );
          var headerTitle = document.getElementById(
            opts.headerTitleId || "header-title"
          );
          if (
            !header ||
            !mainTitle ||
            !headerTitle ||
            typeof IntersectionObserver === "undefined"
          )
            return;

          var onEnter = typeof opts.onEnter === "function" ? opts.onEnter : null;
          var onLeave = typeof opts.onLeave === "function" ? opts.onLeave : null;

          var observer = new IntersectionObserver(
            function (entries) {
              var entry = entries && entries[0];
              if (!entry) return;
              if (entry.isIntersecting) {
                headerTitle.classList.remove("fade-in");
                if (onEnter)
                  try {
                    onEnter();
                  } catch (_) {}
              } else {
                headerTitle.classList.add("fade-in");
                if (onLeave)
                  try {
                    onLeave();
                  } catch (_) {}
              }
            },
            {
              rootMargin: "-" + header.offsetHeight + "px 0px 0px 0px",
              threshold: 0,
            }
          );
          observer.observe(mainTitle);
        } catch (_) {}
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", run);
      } else {
        run();
      }
    } catch (_) {}
  }

  var deferredPrompt = null;
  var installBanner = null;

  function hideInstallBanner() {
    if (installBanner) {
      installBanner.remove();
      installBanner = null;
    }
  }

  function showInstallBanner() {
    if (installBanner) return;
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true) return;
    if (window.location.pathname.includes("admin")) return;

    installBanner = document.createElement("div");
    installBanner.id = "pwa-install-banner";
    installBanner.innerHTML = `
      <style>
        #pwa-install-banner {
          position: fixed;
          left: 12px;
          right: 12px;
          bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 14px;
          background: linear-gradient(135deg, #0f172a, #1d4ed8);
          color: #fff;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
          font-family: system-ui, sans-serif;
        }
        #pwa-install-banner .title {
          font-weight: 700;
          font-size: 14px;
        }
        #pwa-install-banner .subtitle {
          font-size: 12px;
          opacity: 0.92;
        }
        #pwa-install-banner button {
          border: 0;
          border-radius: 999px;
          padding: 8px 12px;
          background: #fff;
          color: #0f172a;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }
        #pwa-install-banner .close {
          background: transparent;
          color: #fff;
          padding: 0 4px;
          font-size: 18px;
        }
      </style>
      <div>
        <div class="title">Zainstaluj aplikację</div>
        <div class="subtitle">Dodaj mObywatel do ekranu głównego i korzystaj szybciej.</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button type="button" data-install>Instaluj</button>
        <button type="button" class="close" data-close aria-label="Zamknij">×</button>
      </div>
    `;

    document.body.appendChild(installBanner);

    installBanner.querySelector("[data-install]").addEventListener("click", async function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      var choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        hideInstallBanner();
      }
    });

    installBanner.querySelector("[data-close]").addEventListener("click", hideInstallBanner);
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      console.log("[PWA] Service worker registered");
    } catch (err) {
      console.warn("[PWA] Service worker registration failed", err);
    }
  }

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredPrompt = event;
    showInstallBanner();
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    hideInstallBanner();
  });

  function init() {
    initHeaderTitleObserver();
    registerServiceWorker();
    if (!window.matchMedia("(display-mode: standalone)").matches && !window.navigator.standalone) {
      setTimeout(showInstallBanner, 1200);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
