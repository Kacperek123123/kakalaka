# xObywatel 4.0 - Aplikacja PWA

> **UWAGA:** To jest zaawansowana aplikacja PWA (Progressive Web App) wzorowana na mObywatelu.  
> **Przeznaczona WYŁĄCZNIE do celów edukacyjnych i prezentacyjnych.**

---

## 📋 Spis treści

1. [Wymagania hostingowe](#-wymagania-hostingowe)
2. [Szybki start](#-szybki-start)
3. [Konfiguracja Firebase](#-konfiguracja-firebase)
4. [Konfiguracja Discord Bota](#-konfiguracja-discord-bota)
5. [Panel administratora](#-panel-administratora)
6. [Struktura aplikacji](#-struktura-aplikacji)
7. [Bezpieczeństwo](#-bezpieczeństwo)
8. [Sprzedaż i dystrybucja](#-sprzedaż-i-dystrybucja)
9. [FAQ](#-faq)

---

## 🖥 Wymagania hostingowe

| Wymaganie | Minimalne | Zalecane |
|-----------|-----------|-----------|
| Hosting | Static (Netlify, Vercel, Cloudflare Pages) | VPS/Dedykowany |
| HTTPS | ✅ Wymagane | Let's Encrypt / Cloudflare |
| Node.js | - | v18+ (dla API proxy) |
| Python | 3.10+ (tylko Discord bot) | 3.11+ |
| Firebase | Konto Firebase (FREE tier wystarczy) | Blaze (płatny dla dużych projektów) |

### ✅ Hosting natychmiastowy (darmowy):
- **Netlify** - `netlify deploy` (najprościej)
- **Vercel** - `vercel deploy`
- **Cloudflare Pages** - podłącz GitHub repo
- **GitHub Pages** - wrzuć pliki do repo

### ⚠️ WAŻNE:
Aplikacja **NIE DZIAŁA** z `file://` protokołem! Service Worker wymaga HTTPS.

---

## 🚀 Szybki start

### 1. Klonowanie
```bash
git clone https://github.com/twoja-nazwa/xobywatel.git
cd xobywatel
```

### 2. Konfiguracja Firebase
1. Wejdź na https://console.firebase.google.com
2. Stwórz nowy projekt (nazwij np. `xobywatel-aktywacje`)
3. Włącz **Firestore Database** (tryb testowy)
4. W ustawieniach projektu → `config` → skopiuj konfigurację
5. Otwórz `js/pages/activate.js` i `js/admin.js` → wklej swoją konfigurację

### 3. Firebase Security Rules
W Firestore → Rules → wklej:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /codes/{code} {
      allow read, write: if true; // Publiczny dostęp tylko do odczytu kodów
      allow create, update, delete: if request.auth != null;
    }
  }
}
```

### 4. Deployment
```bash
# Netlify (najprościej)
npx netlify deploy --prod --dir=./
```

### 5. Discord Bot
```bash
cd discord-bot
pip install -r requirements.txt
cp .env.example .env
# Edytuj .env - uzupełnij token, guild ID, role ID
python bot.py
```

---

## 🔥 Konfiguracja Firebase

### Pliki do edycji (wstaw swoją konfigurację):

1. **`js/pages/activate.js`** - Firebase dla kodów aktywacyjnych
2. **`js/admin.js`** - Firebase dla panelu admina
3. **`js/images.js`** - Firebase dla minimalnej analityki

### Gdzie znaleźć konfigurację Firebase:
```
Project settings → General → Your apps → Web app → Config
```

### Firestore Indexes (dla szybkich zapytań):
```bash
# Kolekcja: codes
# Pola: code (string), used (boolean), plan (string), createdAt (timestamp)
```

---

## 🤖 Konfiguracja Discord Bota

### Krok 1: Stwórz aplikację Discord
1. Wejdź na https://discord.com/developers/applications
2. Kliknij "New Application" → nazwij np. "xObywatel Admin"
3. Przejdź do "Bot" → "Add Bot"

### Krok 2: Pobierz token
- W zakładce "Bot" kliknij "Reset Token" → skopiuj
- Wklej do `discord-bot/.env` jako `DISCORD_TOKEN`

### Krok 3: Zaproś bota na serwer
```
https://discord.com/api/oauth2/authorize?client_id=TWOJE_CLIENT_ID&permissions=268438016&scope=bot%20applications.commands
```

### Krok 4: Skonfiguruj .env
```env
DISCORD_TOKEN=twój_token_bota
GUILD_ID=id_serwera_discord
ROLE_BASIC_ID=id_roli_dla_basic
ROLE_PREMIUM_ID=id_roli_dla_premium
ADMIN_ROLE_ID=id_roli_admina
LOG_CHANNEL_ID=id_kanału_logów
API_SECRET=wygeneruj_losowy_string
```

### Krok 5: Uruchom bota
```bash
cd discord-bot
pip install -r requirements.txt
python bot.py
```

### Komendy bota:
| Komenda | Opis | Uprawnienia |
|---------|------|-------------|
| `/klucz @user basic` | Generuje klucz Basic | Admin |
| `/klucz @user premium` | Generuje klucz Premium | Admin |
| `/lista` | Wyświetla statystyki | Admin |
| `/sprawdz <kod>` | Sprawdza status klucza | Admin |
| `/usun <kod>` | Deaktywuje klucz | Admin |
| `/pomoc` | Wyświetla pomoc | Wszyscy |

---

## 👑 Panel administratora

Panel admina dostępny pod `/admin.html`.

### Logowanie
- **Nowy system:** Logowanie przez Discord OAuth
- Wymagane uprawnienia administratora na serwerze Discord
- Sesja ważna 1h (przechowywana w localStorage)

### Funkcje panelu:
- ✅ Generowanie kodów Basic / Premium
- ✅ Podgląd statystyk (wszystkie, aktywne, użyte, premium)
- ✅ Kopiowanie kodu jednym kliknięciem
- ✅ Usuwanie kodów
- ✅ Współpraca z Discord botem

---

## 📁 Struktura aplikacji

```
xobywatel/
├── index.html              # Strona startowa (sprawdzanie aktywacji)
├── activate.html           # Aktywacja aplikacji
├── login.html              # Logowanie hasłem + biometria
├── documents.html          # Główna strona z dokumentami
├── dowod.html              # Dokument dowodu
├── diia.html               # Dokument DIIA
├── legszk.html             # Legitymacja szkolna
├── legstu.html             # Legitymacja studencka
├── prawojazdy.html         # Prawo jazdy
├── qr.html                 # Skaner QR
├── services.html           # Usługi
├── more.html               # Więcej opcji
├── profiledata.html        # Edycja danych profila
├── admin.html              # Panel administratora
├── offline.html            # Strona offline
│
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
│
├── js/                     # JavaScript
│   ├── protection.js       # Zabezpieczenia (anty-debug, anty-copy)
│   ├── api-client.js       # Klient API z retry
│   ├── dev-config.js       # Konfiguracja deweloperska
│   ├── pwa-gate.js         # Brama PWA (sprawdzanie dostępu)
│   ├── biometric-auth.js   # Autoryzacja biometryczna
│   ├── theme.js            # Motyw (dark/light)
│   ├── header.js           # Obsługa nagłówka
│   ├── navigation.js       # Nawigacja
│   ├── images.js           # Minimalna analityka
│   └── pages/              # Skrypty dla poszczególnych stron
│
├── css/                    # Style CSS
├── assets/                 # Grafiki, ikony, fonty
└── discord-bot/            # Discord bot
    ├── bot.py
    ├── requirements.txt
    ├── .env.example
    └── README.md
```

---

## 🔒 Bezpieczeństwo

### Zastosowane zabezpieczenia:

| Zabezpieczenie | Opis | Status |
|---------------|------|--------|
| 🔐 **Szyfrowanie haseł** | SHA-256 w przeglądarce | ✅ |
| 🛡️ **Anty-debug** | Wykrywanie DevTools | ✅ |
| 🚫 **Anty-copy** | Blokada Ctrl+C, Ctrl+V, Ctrl+P | ✅ |
| 📱 **Blokada desktop** | Tylko urządzenia mobilne | ✅ |
| 🔑 **PWA Gate** | Sprawdzanie aktywacji przed dostępem | ✅ |
| 🖼️ **Watermark** | Niewidoczny watermark na screenshotach | ✅ |
| 📋 **Blokada print screen** | Ciemny flash przy PrtSc | ✅ |
| 🔄 **API Retry** | Automatyczne ponawianie zapytań | ✅ |
| 🔐 **Discord OAuth** | Logowanie do panelu admina | ✅ |
| 🧹 **Czyszczenie konsoli** | console.log wyłączone w produkcji | ✅ |

### Uwagi bezpieczeństwa:
1. **NIGDY** nie włączaj `DEV_MODE: true` na produkcji
2. Używaj tylko HTTPS (wymóg Service Workera)
3. Regularnie zmieniaj API keys
4. Monitoruj Firebase pod kątem nieautoryzowanego dostępu
5. Discord bot wymaga prywatnego serwera

---

## 💰 Sprzedaż i dystrybucja

### Model sprzedaży:
1. **Pakiet Basic** - podstawowy dostęp do aplikacji
2. **Pakiet Premium** - pełny dostęp + dodatkowe funkcje

### Jak działa aktywacja:
1. Klient otrzymuje kod (przez Discord bota lub panel admina)
2. Wchodzi na `activate.html`
3. Wprowadza kod
4. Ustawia hasło
5. Otrzymuje dostęp do aplikacji

### Wskazówki sprzedażowe:
- Hostuj aplikację na własnej domenie (np. `app-twoja-marka.pl`)
- Używaj własnego brandingu (zmień nazwę, logo, kolory)
- Discord bot będzie Twoim narzędziem do zarządzania klientami
- Każdy klient ma unikalny klucz aktywacyjny

### Co zmienić przed sprzedażą:
- [ ] Zmień nazwę aplikacji (w `manifest.json`, tytułach stron)
- [ ] Wstaw własne Firebase keys
- [ ] Skonfiguruj Discord bota
- [ ] Zmień watermark w `protection.js`
- [ ] Dostosuj kolorystykę (CSS variables)
- [ ] Wgraj własne logo i ikony

---

## ❓ FAQ

**Q: Czy aplikacja działa offline?**  
A: Tak, Service Worker cache'uje wszystkie strony i zasoby. Działa offline po pierwszym załadowaniu.

**Q: Jak dodać nowego klienta?**  
A: Przez Discord bota (`/klucz @user basic`) lub panel admina (`admin.html`).

**Q: Czy mogę zmienić wygląd?**  
A: Tak, wszystkie style są w `css/`. Zmienne CSS w `:root` w głównych plikach.

**Q: Jak zabezpieczyć Firebase?**  
A: Ustaw reguły Firestore, ogranicz API keys do swojej domeny, używaj Firebase App Check.

**Q: Discord bot nie działa?**  
A: Sprawdź token, uprawnienia bota, i czy bot ma dostęp do serwera.

**Q: Aplikacja nie ładuje się?**  
A: Upewnij się że używasz HTTPS, Service Worker jest zarejestrowany, i Firebase jest skonfigurowany.

---

## 📞 Wsparcie techniczne

- **Discord:** discord.gg/shadxwshxp
- **Dokumentacja Firebase:** https://firebase.google.com/docs
- **Dokumentacja Discord.py:** https://discordpy.readthedocs.io

---

## 📜 Licencja

MIT License - używasz na własną odpowiedzialność.

---

*Ostatnia aktualizacja: 2025*

