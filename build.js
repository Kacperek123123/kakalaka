/**
 * Build script - minifikacja i obfuskacja plików JS dla produkcji
 * Uruchom: node build.js
 * 
 * UWAGA: Przed uruchomieniem zainstaluj zależności:
 * npm install
 */

const fs = require("fs");
const path = require("path");

// Lista krytycznych plików do minifikacji
const CRITICAL_FILES = [
  "js/protection.js",
  "js/api-client.js",
  "js/dev-config.js",
  "js/images.js",
  "js/biometric-auth.js",
  "js/pwa-gate.js",
  "js/theme.js",
  "js/update-checker.js",
  "js/pages/activate.js",
  "js/admin.js"
];

const DIST_DIR = "dist";

console.log("🔧 xObywatel Build Tool");
console.log("========================\n");

// Sprawdź czy terser jest dostępny
let terser;
try {
  terser = require("terser");
} catch (e) {
  console.log("⚠️  terser nie jest zainstalowany. Uruchom: npm install");
  console.log("   Buduję bez minifikacji...\n");

  // Fallback: kopiuj pliki bez zmian
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // Kopiuj cały projekt do dist
  copyRecursiveSync(".", DIST_DIR, ["node_modules", "dist", ".git"]);
  console.log("✅ Pliki skopiowane do dist/");
  process.exit(0);
}

// Clean dist
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

// Kopiuj wszystkie pliki (oprócz node_modules)
copyRecursiveSync(".", DIST_DIR, ["node_modules", "dist", ".git", "build.js"]);

// Minifikuj krytyczne pliki JS
async function minifyFiles() {
  let success = 0;
  let failed = 0;

  for (const filePath of CRITICAL_FILES) {
    const fullPath = path.join(DIST_DIR, filePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`   ❌ ${filePath} - nie znaleziono`);
      failed++;
      continue;
    }

    try {
      const code = fs.readFileSync(fullPath, "utf-8");
      
      const result = await terser.minify(code, {
        compress: {
          dead_code: true,
          drop_debugger: true,
          drop_console: true,
          booleans: true,
          conditionals: true,
          evaluate: true,
          hoist_funs: true,
          if_return: true,
          join_vars: true,
          loops: true,
          passes: 2,
          pure_funcs: ["console.log", "console.warn", "console.debug"],
          sequences: true,
          side_effects: false,
          toplevel: true,
          unused: true
        },
        mangle: {
          toplevel: true,
          reserved: ["$", "jQuery", "BiometricAuth", "apiClient", "Theme"]
        },
        format: {
          comments: false,
          beautify: false,
          max_line_len: 200
        }
      });

      if (result.code) {
        // Add header
        const header = "/* xObywatel 4.0 - minified */\n";
        fs.writeFileSync(fullPath, header + result.code);

        const originalSize = (code.length / 1024).toFixed(1);
        const minifiedSize = (result.code.length / 1024).toFixed(1);
        const saved = ((1 - result.code.length / code.length) * 100).toFixed(1);

        console.log(`   ✅ ${filePath} (${originalSize}KB → ${minifiedSize}KB, -${saved}%)`);
        success++;
      } else {
        console.log(`   ⚠️  ${filePath} - wynik pusty`);
        failed++;
      }
    } catch (err) {
      console.log(`   ❌ ${filePath} - ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Minifikacja zakończona: ${success} OK, ${failed} failed`);
  console.log(`📁 Wynik w katalogu: ${DIST_DIR}/`);
}

// Copy recursive function
function copyRecursiveSync(src, dest, ignore = []) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (ignore.includes(entry.name)) continue;

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursiveSync(srcPath, destPath, ignore);
    } else {
      // Skip binary files and node_modules
      const ext = path.extname(entry.name).toLowerCase();
      if ([".exe", ".dll", ".so", ".bin"].includes(ext)) continue;

      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (e) {
        console.log(`   ⚠️  Błąd kopiowania: ${srcPath}`);
      }
    }
  }
}

minifyFiles().catch(console.error);

