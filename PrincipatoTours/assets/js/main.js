
let currentMonthUser = new Date().getMonth();
let currentYearUser = new Date().getFullYear();

const loadUserBusAvailabilities = async (month = currentMonthUser, year = currentYearUser) => {
    const response = await fetch('/user/bus-availabilities');
    const buses = await response.json();
    console.log('Dati disponibilità autobus utente:', buses);

    const calendarContainer = document.getElementById('busCalendar');

    calendarContainer.innerHTML = ''; // Svuota il contenuto precedente

    buses.forEach(bus => {
        // Creazione della card per ogni autobus
        const busCard = document.createElement('div');
        busCard.className = 'card mb-4';
        busCard.setAttribute('data-bus-id', bus.busId); // Aggiungi l'attributo data-bus-id
        console.log('Caricamento bus ID:', bus.busId);
        const busCardHeader = document.createElement('div');
        busCardHeader.className = 'card-header d-flex align-items-center';

        const busImage = document.createElement('img');
        busImage.src = `/img/bus-${bus.busId}.png`;
        busImage.alt = bus.name;
        busImage.style.width = '230px';
        busImage.style.height = '200px';

        const busName = document.createElement('h3');
        busName.className = 'mb-0';
        busName.innerText = bus.name;

        busCardHeader.appendChild(busImage);
        busCardHeader.appendChild(busName);

        const busCardBody = document.createElement('div');
        busCardBody.className = 'card-body';

        const capacityDiv = document.createElement('div');
        capacityDiv.className = 'mb-4';

        const capacityLabel = document.createElement('label');
        capacityLabel.setAttribute('for', `capacity-${bus.busId}`);
        capacityLabel.className = 'form-label';
        capacityLabel.innerText = 'Capienza: ';

        const capacityInput = document.createElement('input');
        capacityInput.type = 'number';
        capacityInput.id = `capacity-${bus.busId}`;
        capacityInput.value = bus.capacity;
        capacityInput.className = 'form-control d-inline-block w-auto';
        capacityInput.disabled = true;

        capacityDiv.appendChild(capacityLabel);
        capacityDiv.appendChild(capacityInput);

        const calendar = document.createElement('div');
        calendar.className = 'calendar';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'd-flex justify-content-between align-items-center mb-2';

        const prevMonthButton = document.createElement('button');
        prevMonthButton.className = 'btn btn-sm btn-secondary';
        prevMonthButton.innerText = '←';
        prevMonthButton.onclick = () => {
            currentMonthUser = (currentMonthUser - 1 + 12) % 12;
            if (currentMonthUser === 11) currentYearUser--;
            loadUserBusAvailabilities(currentMonthUser, currentYearUser);

        };

        const nextMonthButton = document.createElement('button');
        nextMonthButton.className = 'btn btn-sm btn-secondary';
        nextMonthButton.innerText = '→';
        nextMonthButton.onclick = () => {
            currentMonthUser = (currentMonthUser + 1) % 12;
            if (currentMonthUser === 0) currentYearUser++;
            loadUserBusAvailabilities(currentMonthUser, currentYearUser);
            
        };

        const headerMonth = document.createElement('span');
        headerMonth.style.fontWeight = 'bold';
        const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
        headerMonth.innerText = `${monthNames[month]} ${year}`;

        headerDiv.appendChild(prevMonthButton);
        headerDiv.appendChild(headerMonth);
        headerDiv.appendChild(nextMonthButton);

        calendar.appendChild(headerDiv);

        const table = document.createElement('table');
        table.className = 'table table-bordered';
        const headerRow = document.createElement('tr');
        const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

        days.forEach(day => {
            const th = document.createElement('th');
            th.innerText = day;
            headerRow.appendChild(th);
        });

        table.appendChild(headerRow);

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let date = 1;

        for (let i = 0; i < 6; i++) {
            const row = document.createElement('tr');

            for (let j = 0; j < 7; j++) {
                const cell = document.createElement('td');

                if (i === 0 && j < (firstDay === 0 ? 6 : firstDay - 1)) {
                    cell.innerText = '';
                } else if (date > daysInMonth) {
                    cell.innerText = '';
                } else {
                    const dateString = formatLocalDateUser(year, month, date);
                    const status = bus.availability[dateString] || 'available';
                    cell.innerText = date;
                    cell.className = `text-center ${status === 'available' ? 'bg-success' : 'bg-danger'} text-white`;
                    cell.setAttribute('data-date', dateString);

                    if (status === 'available') {
                        cell.onclick = () => showBookingModal(bus.busId, dateString);
                    }

                    date++;
                }

                row.appendChild(cell);
            }

            table.appendChild(row);

            if (date > daysInMonth) {
                break;
            }
        }

        calendar.appendChild(table);
        busCardBody.appendChild(capacityDiv);
        busCardBody.appendChild(calendar);
        busCard.appendChild(busCardHeader);
        busCard.appendChild(busCardBody);
        calendarContainer.appendChild(busCard);
    });
};
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
function openEditModal(busId) {
    const modal = document.getElementById(`editBusModal-${busId}`);
    modal.style.display = 'block'; // Mostra il modale
}

// Funzione per caricare le disponibilità e capienza degli autobus
async function loadBusAvailabilities(month = currentMonth, year = currentYear) {
    const response = await fetch('/admin/bus-availabilities');
    const buses = await response.json();

    // Ottieni le prenotazioni degli utenti
    const userResponse = await fetch('/user/bus-availabilities');
    const userBuses = await userResponse.json();

    const calendarContainer = document.getElementById('busCalendar');
    calendarContainer.innerHTML = ''; // Svuota il contenuto precedente

    buses.forEach(async bus => {
        const userBus = userBuses.find(ub => ub.busId === bus.busId);
        const userBookings = userBus ? Object.keys(userBus.availability) : [];

        // Confronta con le prenotazioni admin via fetch POST per il bus specifico
        const bookingSyncResponse = await fetch('/admin/sync-bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                adminBookings: Object.keys(bus.availability),
                userBookings: userBookings
            })
        });

        const bookingSyncData = await bookingSyncResponse.json();
        const commonBookings = bookingSyncData.commonBookings;
        console.log(`Prenotazioni in comune per autobus ${bus.busId}:`, commonBookings);

        const busDiv = document.createElement('div');
        busDiv.className = 'bus-calendar mb-4';
        console.log(bus.busId);
        busDiv.setAttribute('data-bus-id', bus.busId); // Aggiungi questo attributo unico

        // Aggiungi l'immagine del bus
        const busImage = document.createElement('img');
        busImage.src = `/img/bus-${bus.busId}.png`; 
        busImage.alt = bus.name;
        busImage.style.width = '230px';
        busImage.style.height = '200px';
        busImage.style.display = 'block';  
        busDiv.style.marginLeft = '10px';
        
        busDiv.appendChild(busImage);  // Inserisci l'immagine nel div prima del contenuto esistente
        
        busDiv.innerHTML += `
            <h3>ID:${bus.busId} ${bus.name}</h3>
            <div class="mb-2">
                <label for="capacity-${bus.busId}" class="form-label">Capienza: </label>
                <input type="number" id="capacity-${bus.busId}" value="${bus.capacity}" class="form-control d-inline-block w-auto">
                <button class="btn btn-primary btn-sm ms-2" onclick="updateBusCapacity(${bus.busId})">Aggiorna Capienza</button>
                <button class="btn btn-secondary btn-sm ms-2" onclick="openEditModal(${bus.busId})">Modifica Autobus</button>
                <button class="btn btn-danger btn-sm ms-2" onclick="deleteBus(${bus.busId})">Cancella Autobus</button>
            </div>
        `;
const modalHTML = `
    <div id="editBusModal-${bus.busId}" class="modal" style="display:none;">
        <div class="modal-content">
            <h4>Modifica Autobus</h4>
            <label for="busName-${bus.busId}">Nome Autobus:</label>
            <input type="text" id="busName-${bus.busId}" value="${bus.name}" class="form-control">
            
            <label for="busCapacity-${bus.busId}">Capienza Autobus:</label>
            <input type="number" id="busCapacity-${bus.busId}" value="${bus.capacity}" class="form-control">
            
            <label for="busImage-${bus.busId}">Foto Autobus:</label>
            <input type="file" id="busImage-${bus.busId}" class="form-control">
            
            <button id="saveBusChanges-${bus.busId}" class="btn btn-primary mt-2">Salva Modifiche</button>
            <button onclick="document.getElementById('editBusModal-${bus.busId}').style.display='none'" class="btn btn-secondary mt-2">Annulla</button>
        </div>
    </div>
`;

busDiv.insertAdjacentHTML('beforeend', modalHTML);

busDiv.querySelector(`#saveBusChanges-${bus.busId}`).onclick = async () => {
    const updatedName = busDiv.querySelector(`#busName-${bus.busId}`).value;
    const updatedCapacity = busDiv.querySelector(`#busCapacity-${bus.busId}`).value;
    const busImage = busDiv.querySelector(`#busImage-${bus.busId}`).files[0];  // Ottieni il file immagine

    const formData = new FormData();
    formData.append('name', updatedName);
    formData.append('capacity', updatedCapacity);
    if (busImage) {
        formData.append('busImage', busImage);  // Aggiungi solo se esiste un'immagine
    }

    const response = await fetch(`/admin/buses/${bus.busId}`, {
        method: 'PUT',
        body: formData  // Invia i dati come FormData
    });

    if (response.ok) {
        document.getElementById(`editBusModal-${bus.busId}`).style.display = 'none';
        loadBusAvailabilities(currentMonth, currentYear);
    } else {
        alert('Errore durante il salvataggio delle modifiche.');
    }
};

        const calendar = document.createElement('div');
        calendar.className = 'calendar';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'd-flex justify-content-between align-items-center mb-2';

        const prevMonthButton = document.createElement('button');
        prevMonthButton.className = 'btn btn-sm btn-secondary';
        prevMonthButton.innerText = '←';
        prevMonthButton.onclick = () => {
            currentMonth = (currentMonth - 1 + 12) % 12;
            if (currentMonth === 11) currentYear--;
            loadBusAvailabilities(currentMonth, currentYear);
        };

        const nextMonthButton = document.createElement('button');
        nextMonthButton.className = 'btn btn-sm btn-secondary';
        nextMonthButton.innerText = '→';
        nextMonthButton.onclick = () => {
            currentMonth = (currentMonth + 1) % 12;
            if (currentMonth === 0) currentYear++;
            loadBusAvailabilities(currentMonth, currentYear);
        };

        const headerMonth = document.createElement('span');
        headerMonth.style.fontWeight = 'bold';
        const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
        headerMonth.innerText = `${monthNames[month]} ${year}`;

        headerDiv.appendChild(prevMonthButton);
        headerDiv.appendChild(headerMonth);
        headerDiv.appendChild(nextMonthButton);

        calendar.appendChild(headerDiv);

        const table = document.createElement('table');
        table.className = 'table table-bordered';
        const headerRow = document.createElement('tr');
        const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

        days.forEach(day => {
            const th = document.createElement('th');
            th.innerText = day;
            headerRow.appendChild(th);
        });

        table.appendChild(headerRow);

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let date = 1;

        for (let i = 0; i < 6; i++) {
            const row = document.createElement('tr');

            for (let j = 0; j < 7; j++) {
                const cell = document.createElement('td');

                if (i === 0 && j < (firstDay === 0 ? 6 : firstDay - 1)) {
                    cell.innerText = '';
                } else if (date > daysInMonth) {
                    cell.innerText = '';
                } else {
                    const dateString = formatLocalDate(year, month, date);
                    const availabilityStatus = bus.availability[dateString] || 'available';
                    
                    const isCommonBooking = commonBookings.includes(dateString);
                    console.log('stato availability: ' + availabilityStatus);
                    const cellClass = availabilityStatus === 'booked' ? 'bg-danger'
                        : (availabilityStatus === 'available' ? 'bg-success' : 'bg-warning');
                    cell.innerText = date;
                    cell.className = `text-center ${cellClass} text-white`;

                    cell.addEventListener('click', async () => {
                        let currentClass = cell.className.includes('bg-success') ? 'available' : 'booked';

                        // Determina il nuovo stato in base allo stato attuale
                        let newStatus = (currentClass === 'available') ? 'booked' : 'available';

                        // Cambia immediatamente il colore della cella per fornire feedback visivo
                        if (newStatus === 'booked') {
                            cell.className = 'text-center bg-danger text-white'; // Rosso per "booked"
                        } else {
                            cell.className = 'text-center bg-success text-white'; // Verde per "available"
                        }

                        const response = await fetch('/admin/bus-availabilities', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ busId: bus.busId, date: dateString, status: newStatus }),
                        });

                        if (!response.ok) {
                            // Se la richiesta fallisce, ripristina il colore precedente
                            if (currentClass === 'available') {
                                cell.className = 'text-center bg-success text-white'; // Torna a verde se era disponibile
                            } else {
                                cell.className = 'text-center bg-danger text-white'; // Torna a rosso se era prenotato
                            }
                        }
                    });

                    date++;
                }

                row.appendChild(cell);
            }

            table.appendChild(row);

            if (date > daysInMonth) {
                break;
            }
        }

        calendar.appendChild(table);
        busDiv.appendChild(calendar);
        calendarContainer.appendChild(busDiv);
    });
}

// Funzione per cancellare un autobus
async function deleteBus(busId) {
    const response = await fetch(`/admin/buses/${busId}`, {
        method: 'DELETE',
    });

    if (response.ok) {
        loadBusAvailabilities(currentMonth, currentYear); // Ricarica le disponibilità dopo la cancellazione
    } else {
        alert('Errore durante la cancellazione dell\'autobus.');
    }
}
function updateCalendarWithNewReservation(data) {
    const { busId, date, tripDuration, status } = data;
    console.log('Aggiornamento calendario:', data);
    const busDiv = document.querySelector(`[data-bus-id="${busId}"]`);

    
    // Verifica se l'elemento busDiv esiste
    if (!busDiv) {
        console.warn(`Bus con ID ${busId} non trovato nel calendario.`);
        return;
    }

    // Trova la cella corrispondente alla data
    const calendarCells = busDiv.querySelectorAll('td');
    const startDate = new Date(date);

    for (let i = 0; i < tripDuration; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const day = currentDate.getDate().toString();
        console.log('Stato nella data: '+ currentDate + ' Stato: '+status)
        // Trova la cella corrispondente per la data corrente
        const cell = Array.from(calendarCells).find(cell => cell.innerText === day);
        
        if (cell) {
            console.log('Cella trovata per la data:', currentDate);
            // Aggiorna lo stato della cella in base allo stato della prenotazione
            cell.classList.remove('bg-success', 'bg-warning', 'bg-danger');
            console.log('stato prima di cambio colore: ' + status);
            const newClass = status === 'booked' ? 'bg-danger' : (status === 'userBooked' ? 'bg-warning' : 'bg-success');
            cell.classList.add(newClass);
            cell.classList.add('text-white');
        } else {
            console.warn(`Cella per la data ${currentDate} non trovata per il bus con ID ${busId}`);
        }
    }
}


function resetForm() {
    document.getElementById('seatsInput').value = '';  // Resetta il numero di posti richiesti
    document.getElementById('tripDuration').value = '';  // Resetta la durata del viaggio
    // Resetta anche altri campi del form, se necessari
}
const formatLocalDate = (year, month, day) => {
    const paddedMonth = String(month + 1).padStart(2, '0');  // Mesi da 0 a 11
    const paddedDay = String(day).padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
};
function formatLocalDateUser(year, month, day) {
    const date = new Date(year, month, day+1);
    return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
}
function updateMinSeats(busId) {
    // Fai una richiesta GET per ottenere la capacità del bus
    fetch(`/bus/capacity/${busId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Errore nel recupero della capacità del bus');
            }
            return response.json();
        })
        .then(data => {
            const capacity = data.capacity;

            const minSeats = Math.ceil(capacity * 60 / 100); // Calcola i posti minimi richiesti
            console.log('minSeats'+minSeats);
            document.getElementById('minSeats').textContent = minSeats;
        })
        .catch(error => {
            console.error('Errore:', error);
        });
}
const showBookingModal = (busId, date) => {
    console.log('Tentativo di prenotazione per busId:', busId, 'alla data:', date);

    let modal = document.getElementById('bookingModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'bookingModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.style.display = 'block';
    modal.innerHTML = '';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    const closeButton = document.createElement('span');
    closeButton.className = 'close';
    closeButton.innerText = '×';
    closeButton.onclick = () => {
        modal.style.display = 'none';
    };

    const cities = [
        'Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova',
        'Bologna', 'Firenze', 'Catania', 'Bari', 'Verona', 'Messina',
        'Trieste', 'Brescia', 'Taranto', 'Reggio Calabria', 'Modena',
        'Prato', 'Livorno', 'Foggia', 'Ravenna', 'Salerno', 'Ferrara'
    ];

    updateMinSeats(busId);

    const form = document.createElement('form');
    form.innerHTML = `
        <h3>Prenotazione per il ${date}</h3>
        <label for="seats">Posti autobus richiesti: (minimo <span id="minSeats"></span>)</label>
        <input type="number" id="seats" name="seats" required>

        <div id="destinationsContainer">
            <div class="destination-item">
                <label for="destination-1">Destinazione 1:</label>
                <select id="destination-1" name="destination-1" required>
                    <option value="">Seleziona una città</option>
                    ${cities.map(city => `<option value="${city}">${city}</option>`).join('')}
                </select>
                <button type="button" class="addDestinationButton">+</button>
            </div>
        </div>

        <label for="duration">Durata del viaggio:</label>
        <input type="number" id="duration" name="duration" required min="1">
        <button type="submit">Prenota</button>
    `;

    let destinationCount = 1;

    const destinationsContainer = form.querySelector('#destinationsContainer');

    // Funzione per aggiungere una nuova destinazione
    const addDestination = () => {
        destinationCount++;
        const destinationItem = document.createElement('div');
        destinationItem.className = 'destination-item';

        const newDestinationLabel = document.createElement('label');
        newDestinationLabel.setAttribute('for', `destination-${destinationCount}`);
        newDestinationLabel.innerText = `Destinazione ${destinationCount}:`;
        const newDestinationSelect = document.createElement('select');
        newDestinationSelect.style="margin-left:5px"

        newDestinationSelect.id = `destination-${destinationCount}`;
        newDestinationSelect.name = `destination-${destinationCount}`;
        newDestinationSelect.required = true;
        newDestinationSelect.innerHTML = `
            <option value="">Seleziona una città</option>
            ${cities.map(city => `<option value="${city}">${city}</option>`).join('')}
        `;

        const newAddButton = document.createElement('button');
        newAddButton.type = 'button';
        newAddButton.className = 'addDestinationButton';
        newAddButton.innerText = '+';
        newAddButton.onclick = addDestination; // Aggiungi una nuova destinazione

        const newRemoveButton = document.createElement('button');
        newRemoveButton.type = 'button';
        newRemoveButton.className = 'removeDestinationButton';

        newRemoveButton.innerText = '-';
        newRemoveButton.onclick = () => {
            destinationsContainer.removeChild(destinationItem); // Rimuovi la destinazione
            destinationCount--;
        };

        destinationItem.appendChild(newDestinationLabel);
        destinationItem.appendChild(newDestinationSelect);
        destinationItem.appendChild(newAddButton);
        destinationItem.appendChild(newRemoveButton);

        destinationsContainer.appendChild(destinationItem);
    };

    // Aggiungi evento al primo pulsante +
    form.querySelector('.addDestinationButton').onclick = addDestination;

    // Gestione della sottomissione del form
    form.onsubmit = async (e) => {
        e.preventDefault();
        const seats = document.getElementById('seats').value;
        const duration = document.getElementById('duration').value;
    
        const destinations = [];
        for (let i = 1; i <= destinationCount; i++) {
            const destinationValue = document.getElementById(`destination-${i}`).value;
            if (destinationValue) {
                destinations.push(destinationValue);
            }
        }
    
        console.log({
            busId,
            date,
            seatsRequested: parseInt(seats, 10),
            destinations,
            tripDuration: parseInt(duration, 10),
        });
    
        try {
            const response = await fetch('/book-bus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    busId,
                    date,
                    seatsRequested: parseInt(seats, 10),
                    destinations,
                    tripDuration: parseInt(duration, 10),
                }),
            });
    
            if (response.ok) {
                const result = await response.json();
                const bookingId = result.bookingId; // Ottiene l'ID dal server
                alert('Prenotazione effettuata con successo!');
                modal.style.display = 'none';
                newBooking(busId, date, duration, bookingId); // Passa l'ID alla funzione
            } else {
                const errorText = await response.text();
                console.error('Errore nella risposta del server:', errorText);
                alert(errorText);
            }
        } catch (error) {
            console.error('Errore durante la prenotazione:', error);
        }
    };

    modalContent.appendChild(closeButton);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);
};
const newBooking = (busId, date, duration) => {
    console.log('Nuova prenotazione per busId:', busId, 'alla data:', date, 'per la durata di:', duration);
    updateCalendarDayStatus(busId, date, duration);
};
const updateCalendarWithNewAvailability = (busId, availability) => {
    // Seleziona la card o il calendario corrispondente all'autobus con busId
    const busCard = document.querySelector(`.card[data-bus-id="${busId}"]`);
    if (!busCard) {
        console.warn(`Card per l'autobus con ID ${busId} non trovata`);
        return;
    }

    // Itera attraverso le disponibilità dell'autobus
    for (const [date, status] of Object.entries(availability)) {
        // Formatta correttamente la data
        const currentDateStr = formatLocalDateUser(
            new Date(date).getFullYear(),
            new Date(date).getMonth(),
            new Date(date).getDate()
        );

        // Seleziona la cella della data nel calendario per l'autobus
        const dayCell = busCard.querySelector(`[data-date="${currentDateStr}"]`);
        console.log('lo stato della cella è:'+status);
        if (dayCell) {
            // Controlla lo stato della disponibilità e aggiorna la cella
            if (status === 'booked' || status === 'non disponibile') {
                dayCell.classList.add('bg-danger'); // Aggiunge il colore rosso (classe bg-danger)
                dayCell.style.pointerEvents = 'none'; // Disabilita il clic
                dayCell.classList.remove('bg-success'); // Rimuovi altre classi di stato
            } else if(status === 'available') {
                dayCell.classList.remove('bg-danger'); // Rimuove il colore rosso se disponibile
                dayCell.style.pointerEvents = 'auto'; // Rendi cliccabile
                dayCell.classList.add('bg-success'); // Aggiungi lo stato disponibile (verde)
            }
              else if (status === 'warning') {
                dayCell.classList.add('bg-warning'); // Aggiunge lo stato giallo
                dayCell.style.pointerEvents = 'none'; // Disabilita il clic per celle gialle
                dayCell.classList.remove('bg-success'); // Rimuove altre classi di stato
            }
        }
    }
};
const updateCalendarDayStatus = (busId, startDate, duration) => {
    const busCard = document.querySelector(`.card[data-bus-id="${busId}"]`);
    if (!busCard) {
        console.warn(`Card per l'autobus con ID ${busId} non trovata`);
        return;
    }

    const startDateObj = new Date(startDate);

    for (let i = 0; i < duration; i++) {
        const currentDateObj = new Date(startDateObj);
        currentDateObj.setDate(startDateObj.getDate() + i);
        const currentDateStr = formatLocalDateUser(
            currentDateObj.getFullYear(),
            currentDateObj.getMonth(),
            currentDateObj.getDate()
        );

        const dayCell = busCard.querySelector(`[data-date="${currentDateStr}"]`);
        if (dayCell) {
            dayCell.classList.remove('bg-success');
            dayCell.classList.remove('bg-warning');
            dayCell.classList.add('bg-warning'); // Cambia lo stato a giallo per indicare la prenotazione
        }
    }
};
// Pulsante per aggiungere un nuovo autobus
const showAddBusModal = () => {
    const modal = document.createElement('div');
    modal.className = 'custom-modal'; // Assicurati di usare la classe 'custom-modal'

    const modalContent = document.createElement('div');
    modalContent.className = 'custom-modal-content'; // Assicurati di usare la classe 'custom-modal-content'

    const closeButton = document.createElement('span');
    closeButton.className = 'close';
    closeButton.textContent = '×';

    const title = document.createElement('h2');
    title.textContent = 'Aggiungi Nuovo Autobus';

    const form = document.createElement('form');
form.id = 'addBusForm';
form.enctype = 'multipart/form-data';
form.innerHTML = `
    <label for="model">Modello:</label>
    <input type="text" id="model" name="model" required>
    <label for="driver">Autista:</label>
    <input type="text" id="driver" name="driver" required>
    <label for="capacity">Capienza:</label>
    <input type="number" id="capacity" name="capacity" required>

    <label for="photo">Foto dell'autobus:</label>
    <input type="file" id="photo" name="photo" accept="image/png" required>   
    <button type="submit">Aggiungi</button>
`;

    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Mostra il modale
    modal.style.display = 'block';

    // Chiudi modale e backdrop
    closeButton.onclick = () => {
        modal.style.display = 'none'; // Nascondi il modale invece di rimuoverlo
    };

    // Gestione invio form
    form.onsubmit = async (event) => {
        event.preventDefault();
        
        const formData = new FormData(form);
    
        try {
            const response = await fetch('/admin/add-bus', {
                method: 'POST',
                body: formData
            });
    
            if (response.ok) {
                const result = await response.json();
                alert(`Autobus aggiunto con successo! ID Bus: ${result.bus.busId}`);
                document.body.removeChild(modal);
                loadBusAvailabilities(currentMonth,currentYear);
                loadUserBusAvailabilities(currentMonthUser, currentYearUser); // Aggiorna le disponibilità
            } else {
                alert('Errore nell\'aggiunta dell\'autobus.');
            }
        } catch (error) {
            console.error('Errore:', error);
            alert('Errore nell\'aggiunta dell\'autobus.');
        }
    };
};

// Carica le disponibilità al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/user/availability')) {
        loadUserBusAvailabilities();
        
    }
});


// Funzione per aggiornare la capienza dell'autobus
const updateBusCapacity = async (busId) => {
    const capacityInput = document.getElementById(`capacity-${busId}`);
    const newCapacity = capacityInput.value;

    await fetch('/admin/bus-availabilities', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ busId, capacity: newCapacity }),
    });

    loadBusAvailabilities(); // Ricarica le informazioni
};

async function fetchAdminBookings() {
    try {
        const response = await fetch('/admin/bookings');  // Chiama la route creata sul server
        if (response.ok) {
            const bookings = await response.json();
            console.log("Bookings ricevuti:", bookings); // Controlla i dati ricevuti
            if (Array.isArray(bookings) && bookings.length > 0) {
                displayAdminBookings(bookings);   
            }
        } else {
            console.error('Errore nel recuperare le prenotazioni:', response.statusText);
            alert('Errore nel recuperare le prenotazioni');
        }
    } catch (error) {
        console.error('Errore di rete:', error);
        alert('Errore di rete');
    }
}

// Funzione per visualizzare le prenotazioni nella pagina admin
function displayAdminBookings(bookings) {
    const bookingsContainer = document.getElementById('admin-bookings-container');
    const bookingsTitle = document.getElementById('bookingTitle');
    bookingsTitle.style.display = 'block';
    bookingsContainer.innerHTML = '';  // Pulisce eventuali prenotazioni precedenti

    bookings.forEach(booking => {
        const bookingElement = document.createElement('div');
        bookingElement.className = 'booking-item';
        bookingElement.innerHTML = `
            <p><strong>Nome:</strong> ${booking.firstName} ${booking.lastName}</p>
            <p><strong>Codice Fiscale:</strong> ${booking.documentNumber}</p>
            <p><strong>Tour:</strong> ${booking.tourName}</p>
            <p><strong>Data:</strong> ${booking.date}</p>
            <p><strong>Durata:</strong> ${booking.duration}</p>

            <p><strong>Posti richiesti:</strong> ${booking.seatsRequested}</p>
            <p><strong>Prezzo totale:</strong> ${(booking.price)*(booking.duration)}€</p>

            <hr>
        `;
        bookingsContainer.appendChild(bookingElement);
    });
}

async function confirmBooking(bookingId) {
    console.log('ID prenotazione da confermare:', bookingId);
    
    try {
        const response = await fetch('/admin/get-booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bookingId })
        });

        if (!response.ok) {
            throw new Error('Errore nel recupero della prenotazione');
        }

        const bookingDetails = await response.json();
        const suggestedPrice = calculateQuotePrice({ duration: bookingDetails.tripDuration });
        
        // Visualizza il prezzo nel form
        document.getElementById('suggested-price').innerText = suggestedPrice;
        document.getElementById('quote-form').style.display = 'block';

        // Gestisci la conferma del preventivo
        document.querySelector('#quote-form button').onclick = async () => {
            try {
                const confirmResponse = await fetch('/admin/confirm-booking', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ bookingId })
                });
                const result = await confirmResponse.json();
                if (confirmResponse.ok) {
                    alert(result.message);
                } else {
                    alert(result.message);
                }
            } catch (error) {
                console.error('Errore nella conferma della prenotazione:', error);
            } finally {
                document.getElementById('quote-form').style.display = 'none';
            }
        };
    } catch (error) {
        console.error('Errore nel recupero della prenotazione:', error);
    }
}
// Funzione chiamata quando l'admin clicca su "Conferma"
function showQuoteForm(bookingId, tripDuration) {
    // Calcola il prezzo suggerito
    const suggestedPrice = calculateQuotePrice({ duration: tripDuration });

    // Visualizza il prezzo nel form
    document.getElementById('suggested-price').innerText = suggestedPrice;

    // Mostra il form del preventivo
    document.getElementById('quote-form').style.display = 'block';

    // Salva bookingId in un attributo data per poterlo usare al momento dell'invio
    document.getElementById('quote-form').dataset.bookingId = bookingId;
}

// Funzione per calcolare il prezzo suggerito
function calculateQuotePrice(booking) {
    const pricePerDay = 100; // Prezzo fisso per giorno
    return booking.duration * pricePerDay; // Calcola il prezzo basato sulla durata
}

// Funzione per inviare il preventivo all'utente
function sendQuote() {
    const bookingId = document.getElementById('quote-form').dataset.bookingId;
    console.log('ID prenotazione:', bookingId); // Log per verificare il bookingId
    if (!bookingId) {
        console.error('ID della prenotazione non trovato');
        return;
    }
    const quoteDetails = document.getElementById('quote-details').value;
    console.log('Quota: '+ quoteDetails);

    socket.emit('sendQuoteToUser', { bookingId, quoteDetails});

    alert(`Preventivo di ${quoteDetails} € inviato all'utente.`);
    document.getElementById('quote-form').style.display = 'none';
}
async function cancelBooking(bookingId) {
    try {
        const response = await fetch(`/admin/bus-bookings/${bookingId}`, {
            method: 'DELETE', // Assicurati di usare il metodo DELETE
        });

        if (!response.ok) {
            throw new Error('Errore nella cancellazione della prenotazione');
        }

        // Rimuovi l'elemento dalla visualizzazione
        const bookingElement = document.getElementById(`busBooking-${bookingId}`);
if (bookingElement) {
    bookingElement.remove();
    alert('Prenotazione cancellata con successo!');

} else {
    console.error(`Elemento con ID busBooking-${bookingId} non trovato nel DOM.`);
}
    } catch (error) {
        console.error('Errore durante la cancellazione della prenotazione:', error);
    }
}
async function fetchUserBookings() {
    try {
        const response = await fetch('/user/bus-bookings'); // Assicurati di avere questo endpoint
        if (!response.ok) {
            throw new Error('Errore nel recupero delle prenotazioni');
        }
        const bookings = await response.json();
        displayUserBusReservations(bookings); // Chiama la funzione per visualizzare le prenotazioni
    } catch (error) {
        console.error('Errore durante il caricamento delle prenotazioni:', error);
    }
}



function displayUserBusReservations(busBookings) {
    const userBookingsContainer = document.getElementById('user-reservation-container');
    userBookingsContainer.innerHTML = '';  // Pulisce eventuali prenotazioni precedenti

    const userBookingsTitle = document.getElementById('userBookingTitle');
    userBookingsTitle.style.display = 'block';

    // Verifica se busBookings è un array
    if (!Array.isArray(busBookings)) {
        // Se non è un array, mettilo in un array
        busBookings = [busBookings];
    }

    busBookings.forEach(busBooking => {
        const busBookingElement = document.createElement('div');
        busBookingElement.className = 'busBooking-item';
        busBookingElement.id = `userBooking-${busBooking._id}`; // Usa _id per MongoDB
    
        busBookingElement.innerHTML = `
            <p><strong>Username:</strong> ${busBooking.username}</p>
            <p><strong>Destinazioni:</strong> ${busBooking.destinations.join(', ')}</p>
            <p><strong>Bus:</strong> ${busBooking.busId}</p>
            <p><strong>Posti richiesti:</strong> ${busBooking.seatsRequested}</p>
            <p><strong>Data:</strong> ${busBooking.date}</p>
            <p><strong>Durata:</strong> ${busBooking.tripDuration}</p>
            <p id="${busBooking._id}"><strong>Stato:</strong> ${busBooking.status}</p>
            <button class="btn btn-danger" onclick="cancelBooking('${busBooking._id}')">Annulla</button> <!-- Usa _id -->
            <hr>
        `;
        userBookingsContainer.appendChild(busBookingElement);
    });
}

function displayUserBusReservations(busBookings) {
    const userBookingsContainer = document.getElementById('user-reservation-container');
    userBookingsContainer.innerHTML = '';  // Pulisce eventuali prenotazioni precedenti
    userBookingsContainer.style.marginLeft='10px';
    const userBookingsTitle = document.getElementById('userBookingTitle');
    userBookingsTitle.style.display = 'block'; // Mostra il titolo

    if (!Array.isArray(busBookings)) {
        busBookings = [busBookings]; // Assicurati che sia un array
    }

    busBookings.forEach(busBooking => {
        const busBookingElement = document.createElement('div');
        busBookingElement.className = 'busBooking-item';
        busBookingElement.id = `userBooking-${busBooking._id}`;
    
        busBookingElement.innerHTML = `
            <p><strong>Username:</strong> ${busBooking.username}</p>
            <p><strong>Destinazioni:</strong> ${busBooking.destinations.join(', ')}</p>
            <p><strong>Bus:</strong> ${busBooking.busId}</p>
            <p><strong>Posti richiesti:</strong> ${busBooking.seatsRequested}</p>
            <p><strong>Data:</strong> ${busBooking.date}</p>
            <p><strong>Durata:</strong> ${busBooking.tripDuration}</p>
            <p id="${busBooking._id}"><strong>Stato:</strong> ${busBooking.status}</p>
            <button class="btn btn-danger" onclick="cancelBooking('${busBooking._id}')">Annulla</button>
            <hr>
        `;
        userBookingsContainer.appendChild(busBookingElement);
    });
}
function displayAdminBusReservation(busBookings) {
    const busBookingsContainer = document.getElementById('bus-reservation-container');
    busBookingsContainer.innerHTML = '';  // Pulisce eventuali prenotazioni precedenti

    const busBookingsTitle = document.getElementById('busBookingTitle');
    busBookingsTitle.style.display = 'block';

    
    // Verifica se busBookings è un array
    if (!Array.isArray(busBookings)) {
        // Se non è un array, mettilo in un array
        busBookings = [busBookings];
    }

    busBookings.forEach(busBooking => {
        const busBookingElement = document.createElement('div');
        busBookingElement.className = 'busBooking-item';
        busBookingElement.id = `busBooking-${busBooking._id}`; // Usa _id per MongoDB
    
        busBookingElement.innerHTML = `
            
        `;
        if(busBooking.status === 'pending'){
            busBookingElement.innerHTML = `
            <p><strong>Username:</strong> ${busBooking.username}</p>
            <p><strong>Destinazioni:</strong> ${busBooking.destinations.join(', ')}</p>
            <p><strong>Bus:</strong> ${busBooking.busId}</p>
            <p><strong>Posti richiesti:</strong> ${busBooking.seatsRequested}</p>
            <p><strong>Data:</strong> ${busBooking.date}</p>
            <p><strong>Durata:</strong> ${busBooking.tripDuration} giorni</p>
            <p id="${busBooking._id}"><strong>Stato:</strong> ${busBooking.status}</p>
            <button class="btn btn-success" onclick="showQuoteForm('${busBooking._id}', ${busBooking.tripDuration})">Conferma</button> <!-- Usa _id -->
            <button class="btn btn-danger" onclick="cancelBooking('${busBooking._id}')">Annulla</button> 
            <hr>
            `;

        }
        else if((busBooking.status === 'booked')){
            busBookingElement.innerHTML = `
            <p><strong>Username:</strong> ${busBooking.username}</p>
            <p><strong>Destinazioni:</strong> ${busBooking.destinations.join(', ')}</p>
            <p><strong>Bus:</strong> ${busBooking.busId}</p>
            <p><strong>Posti richiesti:</strong> ${busBooking.seatsRequested}</p>
            <p><strong>Data:</strong> ${busBooking.date}</p>
            <p><strong>Durata:</strong> ${busBooking.tripDuration} giorni</p>
            <p id="${busBooking._id}"><strong>Stato:</strong> ${busBooking.status}</p>
            
            <button class="btn btn-danger" onclick="cancelBooking('${busBooking._id}')">Annulla</button> 
                        <hr>

            `;

        }
        busBookingsContainer.appendChild(busBookingElement);
    });
    
}
 
async function fetchBusBookings() {
    try {
        const response = await fetch('/admin/bus-bookings'); // Assicurati che l'URL corrisponda all'endpoint
        if (!response.ok) {
            throw new Error('Errore nel recupero delle prenotazioni');
        }
        
        const busBookings = await response.json();
        if (Array.isArray(busBookings) && busBookings.length > 0) {
            displayAdminBusReservation(busBookings);
        }
    } catch (error) {
        console.error('Errore durante il recupero delle prenotazioni:', error);
    }
}

// Chiama la funzione quando la pagina viene caricata

// Carica le disponibilità al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/admin')) {
        fetchBusBookings();
        loadBusAvailabilities();
        fetchAdminBookings();  // Esegui il fetch delle prenotazioni quando la pagina viene caricata
        socket.on('newBusReservation', (data) => {
            console.log('Ricevuta nuova prenotazione:', data);
            updateCalendarWithNewReservation(data);
            
            displayAdminBusReservation(data);  // Aggiorna il calendario
        });
        // Controlla se l'elemento busCalendar esiste
        const UpdateBus = document.getElementById('UpdateBus');
        console.log('Pagina admin rilevata',UpdateBus);

        if (UpdateBus) {
            console.log('Elemento ChatContainer trovato');
            // Aggiungi il pulsante "Aggiungi Nuovo Autobus"
            const addBusButton = document.createElement('button');
            addBusButton.className = 'btn btn-primary mt-4';
            addBusButton.innerText = 'Aggiungi Nuovo Autobus';
            addBusButton.style.display = 'block';
            addBusButton.style.visibility = 'visible';
            addBusButton.style.backgroundColor = 'darkred';
            addBusButton.style.borderColor = 'darkred';

            setTimeout(() => {
                UpdateBus.appendChild(addBusButton);
            }, 100);
            // Mostra la modale quando il pulsante viene cliccato
            addBusButton.onclick = () => showAddBusModal();
        } else {
            console.error('Elemento busCalendar non trovato!');
        
    } 
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const logoutLink = document.getElementById('logoutLink');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
    
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
    
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });
    
                if (response.ok) {
                    alert('Login effettuato con successo!');
                    // Aggiorna la UI per riflettere lo stato di login
                    updateUIForLoginStatus();
                    window.location.reload();

                    // Chiudi il modal di login
                    $('#loginModal').modal('hide');                
                } else {
                    alert('Login fallito: ' + response.statusText);
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
    
            const username = document.getElementById('registerUsername').value;
            const password = document.getElementById('registerPassword').value;
    
            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });
    
                if (response.ok) {
                    alert('Registrazione avvenuta con successo!');
                    updateUIForLoginStatus();
                    $('#registerModal').modal('hide');

                } else {
                    const errorMessage = await response.text(); // Recupera il messaggio di errore
                    alert('Registrazione fallita: ' + errorMessage);
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
    }
        const logoutNavItem = document.getElementById('logoutNavItem');
        const loginNavItem = document.getElementById('loginNavItem');
        const registerNavItem = document.getElementById('registerNavItem');
        const welcomeMessage = document.getElementById('welcomeMessage');
    
        // Funzione per mostrare/nascondere i pulsanti in base allo stato di login
        const updateUIForLoginStatus = async () => {
            try {
                const response = await fetch('/current-user');
                if (response.ok) {
                    const data = await response.json();
                    welcomeMessage.innerText = `Ciao, ${data.username}!`;
                    logoutNavItem.style.display = 'inline-block';
                    loginNavItem.style.display = 'none';
                    registerNavItem.style.display = 'none';
                } else {
                    logoutNavItem.style.display = 'none';
                    loginNavItem.style.display = 'inline-block';
                    registerNavItem.style.display = 'inline-block';
                    welcomeMessage.innerText = ''; // Rimuove il messaggio di benvenuto
                }
            } catch (error) {
                console.error('Error fetching user info:', error);
            }
        };
    
        // Gestione del click sul pulsante di logout
        if(logoutLink){
        document.getElementById('logoutLink').addEventListener('click', async () => {
            try {
                const response = await fetch('/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if (response.ok) {
                    alert('Logout effettuato con successo!');
                    window.location.reload();

                    updateUIForLoginStatus();
                } else {
                    alert('Logout fallito: ' + response.statusText);
                }
            } catch (error) {
                console.error('Errore durante il logout:', error);
            }
        });
        
        // Mostra i pulsanti corretti al caricamento della pagina
        updateUIForLoginStatus();
   
    }    
    const showWelcomeMessage = async () => {
        try {
            const response = await fetch('/current-user');
            if (response.ok) {
                const data = await response.json();
                const welcomeMessage = document.getElementById('welcomeMessage');
                if (welcomeMessage) {
                    welcomeMessage.innerText = `Ciao, ${data.username}!`;
                }
            } else {
                console.log('Utente non loggato');
            }
        } catch (error) {
            console.error('Errore cercando le info dell\'utente:', error);
        }
    };
    
    showWelcomeMessage();
    
    const profileForm = document.getElementById('profileForm');
    const scheduleForm = document.getElementById('scheduleForm');

    // Profile form submit event listener
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('profilePassword').value;
            const response = await fetch('/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });
            const message = await response.text();
            document.getElementById('profileMessage').innerText = message;
        });
    }

    // Schedule form submit event listener (Admin)
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
    
            const formData = new FormData(scheduleForm); // Usa FormData per raccogliere i dati del form
    
            const response = await fetch('/admin/schedules', {
                method: 'POST',
                body: formData, // Invia il FormData
            });
    
            const message = await response.text();
            alert(message);
            loadAdminSchedules();
            scheduleForm.reset();

        });
    }

    // Load schedules
    const loadSchedules = async () => {
        try {
            const response = await fetch('/schedules');
            
            // Controllo per una risposta corretta
            if (!response.ok) {
                throw new Error('Errore nel caricamento delle schedule');
            }
            
            const schedules = await response.json();
            const schedulesList = document.getElementById('schedules');
            
            // Assicurati che l'elemento con id 'schedules' esista
            if (schedulesList) {
                schedulesList.innerHTML = '';  // Resetta la lista
    
                // Applica lo stile flexbox per mostrare le card affiancate
                schedulesList.style.display = 'flex';
                schedulesList.style.flexWrap = 'wrap';  // Consenti che le card vadano a capo se lo spazio è insufficiente
                schedulesList.style.gap = '16px';  // Spazio tra le card
    
                // Controlla se ci sono schedule
                if (schedules.length > 0) {
                    schedules.forEach(schedule => {
                        // Crea la card
                        const card = document.createElement('div');
                        card.classList.add('card');
                        card.style.border = '1px solid #ccc';
                        card.style.borderRadius = '8px';
                        card.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                        card.style.padding = '16px';
                        card.style.backgroundColor = '#fff';
                        card.style.width = '300px';  // Larghezza delle card
                        card.style.overflow = 'hidden';
    
                        // Aggiungi immagine alla card
                        if (schedule.image) {
                            const img = document.createElement('img');
                            img.src = `${schedule.image}?timestamp=${new Date().getTime()}`; // Aggiungi un timestamp per evitare cache                            img.alt = `${schedule.destination} Tour`;
                            img.style.width = '100%';
                            img.style.borderRadius = '8px 8px 0 0';
                            card.appendChild(img);
                        }
                        
                        // Crea un container per il contenuto testuale
                        const cardContent = document.createElement('div');
                        cardContent.style.padding = '8px';
    
                        // Titolo (destinazione e data)
                        const cardTitle = document.createElement('h3');
                        cardTitle.innerText = `${schedule.destination} - ${schedule.date} durata: ${schedule.duration} giorni (Prezzo a persona: ${schedule.price}€)`;
                        cardTitle.style.fontSize = '18px';
                        cardTitle.style.margin = '8px 0';
                        cardContent.appendChild(cardTitle);
    
                        // Descrizione del tour
                        const cardDescription = document.createElement('p');
                        cardDescription.innerText = schedule.description;
                        cardDescription.style.fontSize = '14px';
                        cardDescription.style.color = '#555';
                        cardContent.appendChild(cardDescription);
    
                        // Aggiungi pulsante per la prenotazione
                        const bookButton = document.createElement('button');
                        bookButton.innerText = 'Prenota';
                        bookButton.onclick = () => showBookingForm(schedule._id);
                        bookButton.style.backgroundColor = '#dc3c2c';
                        bookButton.style.color = '#fff';
                        bookButton.style.border = 'none';
                        bookButton.style.borderRadius = '4px';
                        bookButton.style.padding = '10px 16px';
                        bookButton.style.cursor = 'pointer';
                        bookButton.style.marginTop = '12px';
                        bookButton.onmouseover = () => {
                            bookButton.style.backgroundColor = '#a90b0b';
                        };
                        bookButton.onmouseout = () => {
                            bookButton.style.backgroundColor = '#a90b0b';
                        };
                        cardContent.appendChild(bookButton);
    
                        // Aggiungi il contenuto alla card
                        card.appendChild(cardContent);
                        
                        // Aggiungi la card alla lista di schedule
                        schedulesList.appendChild(card);
                    });
                } else {
                    // Mostra un messaggio se non ci sono schedule disponibili
                    const noScheduleMessage = document.createElement('div');
                    noScheduleMessage.innerText = 'Nessun tour disponibile al momento.';
                    noScheduleMessage.style.fontSize = '16px';
                    noScheduleMessage.style.color = '#888';
                    schedulesList.appendChild(noScheduleMessage);
                }
            }
        } catch (error) {
            console.error('Errore durante il caricamento delle schedule:', error);
        }
    };
// Mostra il form di prenotazione
const showBookingForm = (scheduleId) => {
    console.log('È stato cliccato prenota');
    const bookingForm = document.getElementById('bookingForm');
    
    document.getElementById('scheduleIdInput').value = scheduleId;
    
    bookingForm.style.display = 'block';
};
const fetchSessionData = async () => {
    try {
        const response = await fetch('/api/session');
        if (!response.ok) {
            throw new Error('Non autenticato');
        }
        const data = await response.json();
        const userId = data.userId; // ora hai accesso all'ID utente
        console.log('User ID:', userId);
        
        // Imposta il valore in un input hidden
        document.getElementById('userIdInput').value = userId; 
    } catch (error) {
        console.error('Errore nel recupero dei dati della sessione:', error);
    }
};

const initializeForm = async () => {
    await fetchSessionData(); // Attendi il recupero dell'ID utente
    const bookingForm = document.getElementById('bookingForm');

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Raccolta dei dati dal modulo
            const scheduleId = document.getElementById('scheduleIdInput').value;
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const documentNumber = document.getElementById('documentNumber').value;
            const seatsRequestedBooking = parseInt(document.getElementById('seatsRequestedBooking').value, 10);
            const usersId = document.getElementById('userIdInput').value; // Assicurati che questo contenga l'ID utente

            console.log('Dati prenotazione:', {
                scheduleId,
                firstName,
                lastName,
                documentNumber,
                seatsRequestedBooking,
                usersId
            });

            const response = await fetch('/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    scheduleId,
                    firstName,
                    lastName,
                    documentNumber,
                    seatsRequestedBooking,
                    usersId
                }),
            });

            if (!response.ok) {
                const errorMessage = await response.text();
                console.error('Errore nella prenotazione:', errorMessage);
                alert('Errore nella prenotazione: ' + errorMessage);
            } else {
                alert('Prenotazione effettuata con successo!');
                bookingForm.reset();
            }
        });
    }
};

initializeForm(); // Inizializza il modulo



const loadUserBookings = async () => {
    try {
        // Ottieni l'ID utente dalla sessione
        const sessionResponse = await fetch('/api/session');
        if (!sessionResponse.ok) {
            throw new Error('Utente non autenticato');
        }
        const sessionData = await sessionResponse.json();
        const userId = sessionData.userId; // Ottieni l'ID dell'utente

        // Recupera le prenotazioni dell'utente specifico
        const response = await fetch(`/user/bookings?userId=${userId}`);
        if (response.ok) {
            const bookings = await response.json();
            console.log(bookings);

            const userBookingsList = document.getElementById('userBookings');
            userBookingsList.innerHTML = ''; // Svuota la lista delle prenotazioni precedenti

            bookings.forEach(booking => {
                const li = document.createElement('li');
                li.innerHTML = `
                <div class="schedule-item">
                    <h3>Tour: ${booking.tourName}</h3>
                    <p><strong>Data:</strong> ${booking.date} per ${booking.scheduleId.duration} giorni</p> 
                    <p><strong>Nome:</strong> ${booking.nome}</p>
                    <p><strong>Cognome:</strong> ${booking.cognome}</p>
                    <p><strong>Codice Fiscale:</strong> ${booking.numeroDocumento}</p>
                    <p><strong>Prezzo Totale: </strong>${(booking.scheduleId.price * booking.scheduleId.duration)}€</p>  
                    <br>
                </div>
                `;
                userBookingsList.appendChild(li);
            });
        } else {
            console.error('Fallimento nel caricare le prenotazioni dell\'utente:', response.statusText);
        }
    } catch (error) {
        console.error('Fallimento nel caricare le prenotazioni dell\'utente:', error);
    }
};




    // Load bookings
    const loadBookings = async () => {
        const response = await fetch('/user/bookings');
        const bookings = await response.json();
        console.log(bookings);
        const bookingsList = document.getElementById('bookings');
        if (bookingsList) {
            bookingsList.innerHTML = '';
            bookings.forEach(booking => {
                
                const li = document.createElement('li');
                li.innerText = `ID: ${booking.scheduleId}`;
                bookingsList.appendChild(li);
            });
        }
    };

    // Load admin schedules and set up buttons
    const loadAdminSchedules = async () => {
        const response = await fetch('/schedules');
        const schedules = await response.json();
        console.log('schedules:'+schedules);
        const adminSchedulesList = document.getElementById('adminSchedules');
        if (adminSchedulesList) {
            adminSchedulesList.innerHTML = '';
            schedules.forEach(schedule => {
                const li = document.createElement('li');
                li.innerHTML = `
                <div class="schedule-item">
                    <h3>${schedule.destination} - <span>${schedule.date}</span></h3>
                    <p><strong>Durata:</strong> ${schedule.duration} giorni</p>
                    <p><strong>Descrizione:</strong> ${schedule.description}</p>
                    <p><strong>Bus ID:</strong> ${schedule.busId}</p>
                    <p><strong>Posti rimanenti:</strong> ${schedule.capacity}</p>
                    <p><strong>Prezzo a persona:</strong> €${schedule.price}</p>
                </div>
                <div class="schedule-actions">
                    
                </div>
            `;
            
            // Aggiungi la classe CSS per la struttura
            li.className = 'schedule-item-container';
            
                adminSchedulesList.appendChild(li);

                const deleteButton = document.createElement('button');
                deleteButton.innerText = 'Cancella';
                deleteButton.style= 'margin-left:20px;';
                deleteButton.className = 'delete-button';  
                deleteButton.onclick = async () => {
                    await fetch(`/admin/schedules/${schedule._id}`, {
                        method: 'DELETE',
                    });
                    loadAdminSchedules();
                };
                li.appendChild(deleteButton);

                    const editButton = document.createElement('button');
                    editButton.className = 'edit-button';

                    editButton.textContent = 'Modifica';
                    
                    // Funzione per creare e mostrare la modale
                    const showModal = (schedule) => {
                        // Crea la modale
                        const modal = document.createElement('div');
                        modal.id = 'editModal';
                        modal.className = 'modal';
                        
                        const modalContent = document.createElement('div');
                        modalContent.className = 'modal-content';
                        
                        const closeButton = document.createElement('span');
                        closeButton.className = 'close';
                        closeButton.textContent = '×';
                        
                        const title = document.createElement('h2');
                        title.textContent = 'Modifica Programmazione';
                        
                        const form = document.createElement('form');
                        form.id = 'editForm';
                        form.enctype = 'multipart/form-data';

                        form.innerHTML = `
                            <label for="destination">Nuova Destinazione:</label>
                            <input type="text" id="newdestination" name="destination" value="${schedule.destination}">
                            <label for="description">Nuovo ID Bus:</label>
                            <input type="number" id="newBusId" name="newBusId" value="${schedule.busId}">
                            <label for="description">Nuova Durata del Tour:</label>
                            <input type="number" id="newDuration" name="newDuration" value="${schedule.duration}">
                            
                            <label for="date">Nuova Data:</label>
                            <input type="text" id="newdate" name="date" value="${schedule.date}">
                            
                            <label for="description">Nuova Descrizione:</label>
                            <input type="text" id="newdescription" name="description" value="${schedule.description}">
                            
                            <label for="capacity">Nuova Quantità passeggeri:</label>
                            <input type="text" id="newcapacity" name="newcapacity" value="${schedule.capacity}">
                            
                            <!-- Aggiungi un campo per caricare l'immagine -->
                            <label for="tourImage">Modifica Immagine:</label>
                            <input type="file" id="tourImage" name="tourImage">                             
                            <button type="submit">Salva</button>
                            <button type="button" class="cancelButton">Annulla</button>
                        `;
                        
                        modalContent.appendChild(closeButton);
                        modalContent.appendChild(title);
                        modalContent.appendChild(form);
                        modal.appendChild(modalContent);
                        document.body.appendChild(modal);
                        
                        // Mostra la modale
                        modal.style.display = 'block';
                        
                        // Gestisci l'invio del modulo
                        form.onsubmit = async (event) => {
                            event.preventDefault();
                        
                            const newPhoto = document.getElementById('tourImage').files[0];
                            console.log('File selezionato:', newPhoto); // Questo dovrebbe stampare l'oggetto File se è stato selezionato       
                            const formData = new FormData(form);
                            
                            console.log('Dati inviati:', Object.fromEntries(formData.entries()));

                            try {
                                const response = await fetch(`/admin/schedules/${schedule._id}`, {
                                    method: 'PUT',
                                    body: formData,
                                });
                                
                                console.log('Risposta:', response);
                        
                                if (response.ok) {
                                    const data = await response.json();
                                    loadAdminSchedules();
                                    modal.style.display = 'none';
                                    document.body.removeChild(modal);
                                } else {
                                    console.error('Errore nell\'aggiornamento:', response.statusText);
                                }
                            } catch (error) {
                                console.error('Errore:', error);
                            }
                        };
                        
                        // Gestisci la chiusura della modale
                        closeButton.onclick = () => {
                            modal.style.display = 'none';
                            document.body.removeChild(modal);
                        };
                        
                        document.querySelector('.cancelButton').onclick = () => {
                            modal.style.display = 'none';
                            document.body.removeChild(modal);
                        };
                        
                        window.onclick = (event) => {
                            if (event.target === modal) {
                                modal.style.display = 'none';
                                document.body.removeChild(modal);
                            }
                        };
                    };
                    
                    // Aggiungi l'evento click al pulsante di modifica
                    editButton.onclick = () => {
                        // Supponendo che tu abbia accesso all'oggetto schedule
                        showModal(schedule);
                    };
                    
                    // Aggiungi il pulsante alla lista
                    li.appendChild(editButton);
                
            });
        }
    };

    // Initial load of data
    loadSchedules();
    loadBookings();
    if (window.location.pathname.includes('/admin')) {
        loadAdminSchedules();
    }
    const sections = document.querySelectorAll('.content-section');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    function showSection(sectionId) {

        sections.forEach(section => {
            section.style.display = 'none';
        });
        const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';

        // Esegui azioni specifiche per le sezioni
        if (sectionId === 'my-bookings') {
            loadUserBookings();
            fetchUserBookings();
        }
        if (sectionId === 'availability') {
            loadUserBusAvailabilities();
        }
    } else {
        console.warn(`Elemento con ID ${sectionId} non trovato`);
    }
    }
   
    

    // Add event listeners to navbar links
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            console.log('Link cliccato:', link.getAttribute('href')); // Aggiungi questo
            event.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            console.log(targetId);
            showSection(targetId);

            

        });
    
    });

    
    


    // Initially show the Home section
    showSection('home');

});
