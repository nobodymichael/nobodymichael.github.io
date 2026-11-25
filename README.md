# NOBODY 2.0 — beta 0.2

Statyczna strona GitHub Pages. Bez npm, kompilacji, serwera aplikacji ani zewnętrznych CDN.

## Aktualizacja głównego repozytorium
1. Zrób kopię obecnego repozytorium (Code → Download ZIP) lub osobną gałąź backup.
2. NIE usuwaj `assets/bwip-js-min.js` — istniejąca biblioteka jest potrzebna dla Code 39, Aztec, Data Matrix, PDF417 i Micro QR. Paczka nie zawiera tego pliku. QR, EAN-13 i Code 128 działają bez niego.
3. Rozpakuj tę paczkę. Wgraj całą zawartość do głównego katalogu `nobodymichael.github.io`, nadpisując `index.html`, `tools/qr.html`, `tools/exif.html`. Nie twórz dodatkowego folderu.
4. Po sprawdzeniu działania możesz usunąć stare nieużywane pliki: `tools/convert.html`, `games/`, `assets/style.css`, `assets/site.js`, `assets/home-command.css`, `assets/home-command.js`, `assets/blockchain-n.svg`, `assets/apple-touch-icon.png`, `assets/qrcode.js`. Nie usuwaj innych nieznanych folderów, np. wallet, jeśli dodasz je później. Zachowaj ustawienia Pages i ewentualny CNAME/.github/.nojekyll.
5. Commit do gałęzi publikowanej przez Pages. Zweryfikuj adresy Donate, wykonaj twarde odświeżenie i sprawdź narzędzia.

## Funkcje
- Home: skrócone hero, poprawione odstępy, język polski z technicznymi nazwami angielskimi, karty narzędzi, Donate i terminal. Logo robocze. Terminal to skróty, a nie zabezpieczenie.
- QRGEN: QR, EAN-13 (cyfra kontrolna), Code 128, dodatkowe formaty po załadowaniu istniejącej biblioteki bwip-js. Kolory, PNG/SVG. Print Studio: pojedyncza wkładka (domyślnie 85 × 50 mm), pozycja X/Y, przeciąganie, uchwyt skalowania, obrót, siatka, preset lokalny, kopie, marginesy, odstęp, A4 i wydruk przez przeglądarkę. Wydruk wymaga ustawienia skali 100%, bez nagłówków i stopek; marginesy fizycznej drukarki mogą ograniczać wydruk.
- EXIF: JPEG/PNG/WebP, do 50 plików / 250 MB łącznie / 50 MB na plik. Rozpoznawanie nagłówków, wybrane tagi EXIF, wykaz bloków metadanych, SHA-256 (HTTPS), HEX, raport JSON, porównanie i ZIP. Lossless usuwa rozpoznane grupy bloków bez ponownej kompresji, zachowuje m.in. profil kolorów i minimalny tag orientacji JPEG, jeśli potrzebny. Deep Clean koduje piksele ponownie; bez obsługi animacji w tym trybie. Nie gwarantuje całkowitej anonimizacji. HEIC i precyzyjne usuwanie pojedynczych tagów EXIF nie są jeszcze obsługiwane.

## Testy i ograniczenia
- Test składni skryptów Node.js; wygenerowany QR odczytany przez OpenCV; JPEG, PNG i WebP z przykładowymi metadanymi oczyszczone na poziomie bajtów i porównane w Pillow — piksele identyczne, przykładowe dane usunięte, zachowana orientacja JPEG.
- Nie wykonano pełnych testów przeglądarkowych (lokalne strony zablokowane przez środowisko), fizycznego wydruku, Safari/iOS, wszystkich formatów kodów ani audytu bezpieczeństwa. Wdrożenie traktuj jako betę. Print Studio obsługuje jeden kod na wkładkę; kilka różnych kodów i własne napisy to kolejne rozszerzenie.
- Adresy BTC, ETH, SOL i TRX skopiowane z poprzedniej wersji; sprawdź przed użyciem. XMR pominięto, stary adres był placeholderem `test`.
- Biblioteki lokalne: silnik QR (QRCode for JavaScript, Kazuhiko Arase, MIT, adaptacja qrcode-terminal), JSZip (MIT/GPLv3, używana na zasadach MIT); licencje w `licenses/`. Biblioteka bwip-js pozostaje w repozytorium użytkownika.
