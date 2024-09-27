 ## Principato Tours Web App

Principato Tours è un'applicazione web progettata per gestire in modo efficiente un'azienda di bus turistici. La piattaforma offre una dashboard amministrativa che consente di:

* Creare e gestire tour già programmati con destinazioni, durata, foto, descrizione e data.
* Consultare un calendario di disponibilità per verificare la disponibilità degli autobus e aggiornarla automaticamente.
* Permettere agli utenti di prenotare autobus in date specifiche per varie destinazioni, comunicando il numero di persone e la durata del viaggio.
* Gestire una chat multiutente, che consente all'amministratore di comunicare con ogni singolo utente, mentre gli utenti possono vedere solo i propri messaggi e quelli inviati dall'amministratore.
 ## Tecnologie utilizzate

 ## Client:

* HTML, CSS, JavaScript, Bootstrap
 ## Server:

* Node.js con le seguenti librerie e framework:
    * Express: per la gestione del server e delle rotte.
    * Socket.io: per la gestione della chat in tempo reale.
    * Multer: per la gestione dei file (es. foto dei tour).
    * Express-session: per gestire le sessioni utente.
    * Bcrypt: per la crittografia delle password.
    * Express-validator: per la validazione delle richieste.
    * Express-rate-limit: per limitare il numero di richieste ed evitare abusi.
    * Mongoose: per la gestione dei dati e degli schemi su MongoDB.
## Database:

* MongoDB utilizzato come database principale per gestire utenti, prenotazioni e tour.
* Mongoose: utilizzato per interfacciarsi con MongoDB e gestire la validazione e la struttura dei dati (es. schemi di bus, tour e prenotazioni).
Installazione

## Installazione
```
Nella cartella del progetto, esegui il seguente comando per installare tutte le dipendenze necessarie con npm:

```bash
npm install express, socket.io, multer, express-session, bcryptjs, express-validator, express-rate-limit, fs, mongoose
````

Assicurati di avere MongoDB installato e in esecuzione localmente. Puoi avviare il server con MongoDB


## Configurazione

Aggiorna il file config.json seguendo la struttura indicata di seguito:
```bash
{
    "mongodb": {
        "uri": "mongodb://localhost:27017",
        "dbName": "principatotours"
    },
    "server": {
        "port": 3000
    }
}
```
•	server.port: Specifica la porta su cui il server ascolterà (si può cambiare in base alle esigenze).
•	mongodb.uri: L’URI per connetterti al tuo server MongoDB. Assicurati che il tuo MongoDB sia in esecuzione su questa URI.
•	mongodb.dbName: Il nome del database che verrà utilizzato. In questo caso, il database si chiama principatotours.

## Avvio del server

Una volta installate tutte le dipendenze e configurato MongoDB, avvia il server con:

```bash
node server.js
````

## Accesso all'app

L'applicazione sarà disponibile all'indirizzo http://localhost:3000.

## Utilizzo

Gli amministratori possono accedere alla dashboard per:
Creare e gestire tour.
Gestire la disponibilità degli autobus.
Chattare con tutti gli utenti attraverso la chat multi utente.

Gli utenti possono:
Consultare il calendario delle disponibilità.
Prenotare un autobus intero per le date disponibili.
Prenotare un tour già programmato per un determinato numero di persone.
Comunicare con l'amministratore tramite la chat per chiedere informazioni.

## Requisiti di Sistema

Node.js (versione 14 o successiva).
MongoDB installato localmente o accessibile tramite URI remoto.
Qualsiasi sistema operativo in grado di eseguire Node.js.

