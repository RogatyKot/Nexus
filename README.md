# Nexus Core AI - Local Setup

Ten projekt został wyeksportowany z Google AI Studio Build.

## Wymagania
- Node.js (v18 lub nowszy)
- npm lub yarn

## Instalacja

1. Rozpakuj pobrany plik ZIP.
2. Otwórz terminal w folderze projektu.
3. Zainstaluj zależności:
   ```bash
   npm install
   ```

## Konfiguracja
Utwórz plik `.env` w głównym katalogu i dodaj swój klucz API Gemini:
```env
GEMINI_API_KEY=twój_klucz_api
```

## Uruchamianie

Aby uruchomić serwer deweloperski:
```bash
npm run dev
```
Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

## Budowanie do produkcji
```bash
npm run build
```
Pliki wynikowe znajdą się w folderze `dist/`.
