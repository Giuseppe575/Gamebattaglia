# Gamebattaglia – Stato attuale e spunti di miglioramento

## Cosa abbiamo fatto
- **Gating login**: `index.html` reindirizza a `login.html` se manca `loggedIn` in localStorage. Login e registrazione salvano sessione/dati base e tornano al gioco.
- **Nuove UI HTML** (layout ispirato alle PNG):
  - `login.html`: card con campi username/email e password, bottone login, link recupero, link registrazione, ritorno al gioco.
  - `register.html`: 4 campi (username, email, password, conferma), bottone register, link a login, ritorno al gioco.
  - `shop.html`: Negozio bonus con carte perk, livelli, costi, acquisto che scala i punti da `arctic_save`; aggiunta 500 punti; ritorno al gioco.
  - `settings.html`: impostazioni con slider e switch (audio, controlli, grafica, account, notifiche, legale) che salvano in localStorage; logout/bottone back.
- **Player**:
  - Usa sprite `player_run` per idle/run, dimensioni 260×220 (senza rotazione forzata).
  - Sparo verso destra (attuale settaggio), muzzle flash e colpi spawn dalla canna con offset.
- **Negozio autonomo**: `shop.html` gestisce punti e livelli in localStorage (`arctic_save`), niente bonus gratis.
- **Pagine collegate**: back link verso `index.html` su login/registrazione/shop/settings.

## Possibili miglioramenti
1. **Unificare stato e servizi**  
   - Estrarre in un JS condiviso (es. `auth.js`, `save.js`) il gating login, gestione `arctic_save`, e funzioni comuni (buyPerk, addMoney) per evitare duplicazioni tra index e shop.

2. **Routing e coerenza di sessione**  
   - Aggiungere una pagina di logout dedicata o un banner di stato (utente loggato) visibile anche sul gioco.
   - Gestire scadenza/invalidazione sessione (`loggedIn`) e refresh dei dati user (es. playerName) nel gioco.

3. **Negozio sincronizzato con il gioco**  
   - Caricare le funzioni reali di `buyPerk`/`addMoney` dal gioco quando possibile (es. includendo un bundle JS condiviso) per mantenere coerenza del save tra shop e canvas.
   - Aggiungere feedback visivi in `shop.html` (toast/success, errore, disabilitare pulsanti durante l’acquisto).

4. **UI/UX rifiniture**  
   - Animazioni leggere su hover e transizioni (focus input, bottone login/register).
   - Validazione form registrazione lato client (password match, email) e messaggistica inline invece di alert.
   - Theme toggle (chiaro/scuro) nelle impostazioni, coerente con le altre pagine.

5. **Accessibilità e performance**  
   - Migliorare semantica (label/aria-live per errori, focus outline personalizzati).
   - Minificare/compattare CSS inline in un file condiviso (`styles-ui.css`) e riutilizzare variabili colore tra le pagine.

6. **Integrazione audio/video**  
   - In `settings.html`, collegare slider al volume effettivo del gioco (master/music/sfx) se esposto via API del gioco.
   - Sincronizzare lo stato dei toggle (invertY, qualità grafica, fps) con le opzioni runtime del gioco, se disponibili.

7. **Deploy/build**  
   - Se il progetto cresce, separare le pagine in un piccolo bundle (es. Vite/Parcel) mantenendo output statico, per gestire meglio asset e versioning.
