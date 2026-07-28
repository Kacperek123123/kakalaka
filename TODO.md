# TODO - Przygotowanie aplikacji do sprzedaży

## Faza 1: Bezpieczeństwo (Security Hardening)
- [x] 1.1 Naprawa `protection.js` - usunięcie bypassu, pełna ochrona anty-debug, watermark
- [x] 1.2 Naprawa `api-client.js` - przywrócenie działania z retry i token management
- [x] 1.3 Usunięcie `ipalert.php` z `index.html` i `login.html`
- [x] 1.4 Zabezpieczenie `dev-config.js` - brak auto-DEV_MODE, tylko `?dev=true`
- [x] 1.5 Zabezpieczenie `images.js` - bez canvas fingerprinting, minimalne dane
- [x] 1.6 Build script (obfuskacja) - `build.js` + `package.json`

## Faza 2: Admin + Password Login
- [x] 2.1 Przebudowa bota Discord: komendy `/nadajbasic`, `/nadajpremium`, `/listaapk`
- [x] 2.2 Stworzenie `.env.example` dla bota
- [x] 2.3 Przebudowa `admin.html` i `admin.js` - logowanie przez hasło z SHA-256
- [x] 2.4 Hasło domyślne: `Dokumencik123!` (hashowane SHA-256)
- [x] 2.5 Ulepszenie `activate.js` - redirect do admin.html po aktywacji
- [x] 2.6 Naprawa struktury HTML `dowod.html` - `<p>Rzeczpospolita</p>` poza `.wrapper`

## Faza 3: Professional Selling Kit
- [x] 3.1 README.md - kompleksowa instrukcja wdrożenia i sprzedaży
- [x] 3.2 Build script (`build.js`) - minifikacja JS (npm run build)
- [x] 3.3 Czyszczenie console.log, warningów, PHP zależności

## Faza 4: Ulepszenia
- [x] 4.1 Profesjonalny wygląd admin panelu
- [x] 4.2 Logowanie hasłem zamiast Discord OAuth
- [x] 4.3 Kompletna dokumentacja sprzedawcy
