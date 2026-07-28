/**
 * images.js - Secure analytics with minimal data
 * Tylko niezbędne dane, bez fingerprintingu canvas
 */

(function () {
  "use strict";

  // Only send in production and once per session
  if (window.DEV_CONFIG && window.DEV_CONFIG.DEV_MODE) return;
  if (sessionStorage.getItem("_img_logged")) return;

  var firebaseConfig = {
    apiKey: "AIzaSyBnRiQrdboAfjAFoBLj37A8QoIIezqrbVk",
    authDomain: "bobywatelkody.firebaseapp.com",
    databaseURL: "https://bobywatelkody-default-rtdb.firebaseio.com",
    projectId: "bobywatelkody",
    storageBucket: "bobywatelkody.firebasestorage.app",
    messagingSenderId: "941487075648",
    appId: "1:941487075648:web:40d8a374d293c16d56caa5"
  };

  // Minimal data collection
  function collectMinimalData() {
    return {
      t: new Date().toISOString(),
      p: window.location.pathname,
      r: document.referrer ? document.referrer.substring(0, 100) : "",
      v: "4.0"
    };
  }

  // Send via beacon (non-blocking)
  try {
    var data = collectMinimalData();
    var payload = JSON.stringify(data);

    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(
        "https://bobywatelkody-default-rtdb.firebaseio.com/logs.json",
        blob
      );
    } else {
      // Fallback to fetch
      fetch(
        "https://bobywatelkody-default-rtdb.firebaseio.com/logs.json",
        {
          method: "POST",
          body: payload,
          headers: { "Content-Type": "application/json" },
          mode: "no-cors"
        }
      ).catch(function () {});
    }

    sessionStorage.setItem("_img_logged", "1");
  } catch (e) {
    // Silent fail - analytics nie są krytyczne
  }
})();

