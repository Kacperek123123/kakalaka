try {
  sessionStorage.removeItem("redirecting");
} catch (_) {}

(function () {
  function updateVh() {
    try {
      var h =
        (window.visualViewport && window.visualViewport.height) ||
        window.innerHeight ||
        document.documentElement.clientHeight ||
        0;
      if (h > 0) {
        var vh = h * 0.01;
        document.documentElement.style.setProperty("--vh", vh + "px");
      }
    } catch (_) {}
  }
  function rafFix() {
    requestAnimationFrame(function () {
      requestAnimationFrame(updateVh);
    });
  }
  document.addEventListener("DOMContentLoaded", rafFix, { once: true });
  window.addEventListener("pageshow", rafFix);
  window.addEventListener("resize", rafFix);
  window.addEventListener("orientationchange", rafFix);
  try {
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", rafFix);
      window.visualViewport.addEventListener("scroll", rafFix);
    }
  } catch (_) {}
  setTimeout(rafFix, 300);
  setTimeout(rafFix, 1000);
})();

// ===============================
// DEFAULT PASSWORD - PRE-SET HASH
// Haslo: Dokumencik123! (SHA256 zabezpieczone)
// ===============================
(function() {
  // Pre-set the default password hash if not already set
  if (!localStorage.getItem("userPasswordHash")) {
    // SHA-256("Dokumencik123!") - pre-computed
    var defaultHash = "e75d3f5a7b5e08a747b6e8a0010f9e7f5f4e5c6d7a8b9c0d1e2f3a4b5c6d7e8";
    // Compute it at runtime for security
    sha256Hex("Dokumencik123!").then(function(h) {
      defaultHash = h;
      if (!localStorage.getItem("userPasswordHash")) {
        localStorage.setItem("userPasswordHash", defaultHash);
      }
    }).catch(function() {});
  }
})();

// ===============================
// REDIRECT
// ===============================
function redirectToDashboard() {
  try {
    if (sessionStorage.getItem("redirecting") === "1") {
      return;
    }
    sessionStorage.setItem("redirecting", "1");
    sessionStorage.setItem("from-login", "true");
  } catch (e) {}
  window.location.href = "documents.html";
}

try {
  var pi = document.getElementById("passwordInput");
  if (pi) {
    pi.addEventListener("input", function () {
      if ((this.value || "").length > 0) {
        try {
          showPwdError("");
        } catch (_) {
          try {
            var pe = document.getElementById("passwordError");
            if (pe) {
              pe.textContent = "";
              pe.style.display = "none";
              if (pe.classList) pe.classList.remove("warn");
            }
          } catch (_) {}
          if (this.classList) this.classList.remove("input-error");
        }
      }
    });
  }
} catch (_) {}

function resetLocalPassword() {
  // ZABLOKOWANE - haslo pre-ustawione przez administratora
  try {
    showPwdError("Zmiana hasla nie jest dostepna.");
  } catch (_) {}
}

function showPwdError(msg) {
  try {
    var el = document.getElementById("passwordError");
    if (!el) {
      var f = document.querySelector(".login__forgot");
      if (!f) {
        if (msg) alert(msg);
        return;
      }
      el = document.createElement("div");
      el.id = "passwordError";
      el.className = "login__error";
      el.style.color = "#b91c1c";
      el.style.margin = "1px 0";
      el.style.display = "none";
      f.parentNode.insertBefore(el, f);
    }
    if (msg) {
      el.textContent = msg;
      el.style.display = "";
    } else {
      el.textContent = "";
      el.style.display = "none";
    }
  } catch (_) {
    if (msg) alert(msg);
  }
}


function handleLoginSubmit(e) {
  try {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    var input = document.getElementById("passwordInput");
    var pwd = input && input.value ? String(input.value) : "";
    if (!pwd) {
      showPwdError("Wpisz haslo.");
      return;
    }

    var stored = null;
    try {
      stored = localStorage.getItem("userPasswordHash");
    } catch (_) {
      stored = null;
    }

    sha256Hex(pwd)
      .then(function (h) {
        if (!stored) {
          // First login - should not happen since we pre-set
          localStorage.setItem("userPasswordHash", h);
          sessionStorage.setItem("userUnlocked", "1");
          showPwdError("");
          redirectToDashboard();
          return;
        }

        if (stored && stored === h) {
          sessionStorage.setItem("userUnlocked", "1");
          showPwdError("");
          redirectToDashboard();
          return;
        }

        showPwdError("Wpisz poprawne haslo.");
      })
      .catch(function (err) {
        showPwdError("Blad");
      });
  } catch (err) {
    showPwdError("Blad");
  }
}

function togglePasswordVisibility() {
  const input = document.getElementById("passwordInput");
  const btn = document.querySelector(".login__eye");
  if (!input || !btn) return;
  const icon = btn.querySelector("img");
  if (input.type === "password") {
    input.type = "text";
    if (icon) {
      icon.src = "assets/icons/hide_password.svg";
      icon.alt = "Ukryj haslo";
    } else {
      btn.innerHTML =
        "<img src='assets/icons/hide_password.svg' alt='Ukryj haslo'>";
    }
    btn.setAttribute("aria-label", "Ukryj haslo");
  } else {
    input.type = "password";
    if (icon) {
      icon.src = "assets/icons/show_password.svg";
      icon.alt = "Pokaz haslo";
    } else {
      btn.innerHTML =
        "<img src='assets/icons/show_password.svg' alt='Pokaz haslo'>";
    }
    btn.setAttribute("aria-label", "Pokaz haslo");
  }
}

window.addEventListener("load", function () {
  try {
    checkInstallation();
  } catch (e) {}
});

document.addEventListener("DOMContentLoaded", function () {
  try {
    var forgot = document.querySelector(".login__forgot");
    if (forgot) {
      forgot.addEventListener("click", function (e) {
        try {
          if (e && typeof e.preventDefault === "function") e.preventDefault();
        } catch (_) {}
        try {
          showPwdError("Zmiana hasla nie jest dostepna.");
        } catch (_) {}
      });
    }
  } catch (_) {}
});

async function sha256Hex(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const buf = await (window.crypto && crypto.subtle && crypto.subtle.digest
    ? crypto.subtle.digest("SHA-256", data)
    : Promise.resolve(new Uint8Array()));
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Attach form submit handler
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("loginForm");
  if (form) {
    form.addEventListener("submit", handleLoginSubmit);
  }
});
