# Gestionale Studio di Psicologia

Applicazione web per gestire pazienti, fatture e report di uno studio di
psicologia in regime forfettario.

## Funzionalità

- **Pazienti**: anagrafica completa (nome, cognome, codice fiscale, contatti,
  indirizzo) con tariffa a seduta personalizzata per ciascun paziente.
- **Fatture**: creazione con numerazione progressiva automatica (`n/anno`),
  generazione del PDF, stampa, invio via email al paziente, tracciamento
  pagato/non pagato con data e metodo di pagamento.
- **Report**: fatturato emesso, incassato, importo ancora da incassare,
  andamento mensile, e stima del netto dopo imposte e contributi in regime
  forfettario (parametri configurabili in Impostazioni).
- Interfaccia colorata, pensata per essere semplice da usare anche da chi non
  è pratico di computer.

## Stack tecnico

Next.js 14 (App Router) + TypeScript + Tailwind CSS, database PostgreSQL con
Prisma ORM, generazione PDF con `pdf-lib`, invio email con `nodemailer`
(Gmail SMTP). Accesso protetto da un login a singolo utente (la psicologa).

## Avvio in locale

1. Installa le dipendenze:

   ```bash
   npm install
   ```

2. Copia `.env.example` in `.env` e compila i valori (vedi sotto).

3. Scegli una password robusta per l'accesso e mettila in `ADMIN_PASSWORD`
   dentro `.env` (insieme a `ADMIN_EMAIL`, l'indirizzo con cui accedere).

4. Genera una `SESSION_SECRET` casuale:

   ```bash
   openssl rand -hex 32
   ```

5. Sincronizza lo schema del database (serve un Postgres raggiungibile
   dall'indirizzo indicato in `DATABASE_URL`, ad es. via Docker):

   ```bash
   npx prisma db push
   ```

6. Avvia il server di sviluppo:

   ```bash
   npm run dev
   ```

   L'app è disponibile su http://localhost:3000.

## Variabili d'ambiente

Vedi `.env.example` per l'elenco completo. Le principali:

- `DATABASE_URL` — connessione al database Postgres.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credenziali di accesso.
- `SESSION_SECRET` — chiave per firmare il cookie di sessione.
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` — per l'invio delle fatture via email
  (vedi sotto come generare la password per le app).

### Password per le app di Gmail

1. Vai su https://myaccount.google.com/apppasswords (serve la verifica in
   due passaggi attiva sull'account Google).
2. Crea una nuova password per l'app "Mail" e copiala in
   `GMAIL_APP_PASSWORD`.
3. Usa il tuo indirizzo Gmail completo in `GMAIL_USER`.

Non usare mai la password normale del tuo account Gmail: usa sempre una
password per le app dedicata.

## Deploy su Railway (con deploy automatico da GitHub)

1. Crea un nuovo progetto su [railway.app](https://railway.app) e collega
   questo repository GitHub: Railway farà un nuovo deploy automaticamente ad
   ogni push sul branch principale.
2. Aggiungi un plugin **PostgreSQL** al progetto: Railway imposterà da solo
   la variabile `DATABASE_URL` sul servizio dell'app.
3. Nelle variabili d'ambiente del servizio, aggiungi: `ADMIN_EMAIL`,
   `ADMIN_PASSWORD`, `SESSION_SECRET`, `GMAIL_USER`,
   `GMAIL_APP_PASSWORD`, `MAIL_FROM_NAME` (vedi sopra per come generarle).
4. Al primo deploy, l'app crea automaticamente le tabelle nel database
   (comando `prisma db push` eseguito all'avvio, vedi `package.json`).
5. Apri l'URL pubblico generato da Railway e accedi con le credenziali
   configurate.

Ad ogni modifica del codice pushata su GitHub, Railway rifà automaticamente
la build e il deploy: non serve nessuna azione manuale.

## Note sui calcoli fiscali

I calcoli mostrati nella sezione Report (reddito imponibile, imposta
sostitutiva, netto stimato) sono una stima basata sui parametri impostati in
Impostazioni (coefficiente di redditività, aliquota dell'imposta sostitutiva,
aliquota dei contributi previdenziali) applicati al solo **incassato**
nell'anno (principio di cassa), in linea con il funzionamento del regime
forfettario. Per il calcolo definitivo delle imposte dovute fai sempre
riferimento al tuo commercialista.

Anche il testo che compare sulle fatture PDF (dicitura del regime
forfettario, eventuale imposta di bollo) è indicativo: verifica con il tuo
commercialista che sia corretto per la tua situazione specifica.
