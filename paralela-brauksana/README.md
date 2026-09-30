# Paralēlā braukšana

Paralēlās braukšanas (A–B līniju) palīgs lauksaimniecībai, kas darbojas telefona
pārlūkā un izmanto telefona iebūvēto GPS. Nav vajadzīga atsevišķa GPS iekārta
traktorā.

## Kā atvērt

Lapa ir statiska: `index.html`, `app.js`, `guidance.js`, `app.css`. Nav būvēšanas
soļa. Atver to no HTTPS adreses (GitHub Pages der) vai no `localhost`, jo
pārlūks GPS piekļuvi atļauj tikai drošā kontekstā.

Telefonā pārlūka izvēlnē izvēlies „Pievienot sākuma ekrānam”. Lietotne darbojas
bezsaistē (service worker), un visi dati paliek tikai ierīcē (`localStorage`).

## Lietošana

1. Nostiprini telefonu kabīnē ar brīvu skatu uz debesīm un atļauj piekļuvi
   atrašanās vietai.
2. Iestatījumos ievadi agregāta darba platumu.
3. Brauc pa pirmo joslu, nospied **A**, brauc taisni līdz joslas beigām un
   nospied **B**. Režīmā „A + virziens” pietiek ar A punktu un kursu.
4. Apgriezies un brauc pa nākamo joslu. LED josla, bultiņa un cipars rāda, cik
   tālu un uz kuru pusi jāstūrē. Josla ar numuru 0 ir AB līnija, pārējās ir
   paralēlas ar darba platuma soli.
5. Ieslēdz **Pārklājumu**, kad agregāts strādā, un izslēdz apgriešanās joslā.
   Karte iekrāso apstrādāto un rāda aptuveno platību hektāros.
6. Ja GPS „aizpeld”, nostājies uz joslas centra un nospied **Centrēt** vai
   pabīdi līniju ar bultiņu pogām.

Tastatūra (uz datora): `A`, `B`, `C` (pārklājums), `+`/`-` (mērogs). Demo režīmā
bultiņas stūrē un maina ātrumu.

## Precizitāte

Telefona GPS precizitāte parasti ir 2–5 m un uzlabojas, braucot vienmērīgi.
Lietotne rāda pašreizējo precizitāti (±m) un zīmē to kā apli ap traktoru.
Centimetru precizitātei var pieslēgt ārēju Bluetooth GNSS (RTK) uztvērēju, kas
telefonā darbojas kā atrašanās vietas avots (Android: „mock location”); lietotne
tad automātiski izmanto precīzākos datus.

## Faili

| Fails | Saturs |
| --- | --- |
| `guidance.js` | Ģeometrija bez DOM: WGS84 → lokāla ENU plakne, novirze no tuvākās joslas, līnijas pabīde, platība. |
| `app.js` | GPS, kursa novērtēšana, LED josla, kartes zīmēšana, pārklājums, iestatījumi, demo režīms. |
| `sw.js` | Service worker bezsaistes darbam. |
| `manifest.webmanifest` | PWA manifests, lai lietotni var instalēt sākuma ekrānā. |
