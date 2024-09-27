
const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const MongoStore = require('connect-mongo');


const session = require('express-session');
const sharedSession = require('socket.io-express-session');


// Mongoose per MongoDB
const mongoose = require('mongoose');

// Connessione a MongoDB

const fs = require('fs');

// Carica la configurazione
const config = JSON.parse(fs.readFileSync('config.json'));

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Funzione di connessione al database
const connectToDatabase = async () => {
    try {
        await mongoose.connect(`${config.mongodb.uri}/${config.mongodb.dbName}`);
        console.log(`Connesso al database: ${config.mongodb.dbName}`);
        // Creazione dell'utente admin (se necessario)
        createAdminUser(); // Commentato se non necessario
    } catch (error) {
        console.error('Errore durante la connessione al database:', error);
    }
};

// Inizializza il server e la connessione al database
connectToDatabase();  // Connessione al database

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static('assets'));
app.use('/views', express.static('assets/views'));


// Definizione dello schema utente con Mongoose
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
// Middleware per gestire le richieste
app.use(express.json());
app.use(express.static('assets'));
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/views', express.static(path.join(__dirname, 'assets/views')));





// Configura il middleware di sessione per usare MongoDB
const sessionMiddleware = session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost:27017/tuo_database', // URL del tuo database MongoDB
        collectionName: 'sessions', // Nome della collezione per salvare le sessioni
    }),
    cookie: { secure: false }
});
app.use(sessionMiddleware);

io.use(sharedSession(sessionMiddleware, {
    autoSave: true // Salva automaticamente la sessione
}));
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});
// Limita il numero di tentativi di login per evitare attacchi di forza bruta
const loginLimiter = rateLimit({
    windowMs: 15 * 60 , // 15 minuti
    max: 5, // Limita ogni IP a 5 richieste per finestra di 15 minuti
    message: 'Troppi tentativi di login. Riprova tra 15 minuti.'
});
// Modello per gli utenti
const User = mongoose.model('User', userSchema);
app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.user.username !== 'admin') {
        return res.status(401).send('Non autorizzato');
    }
    res.sendFile(__dirname + '/assets/views/admin.html');
});
// Definizione dello schema delle prenotazioni
const busBookingSchema = new mongoose.Schema({
    username: String,
    busId: Number,
    seatsRequested: Number,
    destinations: [String],
    tripDuration: Number,
    date: Date,
    status: { type: String, default: 'pending' }
});
const BusBooking = mongoose.model('BusBooking', busBookingSchema);


const bookingSchema = new mongoose.Schema({
    nome: { type: String },
    cognome: { type: String },
    numeroDocumento: { type: String },
    busId: { type: Number, required: false },
    seatsRequested: { type: Number },
    destinations: { type: [String] },
    tripDuration: { type: Number },
    date: { type: Date },
    status: { type: String, default: 'pending' },
    scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
    tourName: String,
    price: { type: Number },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Aggiungi questo campo
});

const Booking = mongoose.model('Booking', bookingSchema);

const busSchema = new mongoose.Schema({
    busId: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    capacity: { type: Number, required: true },
    image: { type: String }, // Percorso dell'immagine
    availability: { type: Map, of: String } // Usato per memorizzare disponibilità per date specifiche
});

const Bus = mongoose.model('Bus', busSchema);

// Modello per i tour (Schedule)
const scheduleSchema = new mongoose.Schema({
    destination: { type: String, required: true },
    busId: { type: Number, required: true },
    date: { type: Date, required: true },
    description: { type: String },
    image: { type: String },
    duration: { type: Number, required: true },
    capacity: { type: Number, required: true },  // Aggiunta del campo 'capacity'
    price: { type: Number, required: true } // Nuovo campo prezzo

});
const messageSchema = new mongoose.Schema({
    sender: String,
    recipient: String, // Per conservare l'utente a cui è diretto il messaggio
    message: String,
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

const Schedule = mongoose.model('Schedule', scheduleSchema);



async function createAdminUser() {
    try {
        const existingAdmin = await User.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('L\'utente admin esiste già');
            return;
        }

        // Cifra la password prima di salvarla
        const hashedPassword = await bcrypt.hash('password1', 10);

        const admin = new User({
            username: 'admin',
            password: hashedPassword
        });
        await admin.save();
        console.log('Utente admin creato con successo');
    } catch (err) {
        console.error('Errore durante la creazione dell\'utente admin:', err);
    }
}
function formatItalianDate(date) {
    if (!date) return null; // Gestisce il caso in cui la data non sia presente
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Intl.DateTimeFormat('it-IT', options).format(new Date(date));
}



app.post('/register', async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username: username });
        if (existingUser) {
            return res.status(400).send('Utente già esistente');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });

        await newUser.save();
        res.status(200).send('Utente registrato con successo');
    } catch (error) {
        res.status(500).send('Errore nel server');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username: username });
        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                req.session.user = {
                    _id: user._id, // Assicurati che questo sia l'ID dell'utente
                    username: user.username
                };
                console.log(req.session.user);
                res.status(200).send('Login avvenuto con successo');
                
            } else {
                res.status(401).send('Credenziali non valide');
            }
        } else {
            res.status(401).send('Credenziali non valide');
        }
    } catch (error) {
        res.status(500).send('Errore nel server');
    }
});

// ----------------------
// ROTTE PER LA GESTIONE DELLE PRENOTAZIONI
// ----------------------

// Configurazione multer per l'upload delle immagini

const tourStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'assets/img/tours')); // Cartella per le immagini dei tour
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // Estrai l'estensione del file
        const timestamp = Date.now(); // Ottieni il timestamp attuale
        const newFileName = `tour-${timestamp}${ext}`; // Rinomina il file con timestamp
        cb(null, newFileName); // Usa il nuovo nome
    }
});

const uploadTour = multer({ storage: tourStorage });


const storageBus = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'assets/img/')); // Cartella per le immagini dei bus
    },
    filename: async (req, file, cb) => {
        try {
            // Verifica se il bus esiste nel database
            const bus = await Bus.findOne({ busId: parseInt(req.params.id) }); // Usando busId numerico
            if (!bus) {
                return cb(new Error('Bus non trovato'));
            }

            const ext = path.extname(file.originalname); // Estrai l'estensione del file
            cb(null, `bus-${bus.busId}${ext}`); // Usa l'ID del bus dal database
        } catch (err) {
            cb(err);
        }
    }
});

const uploadBus = multer({ storage: storageBus });


// Configurazione di Multer
const storageBusUp = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'assets/img/')); // Cartella per le immagini dei bus
    },
    filename: async (req, file, cb) => {
        try {
            // Trova l'ID del bus più alto e incrementa
            const lastBus = await Bus.findOne().sort({ busId: -1 });
            const busId = lastBus ? lastBus.busId + 1 : 1;

            const ext = path.extname(file.originalname); // Estrai l'estensione del file
            cb(null, `bus-${busId}${ext}`); // Usa l'ID del bus
        } catch (err) {
            cb(err);
        }
    }
});

const upload = multer({ storage: storageBusUp });

app.post('/admin/add-bus', upload.single('photo'), async (req, res) => {
    console.log('File ricevuto:', req.file); // Aggiungi questo log per controllare il file
    try {
        const { model, driver, capacity } = req.body;

        // Log dei dati ricevuti
        console.log('Dati ricevuti:', req.body);

        // Validazione dei dati
        if (!model || !driver || isNaN(parseInt(capacity))) {
            return res.status(400).json({ success: false, message: 'Dati non validi' });
        }

        // Trova l'ID del bus più alto e incrementa
        const lastBus = await Bus.findOne().sort({ busId: -1 });
        const busId = lastBus ? lastBus.busId + 1 : 1;

        // Crea il nuovo autobus
        const newBus = new Bus({
            busId,
            name: `${model} by ${driver} Driver`,
            capacity: parseInt(capacity),
            image: req.file ? `/assets/img/bus-${busId}${path.extname(req.file.originalname)}` : null, // Salva il percorso dell'immagine
            availability: {}
        });

        // Salva il nuovo autobus
        await newBus.save();
        console.log('Autobus aggiunto con successo:', newBus);
        
        // Risposta di successo
        res.json({ success: true, bus: newBus });
    } catch (error) {
        console.error('Errore nell\'aggiunta dell\'autobus:', error);
        
        // Risposta di errore
        res.status(500).json({ success: false, message: 'Errore nel server', error: error.message });
    }
});

const uploadEditTour = multer({
    dest: path.join(__dirname, 'assets/img/tours'), // Imposta solo la destinazione
});

app.put('/admin/schedules/:id', uploadEditTour.single('tourImage'), async (req, res) => {
    if (!req.session.user || req.session.user.username !== 'admin') {
        return res.status(401).send('Non autorizzato');
    }

    console.log('File ricevuto:', req.file); // Logga il file ricevuto
    console.log('Body della richiesta:', req.body); // Logga il corpo della richiesta

    const { id } = req.params;
    const { destination, newBusId, newDuration, date, description, newcapacity } = req.body;

    // Funzione per convertire la data dal formato italiano a ISO
    const convertDateToISO = (dateStr) => {
        const [day, month, year] = dateStr.split('/');
        return new Date(`${year}-${month}-${day}T00:00:00Z`);
    };

    try {
        const oldSchedule = await Schedule.findById(id);
        console.log('Vecchio Tour:', oldSchedule);
        if (!oldSchedule) {
            return res.status(404).send('Tour non trovato');
        }

        const oldDateISO = new Date(oldSchedule.date); // La data è già in formato ISO nel DB
        const newDateISO = convertDateToISO(date); // Converte la nuova data in formato ISO

        // Converti e verifica i parametri prima di utilizzarli
        const busIdNumber = parseInt(newBusId, 10);
        const durationNumber = parseInt(newDuration, 10);
        const capacityNumber = parseInt(newcapacity, 10);

        if (isNaN(busIdNumber) || isNaN(durationNumber) || isNaN(capacityNumber)) {
            return res.status(400).json({ error: 'newBusId, newDuration o newcapacity devono essere numeri validi' });
        }

        const updateData = {
            destination,
            busId: busIdNumber,
            duration: durationNumber,
            date: newDateISO, // Utilizza la nuova data in formato ISO
            description,
            capacity: capacityNumber // Usa il valore corretto per 'capacity'
        };

        console.log('Dati per l\'aggiornamento:', updateData);

        if (req.file) {
            const newImagePath = `/assets/img/tours/${req.file.filename}`;
            updateData.image = newImagePath; // Aggiorna l'immagine del tour
        } else {
            console.log('Nessun nuovo file caricato'); // Debug
        }

        // Ripristina la disponibilità del bus per il vecchio tour
        await resetBusAvailability({
            busId: oldSchedule.busId,
            date: oldDateISO,
            tripDuration: oldSchedule.duration
        });

        // Aggiorna il tour
        const updatedTour = await Schedule.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedTour) {
            return res.status(404).send('Tour non trovato');
        }

        // Aggiorna la disponibilità del bus per il nuovo tour
        await updateBusAvailability({
            busId: updateData.busId,
            date: newDateISO,
            tripDuration: updateData.duration
        });

        res.status(200).json({ message: 'Tour aggiornato con successo', schedule: updatedTour });
    } catch (error) {
        console.error('Errore durante l\'aggiornamento del tour:', error);
        res.status(500).send('Errore durante l\'aggiornamento del tour.');
    }
});





app.put('/admin/buses/:id', uploadBus.single('busImage'), async (req, res) => {
    const busId = req.params.id; // L'ID deve essere l'ObjectId se lo usi nel database
    const { name, capacity } = req.body;

    try {
        // Assicurati di cercare con l'ObjectId se il tuo busId è di tipo ObjectId
        const bus = await Bus.findOne({ busId: parseInt(busId) }); // Usando busId numerico
        if (!bus) {
            return res.status(404).json({ message: 'Autobus non trovato.' });
        }

        // Aggiorna i campi dell'autobus
        bus.name = name;
        bus.capacity = capacity;

        if (req.file) {
            bus.image = `/uploads/bus-images/${req.file.filename}`;
        }

        await bus.save();
        res.status(200).json({ message: 'Autobus aggiornato con successo.', bus });
    } catch (error) {
        console.error('Errore durante l\'aggiornamento dell\'autobus:', error); // Log dettagliato dell'errore
        res.status(500).json({ message: 'Errore durante l\'aggiornamento dell\'autobus.' });
    }
});


app.delete('/admin/buses/:id', async (req, res) => {
    const busId = req.params.id;

    try {
        const bus = await Bus.findOneAndDelete({ busId: parseInt(busId) });
        if (!bus) {
            return res.status(404).json({ message: 'Autobus non trovato.' });
        }

        res.status(200).json({ message: 'Autobus eliminato con successo.' });
    } catch (error) {
        res.status(500).json({ message: 'Errore durante l\'eliminazione dell\'autobus.' });
    }
});
app.get('/admin/bus-availabilities', async (req, res) => {
    if (!req.session.user || req.session.user.username !== 'admin') {
        return res.status(401).send('Non autorizzato');
    }

    try {
        const buses = await Bus.find();
        res.json(buses);
    } catch (error) {
        res.status(500).json({ message: 'Errore durante il recupero delle disponibilità degli autobus.' });
    }
});
app.post('/admin/bus-availabilities', async (req, res) => {
    if (!req.session.user || req.session.user.username !== 'admin') {
        return res.status(401).send('Non autorizzato');
    }

    const { busId, date, status, capacity } = req.body;

    try {
        const bus = await Bus.findOne({ busId: parseInt(busId) });
        console.log(bus);
        if (!bus) {
            return res.status(404).send('Autobus non trovato');
        }

        // Aggiornamento della disponibilità e capacità
        if (date) {
            bus.availability.set(date, status);
        }
        if (capacity !== undefined) {
            bus.capacity = capacity;
        }

        await bus.save();

        // Emetti l'evento a tutti i client con le nuove disponibilità del bus
        io.emit('adminBusAvailabilityUpdate', {
            busId: busId,
            availability: bus.availability
        });

        return res.status(200).send('Informazioni autobus aggiornate con successo');
    } catch (error) {
        res.status(500).json({ message: 'Errore durante l\'aggiornamento delle informazioni dell\'autobus.' });
    }
});






// Visualizzare tutte le prenotazioni di un utente
app.get('/bookings/:username', async (req, res) => {
    const { username } = req.params;

    try {
        // Trova l'utente usando il nome utente
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        // Trova tutte le prenotazioni associate all'ID dell'utente
        const bookings = await BusBooking.find({ user: user._id }).populate('scheduleId');

        // Restituisci le prenotazioni trovate
        res.status(200).json(bookings);
    } catch (error) {
        console.error('Errore nel recupero delle prenotazioni:', error);
        res.status(500).json({ message: 'Errore durante il recupero delle prenotazioni' });
    }
});
app.get('/bus/capacity/:busId', async (req, res) => {
    const busId = req.params.busId;
    try {
        const bus = await Bus.findOne({ busId: busId });
        if (bus) {
            res.json({ capacity: bus.capacity });
        } else {
            res.status(404).json({ error: 'Bus non trovato' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Errore del server' });
    }
});

app.get('/user/bus-availabilities', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Non autorizzato');
    }

    try {
        const buses = await Bus.find({});
        const filteredBusAvailabilities = buses.map(bus => ({
            busId: bus.busId,
            name: bus.name,
            capacity: bus.capacity,
            availability: bus.availability,
        }));

        res.json(filteredBusAvailabilities);
    } catch (error) {
        res.status(500).send('Errore del server');
    }
});
app.get('/current-user', async (req, res) => {
    if (req.session.user) {
        try {
            const user = await User.findOne({ username: req.session.user.username });
            if (!user) {
                return res.status(404).json({ error: 'Utente non trovato' });
            }
            res.json({ username: user.username });
        } catch (err) {
            return res.status(500).json({ error: 'Errore server' });
        }
    } else {
        res.status(401).json({ error: 'Utente non loggato' });
    }
});



app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Logout fallito');
        }
        res.status(200).send('Logout eseguito con successo');
    });
});
app.get('/schedules', async (req, res) => {
    try {
        const schedules = await Schedule.find();
        
        // Formatta le date degli orari
        const formattedSchedules = schedules.map(schedule => ({
            ...schedule.toObject(), // Copia tutte le proprietà
            date: formatItalianDate(schedule.date) // Formatta la data
        }));

        res.json(formattedSchedules); // Restituisci i dati formattati in JSON
    } catch (error) {
        console.error('Errore nel recupero degli orari:', error);
        res.status(500).send('Errore nel server');
    }
});




app.post('/admin/schedules', uploadTour.single('tourImage'), async (req, res) => {
    if (!req.session.user || req.session.user.username !== 'admin') {
        return res.status(401).send('Non autorizzato');
    }

    const { destination, busId, date, description, duration, capacity,price } = req.body;
    const image = req.file ? `/assets/img/tours/${req.file.filename}` : '';

    const busCapacity = Number(capacity)
    const tourPrice = Number(price);

    if (isNaN(busCapacity) || busCapacity <= 0) {
        return res.status(400).send('La capacità del bus è richiesta e deve essere un numero valido.');
    }

    try {
        const isBooked = await isTourBooked(parseInt(busId), new Date(date), parseInt(duration));
        if (isBooked) {
            return res.status(400).send('La data è già prenotata per questo bus.');
        }

        const newSchedule = new Schedule({
            destination,
            busId,
            date,
            description,
            image,
            duration,
            capacity: busCapacity,
            price: tourPrice
        });

        await newSchedule.save();
        await updateBusAvailability({
            busId: parseInt(busId),
            date: new Date(date),
            tripDuration: parseInt(duration),
        });

        res.status(200).send('Tour aggiunto con successo e disponibilità del bus aggiornata');
    } catch (error) {
        console.error('Errore nel salvataggio del tour o nell\'aggiornamento della disponibilità:', error);
        res.status(500).send('Errore nel server');
    }
});





// Route per cancellare un tour
app.delete('/admin/schedules/:id', async (req, res) => {
    if (!req.session.user || req.session.user.username !== 'admin') {
        return res.status(401).send('Non autorizzato');
    }

    const scheduleId = req.params.id;

    try {
        // Trova e rimuovi il tour
        const deletedSchedule = await Schedule.findByIdAndDelete(scheduleId);
        if (!deletedSchedule) {
            return res.status(404).send('Tour non trovato');
        }

        // Trova tutte le prenotazioni associate a questo scheduleId
        const bookings = await Booking.find({ scheduleId: scheduleId });

        for (let booking of bookings) {
            // Converti lo scheduleId in un numero
            let hexString = booking.scheduleId.toHexString();
            let numericValue = parseInt(hexString, 16);

            console.log('Booking schedule id: ', numericValue);
            console.log('Schedule id: ', scheduleId);

            // Confronta e rimuovi la prenotazione se corrisponde
            if (numericValue === parseInt(scheduleId, 16)) {
                const deletedBooking = await Booking.findByIdAndDelete(booking._id);
                if (!deletedBooking) {
                    return res.status(404).send('Prenotazione non trovata');
                }
            }
        }

        await resetBusAvailability({
            busId: deletedSchedule.busId,
            date: new Date(deletedSchedule.date),
            tripDuration: deletedSchedule.duration,
        });

        res.status(200).send('Tour eliminato con successo');
    } catch (error) {
        console.error('Errore nella cancellazione del tour:', error);
        res.status(500).send('Errore nel server');
    }
});

app.post('/bookings', async (req, res) => {
    const { scheduleId, firstName, lastName, documentNumber, seatsRequestedBooking,usersId } = req.body;
    if (!req.session.user) {
        return res.status(401).send('Utente non autenticato');
    }

    console.log('Dati inviati:', {
        scheduleId,
        firstName,
        lastName,
        documentNumber,
        seatsRequestedBooking,
        usersId 
    });

    try {
        const schedule = await Schedule.findById(scheduleId);

        if (!schedule) {
            return res.status(404).send('Tour non trovato');
        }

        const seatsRequested = Number(seatsRequestedBooking);
        if (isNaN(seatsRequested) || seatsRequested <= 0) {
            return res.status(400).send('Numero di posti richiesti non valido');
        }

        if (schedule.capacity < seatsRequested) {
            return res.status(400).send('Capacità insufficiente per questo tour');
        }

        // Riduci la capacità e salva il nuovo stato
        schedule.capacity -= seatsRequested;
        await schedule.save();

        const newBooking = new Booking({
            nome: firstName,
            cognome: lastName,
            numeroDocumento: documentNumber,
            scheduleId: schedule._id,
            seatsRequested: seatsRequested,
            date: schedule.date, // Mantieni la data del tour
            tourName: schedule.destination, // Aggiungi il nome del tour
            user: usersId // Aggiungi l'ID dell'utente
        });
        await newBooking.save();

        res.status(200).send('Prenotazione effettuata con successo');
    } catch (error) {
        console.error('Errore nella prenotazione:', error);
        res.status(500).send('Errore del server');
    }
});
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.json({ userId: req.session.user._id, username: req.session.user.username });
    } else {
        res.status(401).json({ message: 'Utente non autenticato' });
    }
});

async function resetBusAvailability(booking) {
    try {
        const bus = await Bus.findOne({ busId: booking.busId });

        if (!bus) {
            console.log('Bus non trovato per ID:', booking.busId);
            return;
        }

        const startDate = new Date(booking.date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + booking.tripDuration - 1); // Includi il giorno di partenza

        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];

            console.log(`Ripristinando la disponibilità per la data: ${dateString}`);

            if (bus.availability.has(dateString)) {
                if (bus.availability.get(dateString) === 'booked') {
                    bus.availability.set(dateString, 'available');
                    console.log(`Disponibilità ripristinata per la data: ${dateString} a 'available'`);
                } else {
                    console.log(`La data ${dateString} non era 'booked', stato attuale: ${bus.availability.get(dateString)}`);
                }
            } else {
                console.log(`La data ${dateString} non esiste nella mappa di disponibilità.`);
            }

            currentDate.setDate(currentDate.getDate() + 1); // Passa al giorno successivo
        }

        await bus.save();
        console.log('Disponibilità del bus ripristinata:', bus.availability);
    } catch (err) {
        console.error('Errore durante il ripristino della disponibilità del bus:', err);
    }
}


async function initializeBusAvailability(bus, startDate, endDate) {
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Imposta la disponibilità a 'available' se non esiste già
        if (!bus.availability.has(dateString)) {
            bus.availability.set(dateString, 'available');
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

async function updateBusAvailability(booking) {
    try {
        const busId = parseInt(booking.busId, 10);

        if (isNaN(busId)) {
            console.error('Errore: busId non è un numero valido:', booking.busId);
            return; // Esce dalla funzione se `busId` non è valido
        }
        const bus = await Bus.findOne({ busId: booking.busId });

        if (!bus) {
            console.log('Bus non trovato per ID:', booking.busId);
            return;
        }

        const startDate = new Date(booking.date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + booking.tripDuration - 1); // Includi il giorno di partenza

        // Inizializza la disponibilità se non è già stata impostata
        await initializeBusAvailability(bus, startDate, endDate);

        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];

            console.log(`Aggiornando la disponibilità per la data: ${dateString}`);

            if (bus.availability.has(dateString)) {
                if (bus.availability.get(dateString) === 'available') {
                    bus.availability.set(dateString, 'booked');
                    console.log(`Disponibilità aggiornata per la data: ${dateString} a 'booked'`);
                } else {
                    console.log(`La data ${dateString} è già ${bus.availability.get(dateString)}`);
                }
            } else {
                console.log(`La data ${dateString} non esiste nella mappa di disponibilità.`);
            }

            currentDate.setDate(currentDate.getDate() + 1); // Passa al giorno successivo
        }

        await bus.save();
        console.log('BUS DOPO:', bus.availability);
    } catch (err) {
        console.error('Errore durante l\'aggiornamento della disponibilità del bus:', err);
    }
}

        async function isTourBooked(busId, startDate, tripDuration) {
            try {
                const bus = await Bus.findOne({ busId: busId });
        
                if (!bus) {
                    console.log('Bus non trovato per ID:', busId);
                    return false; // Non disponibile
                }
        
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + tripDuration - 1);
                
                let currentDate = new Date(startDate);
                while (currentDate <= endDate) {
                    const dateString = currentDate.toISOString().split('T')[0];
        
                    // Controlla se la data è già prenotata
                    if (bus.availability.has(dateString)) {
                        if (bus.availability.get(dateString) === 'booked') {
                            return true; // La data è già prenotata
                        }
                    }
        
                    currentDate.setDate(currentDate.getDate() + 1);
                }
        
                return false; // Nessuna data prenotata
            } catch (err) {
                console.error('Errore durante il controllo della prenotazione:', err);
                return true; // In caso di errore, consideriamo che la data sia prenotata
            }
        }
        
        app.get('/user/bookings', async (req, res) => {
            if (!req.session.user) {
                return res.status(401).send('Utente non autenticato');
            }
        
            const userId = req.session.user._id; // Assumi che l'ID utente sia memorizzato nella sessione
        
            try {
                // Filtra le prenotazioni in base all'ID utente e popola i dettagli del tour
                const bookings = await Booking.find({ user: userId }).populate('scheduleId', 'destination duration price date');
                const formattedBookings = bookings.map(booking => ({
                    ...booking.toObject(),
                    date: booking.date.toLocaleDateString('it-IT'), // Formatta la data in italiano
                }));
                res.json(formattedBookings);
            } catch (error) {
                console.error('Errore nel recupero delle prenotazioni dell\'utente:', error);
                res.status(500).send('Errore del server');
            }
        });
app.get('/admin/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find();
        
        // Popola le informazioni sugli orari
        const bookingsWithSchedule = await Promise.all(bookings.map(async (booking) => {
            const schedule = await Schedule.findById(booking.scheduleId);
            if(schedule){
            return {
                firstName: booking.nome,
                lastName: booking.cognome,
                documentNumber: booking.numeroDocumento,
                tourName: schedule ? schedule.destination : "Tour non trovato",
                date: schedule ? schedule.date.toLocaleDateString('it-IT') : "Invalid Date", // Formatta la data
                seatsRequested: booking.seatsRequested,
                duration: schedule.duration,
                price: schedule.price
            };
        }
        else{
            console.log('valori nulli');
        }
        }));

        res.json(bookingsWithSchedule);
    } catch (error) {
        console.error('Errore nel recupero delle prenotazioni:', error);
        res.status(500).send('Errore nel server');
    }
});






app.post('/admin/get-booking', async (req, res) => {
    const { bookingId } = req.body;
    console.log('Richiesta di recupero prenotazione per ID:', bookingId);
    co
    if (!bookingId) {
        return res.status(400).send('ID della prenotazione non fornito');
    }

    try {
        const booking = await BusBooking.findById(bookingId);

        if (!booking) {
            return res.status(404).send('Prenotazione non trovata per ID: ' + bookingId);
        }

        res.status(200).json(booking);
    } catch (error) {
        console.error('Errore durante il recupero della prenotazione:', error);
        res.status(500).send('Errore interno del server');
    }
});


app.post('/user/confirm-booking', async (req, res) => {
    const { bookingId } = req.body;

    try {
        const busBooking = await BusBooking.findById(bookingId);

        if (!busBooking) {
            return res.status(404).send('Prenotazione non trovata');
        }

        busBooking.status = 'booked';
        await busBooking.save();
        console.log('Prenotazione confermata:', busBooking);
        res.status(200).json({ message: 'Prenotazione confermata con successo' });
    } catch (error) {
        console.error('Errore durante la conferma della prenotazione:', error);
        res.status(500).send('Errore interno del server');
    }
});

app.post('/admin/confirm-booking', async (req, res) => {
    const { bookingId } = req.body;

    if (!bookingId) {
        return res.status(400).send('ID della prenotazione non fornito');
    }

    console.log('Dati ricevuti per conferma prenotazione:', req.body);
    console.log('Conferma prenotazione ID:', bookingId);

    try {
        // Trova la prenotazione nel database
        const booking = await BusBooking.findById(bookingId);

        if (!booking) {
            return res.status(404).send('Prenotazione non trovata per ID: ' + bookingId);
        }

        // Procedi con la conferma della prenotazione
        booking.status = 'booked'; // Aggiorna lo stato della prenotazione

        // Salva le modifiche nel database
        await booking.save();

        // Invia la risposta di successo
        res.status(200).json({ message: 'Prenotazione confermata con successo!' });
    } catch (error) {
        console.error('Errore durante la conferma della prenotazione:', error);
        res.status(500).send('Errore interno del server');
    }
});



app.post('/admin/cancel-booking', async (req, res) => {
    const { bookingId } = req.body;

    try {
        const busBooking = await BusBooking.findById(bookingId);
        if (!busBooking) {
            return res.status(404).send({ message: 'Prenotazione non trovata' });
        }

        if (busBooking.status !== 'pending') {
            return res.status(400).send({ message: 'Solo le prenotazioni in attesa possono essere annullate' });
        }

        await BusBooking.deleteOne({ _id: bookingId });

        res.status(200).send({ message: 'Prenotazione annullata con successo!' });
    } catch (error) {
        res.status(500).send('Errore interno del server');
    }
});


app.post('/book-bus', async (req, res) => {
    // Controllo dell'autenticazione
    if (!req.session.user || req.session.user.username === 'admin') {
        return res.status(401).send('Non autorizzato');
    }

    const { busId, date, seatsRequested, destinations, tripDuration } = req.body;

    // Validazioni di base
    if (!busId || isNaN(seatsRequested) || !Array.isArray(destinations) || !destinations.length || isNaN(tripDuration) || !date) {
        return res.status(400).send('Tutti i campi sono obbligatori');
    }

    try {
        // Trova il bus con l'ID fornito
        const bus = await Bus.findOne({ busId });

        if (!bus) {
            return res.status(404).send('Autobus non trovato');
        }

        if (seatsRequested < Math.ceil(bus.capacity * 60 / 100)) {
            return res.status(400).send('La prenotazione verrà valutata solo se i posti sono maggiori di ' + Math.floor(bus.capacity * 60 / 100));
        }

        if (bus.capacity < seatsRequested) {
            return res.status(400).send('I posti richiesti superano la capacità del bus');
        }

        // Verifica la disponibilità del bus per il periodo richiesto
        const startDate = new Date(date);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + tripDuration - 1);

        let allDatesAvailable = true;
        let currentDate = new Date(startDate);

        // Controlla la disponibilità per tutte le date del viaggio
        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            const status = bus.availability.get(dateString) || 'available';

            if (status === 'booked' || status === 'non disponibile' || status === 'warning') {
                allDatesAvailable = false;
                break;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        if (!allDatesAvailable) {
            return res.status(400).send('Autobus non disponibile nelle date indicate');
        }

        // Crea la nuova prenotazione
        const newBooking = new BusBooking({
            username: req.session.user.username,
            busId,
            seatsRequested,
            destinations,
            tripDuration,
            date,
            status: 'pending'
        });

        await newBooking.save(); // Salva la prenotazione nel database
        io.emit('newBusReservation', newBooking); // Notifica l'admin con l'evento

        res.status(200).json({
            bookingId: newBooking._id, // Mongoose gestisce automaticamente l'ID
            message: 'Prenotazione in attesa di conferma da parte dell\'amministratore'
        });
    } catch (error) {
        console.error('Errore durante la creazione della prenotazione:', error);
        res.status(500).send('Errore interno del server');
    }
});
app.get('/admin/bus-bookings', async (req, res) => {
    try {
        const bookings = await BusBooking.find();
        
        // Formatta le date per ciascuna prenotazione
        const formattedBookings = bookings.map(booking => ({
            ...booking.toObject(), // Converte il documento Mongoose in un oggetto semplice
            date: formatItalianDate(booking.date) // Formatta la data
        }));

        res.json(formattedBookings);
    } catch (error) {
        console.error('Errore nel recupero delle prenotazioni:', error);
        res.status(500).send({ message: 'Errore durante il recupero delle prenotazioni.' });
    }
});

app.get('/user/bus-bookings', async (req, res) => {
    try {
        const username = req.session.user.username; // Assumi che tu abbia il nome utente nella sessione
        console.log('USERNAME BUS BOOKING:' + username);
        const bookings = await BusBooking.find({ username: username }); // Trova le prenotazioni per l'utente
        
        // Formatta le date per ciascuna prenotazione
        const formattedBookings = bookings.map(booking => ({
            ...booking.toObject(), // Converte il documento Mongoose in un oggetto semplice
            date: formatItalianDate(booking.date) // Formatta la data
        }));

        res.json(formattedBookings);
    } catch (error) {
        console.error('Errore nel recupero delle prenotazioni dell\'utente:', error);
        res.status(500).send({ message: 'Errore durante il recupero delle prenotazioni.' });
    }
});

app.delete('/admin/bus-bookings/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Trova la prenotazione prima di cancellarla per ottenere le informazioni necessarie
        const busBooking = await BusBooking.findById(id);
        if (!busBooking) {
            return res.status(404).send({ message: 'Prenotazione non trovata' });
        }

        // Cancella la prenotazione
        const result = await BusBooking.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).send({ message: 'Prenotazione non trovata' });
        }

        // Ripristina la disponibilità del bus per la prenotazione cancellata
        await resetBusAvailability({
            busId: busBooking.busId,
            date: busBooking.date,
            tripDuration: busBooking.tripDuration
        });

        res.send({ message: 'Prenotazione cancellata con successo e disponibilità del bus aggiornata' });
    } catch (error) {
        console.error('Errore durante la cancellazione della prenotazione:', error);
        res.status(500).send({ message: 'Errore durante la cancellazione della prenotazione' });
    }
});


app.post('/admin/bus-booking', async (req, res) => {
    const { busId, date, numberOfSeats, destination, duration } = req.body;

    try {
        const newBooking = new BusBooking({
            busId,
            date,
            seatsRequested: numberOfSeats,
            destinations: destination,
            tripDuration: duration
        });
        
        await newBooking.save();
        io.emit('newBusReservation', newBooking);

        res.status(200).send({ message: 'Prenotazione aggiunta con successo!' });
    } catch (error) {
        console.error('Errore nella prenotazione:', error);
        res.status(500).send({ message: 'Errore durante la prenotazione.' });
    }
});

// Rotta per sincronizzare le prenotazioni
app.post('/admin/sync-bookings', (req, res) => {
    const userBookings = req.body.userBookings; // Prenotazioni dall'utente
    const adminBookings = req.body.adminBookings; // Prenotazioni dall'admin

    const commonBookings = [];

    // Confronta le prenotazioni
    for (let i = 0; i < adminBookings.length; i++) {
        if (userBookings.includes(adminBookings[i])) {
            commonBookings.push(adminBookings[i]);  // Se la data coincide, la aggiunge
        }
    }
    
    res.json({ commonBookings });
});


const users = {}; // Oggetto per tracciare gli utenti connessi
const messages = {}; // Oggetto per memorizzare i messaggi degli utenti

io.on('connection', async (socket) => {
    // Connessione stabilita e gestione degli utenti
    const session = socket.request.session;

    if (session && session.user) {
        const username = session.user.username;
        const isAdmin = (username === 'admin');

        // Associa username e ruolo al socket
        socket.username = username;
        socket.isAdmin = isAdmin;

        // Registra l'utente o admin nella lista
        users[socket.username] = {
            id: socket.id, // ID del socket per identificare l'utente
            username: socket.username,
            isAdmin: socket.isAdmin,
        };
        

        console.log(`Utente connesso: ${socket.username}, ID: ${socket.id}, Admin: ${socket.isAdmin}`);

        // Invia la lista utenti aggiornata a tutti i client, tranne l'admin
        io.emit('usersList', Object.values(users).filter(user => !user.isAdmin));

        if (!messages[socket.username]) {
            messages[socket.username] = [];
        }

        socket.join(socket.username);
        socket.on('requestUsersList', () => {
            socket.emit('usersList', Object.values(users).filter(user => user.username !== 'admin'));
        });
        socket.emit('setUserDetails', { username, isAdmin });

        // Aggiorna lista utenti per l'admin
        io.emit('usersList', Object.values(users).filter(user => user.username !== 'admin'));

        // Ricezione di un messaggio dall'utente
        socket.on('chatMessage', (data) => {
            const { username, message } = data;
            const timestamp = Date.now();

            // Memorizza il messaggio per l'utente stesso
            messages[socket.username].push({ sender: username, message, timestamp });

            // Invia il messaggio all'admin
            const adminSocket = Object.values(users).find(user => user.isAdmin);
            if (adminSocket) {
                io.to(adminSocket.id).emit('chatMessage', { username, message, toUser: socket.username, timestamp });
            }

            // Invia il messaggio all'utente che lo ha inviato
            socket.emit('chatMessage', { username: socket.username, message: data.message, toUser: socket.username });
        });

        // Quando l'admin seleziona un utente, invia i messaggi dell'utente
        socket.on('getUserMessages', ({ username }) => {
            const userMessages = messages[username] || [];
            socket.emit('userMessages', { userId: username, messages: userMessages });

        });

        // Admin invia un messaggio
        socket.on('adminMessage', ({ message, toUser }) => {
            console.log('sono entrato nel admin mess '+message + ' sono admin?: '+socket.isAdmin + 'Il mess è per: '+toUser); 
            
            if (socket.isAdmin && users[toUser]) {

                const userSocket = users[toUser].id; // Ottieni l'id del socket dell'utente
                messages[toUser].push({ sender: 'admin', message });
                
                // Invia il messaggio all'utente specifico
                io.to(userSocket).emit('chatMessage', { username: 'admin', message, toUser });
                // Invia anche all'admin stesso
                socket.emit('chatMessage', { username: 'admin', message, toUser });
            }
        });
        // Assicurati di avere una funzione che inizializza la disponibilità per tutte le date richieste

        
        
        
        
        // Evento per confermare la prenotazione dell'utente
        socket.on('confirmUserBooking', async (data) => {
            const { bookingId } = data;
            console.log('Dati ricevuti per conferma prenotazione:', data);
        
            console.log('Conferma prenotazione ID:', bookingId);
            if (!bookingId) {
                console.error('ID prenotazione mancante!');
                return; // Esci se non c'è un bookingId
            }
        
            try {
                const booking = await BusBooking.findById(bookingId);
        
                if (!booking) {
                    console.log('Prenotazione non trovata per ID:', bookingId);
                    return; // Esci se non trovi la prenotazione
                }
        
                booking.status = 'booked';
        
                await booking.save();
        
                await updateBusAvailability(booking); // Chiama la funzione per aggiornare la disponibilità
        
                const adminSocket = Object.values(users).find(user => user.isAdmin);
                if (adminSocket) {
                    io.to(adminSocket.id).emit('userConfirmedBooking', {
                        bookingId: booking._id,
                        busId: booking.busId,
                        date: booking.date,
                        tripDuration: booking.tripDuration, // Invia anche la durata del viaggio

                        status: booking.status // Passa lo status corretto qui
                    });
                    console.log('Notifica inviata all\'amministratore per la prenotazione:', booking._id);
                }
            } catch (err) {
                console.error('Errore durante la conferma della prenotazione:', err);
            }
        });
        

        // Aggiungi un log per vedere cosa contiene busBookings

        async function getUserIdByBookingId(bookingId) {
            if (!bookingId) {
                console.error('ID prenotazione mancante nella richiesta');
                return null; // Ritorna null se non c'è un bookingId
            }
            try {
                const busBooking = await BusBooking.findById(bookingId);
                return busBooking ? busBooking.username : null;
            } catch (err) {
                console.log('Prenotazione non trovata per ID:', bookingId);
                return null;
            }
        }
        
        

// Quando l'admin invia il preventivo
socket.on('sendQuoteToUser', async (data) => {
    const { bookingId, quoteDetails } = data;

    console.log('Invio preventivo per la prenotazione:', bookingId);
    
    const username = await getUserIdByBookingId(bookingId);
    
    if (username && users[username]) {
        const userSocketId = users[username].id;
        io.to(userSocketId).emit('receiveQuote', { bookingId, quoteDetails });
    } else {
        console.error('Utente non trovato o non connesso per la prenotazione:', bookingId);
    }
});

        
        // Disconnessione
        socket.on('disconnect', () => {
            delete users[socket.id];
            io.emit('usersList', Object.values(users).filter(user => user.username !== 'admin'));
        });
    }
});
server.listen(config.server.port, () => {
    console.log('Server avviato sulla porta 3000');
});
