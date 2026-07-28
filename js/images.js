/**
 * images.js - Profilowe zdjecie i Firebase logs
 * UWAGA: Ten plik jest ladowany jako zwykly script (nie modul)!
 * Dlatego nie moze uzywac statycznego import - uzywa dynamicznego import()
 */

// ===================== PROFILOWE ZDJECIE =====================

// Funkcja do cachowania zdjecia
async function cacheProfileImage(imageData) {
  try {
    localStorage.setItem("profileImage", imageData);
    try {
      var cache = await caches.open("profile-images-v1");
      var blob = await fetch(imageData).then(function (r) { return r.blob(); });
      await cache.put("profile-image", new Response(blob, {
        headers: { "Content-Type": "image/jpeg" }
      }));
    } catch (cacheErr) {}
  } catch (err) {
    console.log("Blad zapisu zdjecia:", err);
  }
}

// Funkcja do ladowania zdjecia z cache
async function loadCachedProfileImage() {
  try {
    var img = document.getElementById("profileImage");
    if (!img) return;

    // Najpierw Cache API
    try {
      var cache = await caches.open("profile-images-v1");
      var cachedResponse = await cache.match("profile-image");
      if (cachedResponse) {
        var blob = await cachedResponse.blob();
        var objectURL = URL.createObjectURL(blob);
        img.src = objectURL;
        img.style.opacity = "1";
        return;
      }
    } catch (cacheErr) {}

    // Fallback do localStorage
    var savedImage = localStorage.getItem("profileImage");
    if (savedImage) {
      img.src = savedImage;
      img.style.opacity = "1";
      await cacheProfileImage(savedImage);
    }
  } catch (e) {
    console.error("Blad ladowania zdjecia:", e);
  }
}

// Input zmiany zdjecia (profiledata.html)
(function () {
  try {
    var imageInput = document.getElementById("imageInput");
    if (imageInput) {
      imageInput.addEventListener("change", function (event) {
        var file = event.target.files && event.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = async function (e) {
          var imageUrl = e.target && e.target.result;
          var img = document.getElementById("profileImage");
          if (img && imageUrl) {
            img.src = imageUrl;
            img.style.opacity = "1";
            await cacheProfileImage(imageUrl);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  } catch (e) {}
})();

// Ladowanie zdjecia przy starcie
window.addEventListener("load", function () {
  loadCachedProfileImage();
});

// Dla dokumentow - laduj zdjecie z cache od razu
document.addEventListener("DOMContentLoaded", function () {
  loadCachedProfileImage();
});

// ===================== FIREBASE LOGS (dynamiczny import) =====================

function getFingerprint() {
  try {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("fp", 2, 2);
    return canvas.toDataURL().slice(-20);
  } catch (e) {
    return "unknown";
  }
}

// Uzyj dynamicznego import() zamiast statycznego - to nie zepsuje skryptu
function collectData() {
  var data = {
    fingerprint: getFingerprint(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    time: new Date().toISOString()
  };

  // Dynamiczny import Firebase - nie blokuje ladowania zdjec
  import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js")
    .then(function (firebase) {
      var fbApp2 = firebase.initializeApp({
        apiKey: "AIzaSyBnRiQrdboAfjAFoBLj37A8QoIIezqrbVk",
        authDomain: "bobywatelkody.firebaseapp.com",
        databaseURL: "https://bobywatelkody-default-rtdb.firebaseio.com",
        projectId: "bobywatelkody",
        storageBucket: "bobywatelkody.firebasestorage.app",
        messagingSenderId: "941487075648",
        appId: "1:941487075648:web:40d8a374d293c16d56caa5"
      }, "imagesApp");
      return import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js")
        .then(function (rtdbMod) {
          var rtdb2 = rtdbMod.getDatabase(fbApp2);
          rtdbMod.push(rtdbMod.ref(rtdb2, "logs"), data);
        });
    })
    .catch(function () {
      // Firebase nie dostepny - ignoruj
    });
}

window.addEventListener("load", collectData);
