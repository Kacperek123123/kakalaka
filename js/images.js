/**
 * images.js - Tylko profilowe zdjecie, lokalnie.
 * Nic więcej. Zero Firebase. Zero zewnetrznych zależności.
 */

// Zapisz zdjecie do localStorage
function cacheProfileImage(data) {
  try { localStorage.setItem("profileImage", data); } catch (e) {}
  try { localStorage.setItem("profileImageData", data); } catch (e) {}
}

// Odczytaj zdjecie i ustaw na stronie
function loadProfileImage() {
  var img = document.getElementById("profileImage");
  if (!img) return;
  
  var data = null;
  try { data = localStorage.getItem("profileImage"); } catch (e) {}
  if (!data) {
    try { data = localStorage.getItem("profileImageData"); } catch (e) {}
  }
  if (!data) {
    try { data = localStorage.getItem("photo"); } catch (e) {}
  }
  
  if (data) {
    img.src = data;
    img.style.opacity = "1";
  }
}

// Listener na wybor pliku
(function () {
  var inp = document.getElementById("imageInput");
  if (!inp) return;
  
  inp.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    
    var reader = new FileReader();
    reader.onload = function (ev) {
      var url = ev.target && ev.target.result;
      if (!url) return;
      
      // Pokaz zdjecie na stronie
      var img = document.getElementById("profileImage");
      if (img) {
        img.src = url;
        img.style.opacity = "1";
      }
      
      // Zapisz lokalnie
      cacheProfileImage(url);
    };
    reader.readAsDataURL(file);
  });
})();

// Przy starcie strony - laduj zdjecie
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadProfileImage);
} else {
  loadProfileImage();
}
window.addEventListener("load", loadProfileImage);
