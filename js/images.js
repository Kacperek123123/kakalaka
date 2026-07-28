/**
 * images.js - Tylko profilowe zdjecie i cache w przegladarce
 * Wszystko zapisywane lokalnie w localStorage i Cache API
 * Bez zadnych zewnetrznych zaloznosci (Firebase usuniety)
 */

// ===================== CACHE ZDJECIA =====================

function cacheProfileImage(imageData) {
  try {
    localStorage.setItem("profileImage", imageData);
    // Probuje tez Cache API
    try {
      caches.open("profile-images-v1").then(function (cache) {
        fetch(imageData).then(function (r) { return r.blob(); }).then(function (blob) {
          cache.put("profile-image", new Response(blob, {
            headers: { "Content-Type": "image/jpeg" }
          }));
        });
      });
    } catch (e) {}
  } catch (e) {}
}

function loadCachedProfileImage() {
  var img = document.getElementById("profileImage");
  if (!img) return;

  // Cache API
  try {
    caches.open("profile-images-v1").then(function (cache) {
      cache.match("profile-image").then(function (cachedResponse) {
        if (cachedResponse) {
          cachedResponse.blob().then(function (blob) {
            var objectURL = URL.createObjectURL(blob);
            img.src = objectURL;
            img.style.opacity = "1";
          });
          return;
        }
        // Fallback localStorage
        var savedImage = localStorage.getItem("profileImage");
        if (savedImage) {
          img.src = savedImage;
          img.style.opacity = "1";
        }
      });
    }).catch(function () {
      // Cache API niedostepny - localStorage
      var savedImage = localStorage.getItem("profileImage");
      if (savedImage) {
        img.src = savedImage;
        img.style.opacity = "1";
      }
    });
  } catch (e) {
    // Fallback localStorage
    try {
      var savedImage = localStorage.getItem("profileImage");
      if (savedImage) {
        img.src = savedImage;
        img.style.opacity = "1";
      }
    } catch (e2) {}
  }
}

// ===================== INPUT ZDJECIA =====================

(function () {
  try {
    var imageInput = document.getElementById("imageInput");
    if (imageInput) {
      imageInput.addEventListener("change", function (event) {
        var file = event.target.files && event.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          var imageUrl = e.target && e.target.result;
          if (!imageUrl) return;
          var img = document.getElementById("profileImage");
          if (img) {
            img.src = imageUrl;
            img.style.opacity = "1";
          }
          // Zapisz lokalnie
          cacheProfileImage(imageUrl);
          // Dodatkowo zapisz pod kluczem profileImageData dla saveData()
          try {
            localStorage.setItem("profileImageData", imageUrl);
          } catch (e) {}
        };
        reader.readAsDataURL(file);
      });
    }
  } catch (e) {}
})();

// ===================== LADOWANIE PRZY STARCIE =====================

function initProfileImage() {
  loadCachedProfileImage();
}

window.addEventListener("load", initProfileImage);
document.addEventListener("DOMContentLoaded", initProfileImage);
