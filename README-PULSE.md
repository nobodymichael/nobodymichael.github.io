# PULSE — Signature Edition

## Instalacja (GitHub Pages)
Rozpakuj ZIP do katalogu głównego repozytorium `nobodymichael.github.io`, zachowując ścieżki `assets/` i `tools/`. Nadpisz pliki PULSE. Nie usuwaj innych plików repozytorium. Adres: https://nobodymichael.github.io/tools/pulse.html
Jeżeli korzystasz z publikacji z gałęzi `main` / `(root)`, nie potrzebujesz własnego workflow ani procesu budowania. Stary workflow raportów Gemini można usunąć, jeśli nie służy innym funkcjom, po skonfigurowaniu publikacji z gałęzi.

## Dane
- CoinGecko: BTC i ETH, ceny USD i zmiana 24h; Coinbase jako źródło zapasowe.
- Gold API: spot XAU i XAG w USD za uncję trojańską; ratio z obu cen.
- Alternative.me: dzienny Fear & Greed.
- NBP: USD/PLN i EUR/PLN z ostatnich dwóch tabel A; procent wobec poprzedniej publikacji, nie notowania intraday.
- Snapshot: deterministyczne reguły; metale porównywane wyłącznie do niedawnego poprzedniego odczytu, gdy jest dostępny. Nie ma wymyślonych zmian 24h dla metali.
- Odświeżanie co 5 minut w widocznym oknie. Dane zapisane lokalnie przy awarii są oznaczane. Bez kluczy API.

## Aplikacja
Własna ikona, manifest oraz instrukcja dodawania do ekranu głównego w pływającym menu. Safari: Udostępnij → Do ekranu początkowego → Dodaj. Nie można wymusić przełączenia do Safari z każdej innej aplikacji. Brak gwarancji natywnego promptu instalacji na wszystkich przeglądarkach; aplikacja wymaga internetu do bieżących notowań.

## Wygląd i start
Paleta oparta na rzeczywistym arkuszu CSS strony głównej NOBODY: #101110, #8aff8a, #43ff29. Start trwa około 5,75 s łącznie z przejściem, bez przycisku pomijania. Dane pobierane są równolegle; w razie wolnego połączenia terminal po animacji pokazuje aktualny status. Ustawienie systemowe ograniczenia ruchu zachowuje ekran startowy, ale bez intensywnych animacji.

## Weryfikacja
Sprawdzono składnię JavaScript, ekran startowy bez pomijania, blokadę elementów pod animacją, dane symulowane, kurs NBP, menu i brak poziomego przewijania w Chromium (1440 i 390 px). Nawigacja do rzeczywistej strony była zablokowana przez środowisko testowe, dlatego test wykonano w osadzonym dokumencie. Instalacja na iPhonie i rzeczywiste API nie były ponownie testowane.

## Signature — Mobile layout
Na ekranach do 600 px: nagłówek kompaktowy, Market Snapshot i waluty, następnie cztery ceny w układzie 2×2, a dopiero niżej Fear & Greed oraz Gold/Silver Ratio. Mniej powtarzanych nagłówków. Aktualność i źródła danych pozostają widoczne. Wyłączony przyklejony hover na ekranach dotykowych, animacje zmian cen i startowe zachowane. Desktop bez zmiany układu. Nadpisz tools/pulse.html i assets/pulse.css; wersja arkusza CSS została zmieniona w HTML.
