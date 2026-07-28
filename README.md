# xObywatel 4.0 - Aplikacja PWA do sprzedaży

Profesjonalna aplikacja PWA inspirowana mObywatelem. Gotowa do sprzedaży i instant deploymentu.

## 📦 Zawartość pakietu

- **Aplikacja PWA** - w pełni funkcjonalna, działa offline
- **Panel administratora** - zarządzanie kluczami aktywacyjnymi
- **Bot Discord** - automatyzacja nadawania dostępu
- **System aktywacji** - klucze jednorazowe z Firebase

## 🚀 Szybki start

### 1. Hosting (Netlify - zalecany)

```bash
# Wdrażanie na Netlify przez Git:
# 1. Wrzuć pliki na GitHub/GitLab
# 2. Połącz z Netlify
# 3. Ustaw:
#    - Build command: (puste)
#    - Publish directory: /
#    - Ustaw zmienne środowiskowe w Netlify Dashboard
```

### 2. Firebase Configuration

1. Wejdź na https://console.firebase.google.com
2. Stwórz projekt (np. "xobywatel-keys")
3. Włącz **Firestore Database** (tryb testowy na start)
4. W Ustawieniach projektu → `projectId` skopiuj do `admin.js` i `activate.js`

### 3. Discord Bot

```bash
cd discord-bot
pip install -r requirements.txt
# Skopiuj .env.example do .env i uzupełnij dane
python bot.py
```

Bot komendy:
- `/nadajbasic @user` - nadaje kod Basic
- `/nadajpremium @user` - nadaje kod Premium
- `/klucz` - generuje i wyświetla klucz
- `/lista` - lista wszystkich aktywacji

### 4. Pierwsze uruchomienie

1. Otwórz aplikację w przeglądarce mobilnej
2. Dodaj do ekranu głównego (Install PWA)
3. Wpisz klucz aktywacyjny (wygeneruj w panelu admina)
4. Zaloguj się do panelu

## 🔐 Panel Administratora

**Dostęp:** `/admin.html`
**Hasło domyślne:** `Dokumencik123!`
**Zmień hasło:** Po pierwszym logowaniu hasło zostaje zapisane w localStorage. Aby zmienić, wyczyść `localStorage` lub usuń klucz `admin_password_hash`.

### Funkcje panelu:
- Generowanie kodów Basic/Premium
- Podgląd statystyk (wszystkie, aktywne, użyte)
- Kopiowanie i usuwanie kodów
- Wylogowanie

## 🛡️ Bezpieczeństwo

- **Ochrona przed DevTools** - wykrywanie i blokada
- **Blokada copy-paste** - poza polami formularzy
- **Anti-screenshot** - rozmycie na Androidzie
- **Watermark** - znak wodny na screenshotach
- **Szyfrowanie SHA-256** - hasła w localStorage
- **Brak API keys w kliencie** - Firebase przez HTTPS

## 📱 Wymagania techniczne

- Hosting HTTPS (Netlify, Vercel, własny VPS)
- Firebase project (Firestore)
- Python 3.10+ (dla bota Discord)
- Przeglądarka: Chrome/Edge/Safari (najnowsze wersje)

## 💡 Dla sprzedawcy

### Pricing - sugerowane pakiety:

| Pakiet | Cena | Funkcje |
|--------|------|---------|
| Basic | 49 PLN | Podstawowe dokumenty |
| Premium | 99 PLN | Wszystkie dokumenty + priorytet |

### Model sprzedaży:
1. Klient płaci (Blik/Przelew/Krypto)
2. Generujesz kod w panelu admina
3. Wysyłasz kod klientowi
4. Klient wpisuje kod w aplikacji
5. Automatyczna aktywacja

### Wskazówki:
- Zmień hasło admina po pierwszym logowaniu
- Regularnie sprawdzaj logi Firebase
- Bot Discord dla automatyzacji na serwerze
- Możesz zmienić branding (nazwy, kolory, logo)

## 🔧 Dostosowanie

### Zmiana hasła admina:
W `js/admin.js` zmień:
```javascript
if (pwd === "Dokumencik123!") {
```
na swoje hasło.

### Zmiana watermarku:
W `js/protection.js` zmień:
```javascript
wm.textContent = "xObywatel 4.0 • discord.gg/shadxwshxp";
```

## 📞 Wsparcie

Discord: [Zapraszam na serwer](https://discord.gg/shadxwshxp)

---

© 2025 xObywatel - Wszelkie prawa zastrzeżone
