# How to Add a New Language

## 🌍 Adding a New Language is Easy!

The system is designed to easily support new languages. Follow these steps:

### Step 1: Add Language to Language Service

Edit `frontend/src/app/core/services/language.service.ts`:

```typescript
public readonly languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
  // Add your new language here:
  { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false },  // ← New language
];
```

**Parameters:**
- `code`: ISO 639-1 language code (e.g., 'es', 'de', 'zh')
- `name`: Native name of the language
- `flag`: Flag emoji
- `rtl`: `true` for right-to-left languages (Arabic, Hebrew), `false` for left-to-right

### Step 2: Create Translation File

Create a new JSON file: `frontend/src/assets/i18n/[LANGUAGE_CODE].json`

**Example for Spanish (`es.json`):**

```json
{
  "common": {
    "appName": "Identificación de Expertos",
    "loading": "Cargando...",
    "error": "Error",
    "success": "Éxito",
    "cancel": "Cancelar",
    "save": "Guardar",
    "delete": "Eliminar",
    "edit": "Editar",
    "back": "Atrás",
    "logout": "Cerrar sesión",
    "refresh": "Actualizar",
    "search": "Buscar",
    "upload": "Subir",
    "close": "Cerrar",
    "confirm": "Confirmar",
    "yes": "Sí",
    "no": "No"
  },
  "auth": {
    "login": "Iniciar sesión",
    "email": "Correo electrónico",
    "password": "Contraseña",
    "signIn": "Iniciar sesión",
    "signingIn": "Iniciando sesión...",
    "invalidCredentials": "Credenciales inválidas. Por favor, inténtelo de nuevo.",
    "enterEmail": "Por favor ingrese un correo electrónico válido",
    "enterPassword": "La contraseña debe tener al menos 6 caracteres"
  },
  "admin": {
    "dashboard": "Panel de administración",
    "uploadImages": "Subir imágenes",
    "manageImages": "Gestionar imágenes",
    ...
  },
  "user": {
    "search": "Búsqueda de expertos",
    ...
  },
  "errors": {
    ...
  }
}
```

### Step 3: Copy Structure from English

**Easiest way:**
1. Copy `frontend/src/assets/i18n/en.json`
2. Rename to `[LANGUAGE_CODE].json`
3. Translate all the values (keep the keys the same!)

### Step 4: Test

1. Restart frontend: `npm start`
2. Language should appear in language switcher
3. Select it and verify translations work

---

## 📝 Translation File Structure

All translation files follow this structure:

```json
{
  "common": { ... },      // Common UI elements
  "auth": { ... },        // Authentication pages
  "admin": { ... },       // Admin portal
  "user": { ... },        // User portal
  "errors": { ... }       // Error messages
}
```

**Keep the same keys**, only translate the values!

---

## 🔤 Supported Languages (Currently)

- ✅ English (`en`) - Default
- ✅ Arabic (`ar`) - RTL support
- ✅ French (`fr`)

**Add more by following the steps above!**

---

## 💡 Tips

1. **Use Translation Tools:**
   - Google Translate (for initial draft)
   - DeepL (better quality)
   - Professional translator (for production)

2. **Test RTL Languages:**
   - Arabic, Hebrew need `rtl: true`
   - UI automatically adjusts direction

3. **Keep Keys Consistent:**
   - Never change the keys (left side)
   - Only translate values (right side)

4. **Variables in Translations:**
   - Use `{{variable}}` syntax
   - Example: `"uploadedSuccess": "Successfully uploaded {{count}} image(s)."`

---

## 🚀 Quick Example: Adding Spanish

1. **Add to language service:**
```typescript
{ code: 'es', name: 'Español', flag: '🇪🇸', rtl: false }
```

2. **Create `es.json`** (copy from `en.json` and translate)

3. **Done!** Language appears in switcher automatically.

---

## 📚 Translation Keys Reference

See `frontend/src/assets/i18n/en.json` for all available keys.

**Common patterns:**
- `common.*` - Buttons, labels, common UI
- `auth.*` - Login page
- `admin.*` - Admin portal
- `user.*` - User search portal
- `errors.*` - Error messages
