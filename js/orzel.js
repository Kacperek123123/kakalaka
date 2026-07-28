(function () {
  console.log("orzel.js loaded");

  function initHologram() {
    const holos = document.querySelectorAll(".holo-back");
    const bases = document.querySelectorAll(".base-back");
    const tops = document.querySelectorAll(".godlo-top");

    if (holos.length === 0) {
      console.warn("No .holo-back elements found!");
      return;
    }

    bases.forEach((base) => {
      base.style.display = "block";
      base.style.opacity = "1";
    });

    tops.forEach((top) => {
      top.style.display = "block";
      top.style.opacity = "1";
    });

    holos.forEach((holo) => {
      holo.style.opacity = "0.7";
      holo.style.backgroundPosition = "center 50%";
    });

    console.log("Hologram initialized successfully");
  }

  initHologram();

  window.addEventListener("pageshow", function (event) {
    initHologram();
  });

  function handleOrientation(e) {
    if (e.beta === null) return;

    const beta = e.beta;
    const holos = document.querySelectorAll(".holo-back");

    let t = Math.sin(((beta - 90) * Math.PI) / 180);
    t = Math.abs(t);
    t = Math.pow(t, 0.8);

    let minOpacity = 0.3;
    if (beta >= 60 && beta <= 140) {
      minOpacity = 0.7;
    }
    const opacity = Math.max(minOpacity, t);
    const pos = 100 * t;

    holos.forEach((holo) => {
      holo.style.backgroundPosition = `center ${pos}%`;
      holo.style.opacity = opacity;
    });
  }
let latestBeta = 0;
let isUpdating = false;
// ==========================================
// 2. FUNKCJA RENDERUJĄCA (Aktualizuje CSS)
// ==========================================
function renderHologram() {
  // Pobieramy element bezpośrednio w klatce renderowania
  const holo = document.querySelector(".holo-back");

  if (holo) {
    // Kąt beta z zakresu 20° - 80° przeliczamy na wartość 0.0 - 1.0
    let pos = (latestBeta - 20) / 60;
    pos = Math.max(0, Math.min(1, pos)); // Ograniczenie (clamp) do zakresu 0-1

    // Aplikujemy zmiany wizualne
    holo.style.opacity = pos;
    holo.style.backgroundPosition = `center ${pos * 100}%`;
  }

  // Odblokowujemy flagę, aby kolejna klatka mogła zostać zaplanowana
  isUpdating = false;
}

// ==========================================
// 3. OBSŁUGA CZUJNIKA (Zapisuje kąt i zleca klatkę)
// ==========================================
function handleOrientation(event) {
  if (event.beta === null) return;

  latestBeta = event.beta;

  // Zapobiegamy nakładaniu się wywołań w tej samej klatce
  if (!isUpdating) {
    isUpdating = true;
    window.requestAnimationFrame(renderHologram);
  }
}

// ==========================================
// 4. INICJALIZACJA PO GESTIE UŻYTKOWNIKA
// ==========================================
function initSensorOnUserInteraction() {
  const debug = document.getElementById("debug-info");

  // Rejestracja dla iOS 13+ (wymagająca zgody)
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission()
      .then((permissionState) => {
        if (debug) debug.innerText = `Wynik zgody: ${permissionState}`;

        if (permissionState === "granted") {
          window.addEventListener("deviceorientation", handleOrientation);
        } else {
          alert("Dostęp do czujnika został odrzucony.");
        }
      })
      .catch((err) => {
        if (debug) debug.innerText = `Błąd: ${err}`;
        console.error(err);
      });
  } else {
    // Urządzenia Android / Desktop
    if (debug) debug.innerText = "Podpięto czujnik ruchowy.";
    window.addEventListener("deviceorientation", handleOrientation);
  }

  // Usuwamy nasłuchiwanie kliknięcia, aby funkcja wykonała się tylko raz
  document.removeEventListener("click", initSensorOnUserInteraction);
}

// ==========================================
// 5. REJESTRACJA PIERWSZEGO KLIKNIĘCIA
// ==========================================
document.addEventListener("click", initSensorOnUserInteraction);
})();