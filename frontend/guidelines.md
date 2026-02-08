# Hoop Lab Gym - Guidelines

## Architettura
Frontend-only (React + Vite + TailwindCSS + shadcn/ui) + Firebase (Auth + Firestore). No backend.
Deploy: Vercel.

## Naming
- **Corso**: ricorrenza di lezioni (es. "Hoop Base" ogni martedì 16-17 e giovedì 19-20)
- **Lezione**: singola istanza/occorrenza di un corso

## Funzionalità core
App per un'insegnante di Hoop (cerchio, danza acrobatica).

### Utenti
- Prenotano singole lezioni (max 7gg nel futuro da ora)
- Vedono calendario settimanale stile Google Calendar con lezioni come blocchi colorati (colore diverso per corso)
- Possono cliccare un blocco per prenotarsi o vedere se sono già prenotati
- Vedono le altre persone prenotate (app a uso familiare, no problemi di privacy)
- Hanno un riepilogo delle proprie lezioni prenotate future
- Le lezioni a cui sono già prenotati devono essere distinguibili at-a-glance nel calendario

### Admin
**Corsi:**
- Crea/modifica corsi con: nome, descrizione, colore, ricorrenza (giorni + orari), capacità max (default 10)
- Può spostare una singola lezione (override orario per una data specifica)
- Può spostare l'intero corso (cambiare la ricorrenza stabilmente)

**Prenotazioni:**
- Vede tutte le prenotazioni per ogni lezione

**Utenti:**
- Lista di tutti gli utenti registrati
- Due tipologie di pagamento (settabili solo dall'admin): **mensile** e **per-lesson**
- Utente mensile: campo pagato/non pagato per mese, con storico mesi precedenti
- Utente per-lesson: tracciamento delta tra lezioni frequentate e lezioni pagate (modo più semplice possibile, no tracking di quali lezioni specifiche)
- Campo note libero per ogni utente

## Auth
Firebase Auth: login con Google + login con email/password.
Ruolo admin gestito tramite campo `role` nel documento Firestore dell'utente (`role: 'admin'` o `role: 'user'`).

## Design
- Mobile-first
- Soft gradients, pastel colors, modern and clean
- Cards moderne e curate
- Calendario bello esteticamente, lezioni come blocchi colorati per corso
- UI minimal e user-friendly
- Elementi grafici che richiamano i cerchi/hoop (archi decorativi, anelli sottili, cerchi concentrici come sfondo, bordi circolari) — eleganti, mai pacchiani