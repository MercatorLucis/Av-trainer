// --- Aircraft Management State ---
let aircraftLibrary = [];
let flightLegs = [];
let stationCoords = { dep: null, arr: null };
let legToDeleteIndex = -1;

/**
 * Toast Notification System
 * type: 'success', 'error', 'info'
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icons based on type
    let icon = '';
    if (type === 'success') icon = '✓';
    else if (type === 'error') icon = '⚠';
    else icon = 'ℹ';

    toast.innerHTML = `
        <div class="toast-msg">
            <span style="font-size: 1.2rem;">${icon}</span>
            <span>${message}</span>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        });
    }, 4000); // 4 seconds
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("App initialized");
    try {


        setupEventListeners();
        setupSidebar();

        // Initialize Aircraft Library
        loadAircraftLibrary();
        setupAircraftUI();

        // Initialize Flight Legs
        loadFlightLegs();
        setupFlightPlanningUI();

        if (document.querySelector('.dashboard-grid')) {
            setupWBTable();
            calculateAll();
            startZuluClock();
            setupWeatherIntegration();
        }
    } catch (e) {
        console.error("Critical Error during initialization:", e);
    }
});

// --- Weather Integration ---
let stationUpdateTimeout = null;

function setupWeatherIntegration() {
    const depStation = document.getElementById('dep-station');
    const arrStation = document.getElementById('arr-station');
    const depTime = document.getElementById('dep-time');

    const debouncedUpdate = (type) => {
        if (stationUpdateTimeout) clearTimeout(stationUpdateTimeout);
        stationUpdateTimeout = setTimeout(() => handleStationUpdate(type), 500);
    };

    if (depStation) {
        depStation.addEventListener('input', () => {
            if (depStation.value.length >= 3) debouncedUpdate('dep');
        });
        depStation.addEventListener('blur', () => handleStationUpdate('dep'));
    }

    if (arrStation) {
        arrStation.addEventListener('input', () => {
            if (arrStation.value.length >= 3) debouncedUpdate('arr');
        });
        arrStation.addEventListener('blur', () => handleStationUpdate('arr'));
    }

    if (depTime) {
        depTime.addEventListener('blur', () => {
            // If time changes, re-fetch both if they exist
            if (depStation.value) handleStationUpdate('dep');
            if (arrStation.value) handleStationUpdate('arr');
        });
    }
}

async function handleStationUpdate(type) {
    const stationInput = document.getElementById(`${type}-station`);
    const statusEl = document.getElementById(`${type}-weather-status`);
    if (!stationInput) return;

    const rawId = stationInput.value.trim().toUpperCase();
    if (rawId.length < 3) {
        if (statusEl) statusEl.innerHTML = '';
        return;
    }

    console.log(`[WeatherService] Initiating update for ${type}: ${rawId}`);

    // Show loading indicator
    if (statusEl) {
        statusEl.className = 'weather-status';
        statusEl.innerHTML = '<div class="spinner"></div> Loading...';
    }

    // Gather context
    const depTimeInput = document.getElementById('dep-time');
    let useTaf = false;
    let targetDate = null;

    if (depTimeInput && depTimeInput.value && depTimeInput.value.length === 4) {
        const hh = parseInt(depTimeInput.value.substring(0, 2));
        const mm = parseInt(depTimeInput.value.substring(2, 4));
        const now = new Date();
        const t = new Date(now);
        t.setUTCHours(hh, mm, 0, 0);
        if (t < now) t.setUTCDate(t.getUTCDate() + 1);
        targetDate = t;
        useTaf = true;
    }

    try {
        // 1. Fetch Station Info and Weather in PARALLEL for speed
        const [info, metarData, tafData] = await Promise.all([
            weatherService.getStationInfo(rawId),
            weatherService.getWeather(rawId, 'metar'),
            useTaf ? weatherService.getWeather(rawId, 'taf') : Promise.resolve(null)
        ]);

        // 2. Process Station Info (Elevation & Coords)
        if (info) {
            if (info.elevationFeet !== undefined && info.elevationFeet !== null) {
                const altInput = document.getElementById(`${type}-alt`);
                if (altInput) altInput.value = info.elevationFeet;
            }
            if (info.lat && info.lon) {
                stationCoords[type] = { lat: info.lat, lon: info.lon };
                calculateDistance();

                // Auto-set Timezone if Departure
                if (type === 'dep') {
                    const offset = Math.round(info.lon / 15);
                    const tzSelect = document.getElementById('time-zone-select');
                    if (tzSelect) {
                        tzSelect.value = offset;
                        // Trigger visual update if needed, but the clock loop reads value automatically
                    }
                }
            }
        }

        // 3. Process Weather Data
        let weather = null;
        let metar = metarData ? weatherService.parseMetar(metarData) : null;
        let taf = tafData ? weatherService.parseTaf(tafData, targetDate) : null;

        if (useTaf && taf) {
            weather = taf;
            if (metar) {
                // Merge METAR persistence info into TAF if values missing
                if (weather.temp === null) weather.temp = metar.temp;
                if (!weather.altimeterInHg) weather.altimeterInHg = metar.altimeterInHg;
            }
        } else {
            weather = metar;
        }

        // 4. Update UI
        if (weather) {
            fillWeatherInputs(type, weather, info);

            // Show success status
            if (statusEl) {
                statusEl.className = 'weather-status success';
                statusEl.innerHTML = '✓ Weather loaded';
                // Clear success message after 3 seconds
                setTimeout(() => {
                    if (statusEl.innerHTML.includes('Weather loaded')) {
                        statusEl.innerHTML = '';
                    }
                }, 3000);
            }

            // Recalculate after a short delay
            setTimeout(() => {
                calculateCruiseAverages();
                calculateAll();
            }, 0);
        } else {
            // No weather data found
            if (statusEl) {
                statusEl.className = 'weather-status error';
                statusEl.innerHTML = 'No data found';
            }
        }
    } catch (e) {
        console.error("[WeatherService] Update failed:", e);
        if (statusEl) {
            statusEl.className = 'weather-status error';
            statusEl.innerHTML = 'Fetch failed';
        }
    }
}

function clearWeatherInputs(type) {
    const fields = ['alt-set', 'oat', 'wind-dir', 'wind-spd', 'rwy'];
    fields.forEach(f => {
        const el = document.getElementById(`${type}-${f}`);
        if (el) el.value = "";
    });
}

function fillWeatherInputs(type, weather, info) {
    console.log(`Filling inputs for ${type}. Weather:`, weather);

    // Altimeter
    const altSet = document.getElementById(`${type}-alt-set`);
    if (altSet) {
        if (weather.altimeterInHg !== undefined && weather.altimeterInHg !== null) {
            const val = parseFloat(weather.altimeterInHg).toFixed(2);
            altSet.value = val;
            console.log(`Set ${type} altimeter to ${val}`);
        } else {
            console.warn(`No altimeter data for ${type}`);
        }
    }

    // Temp (OAT)
    const oat = document.getElementById(`${type}-oat`);
    if (oat) {
        if (weather.temp !== undefined && weather.temp !== null) {
            oat.value = weather.temp;
            console.log(`Set ${type} OAT to ${weather.temp}`);
        } else {
            console.warn(`No temperature data for ${type}`);
        }
    }

    // Wind
    const wDir = document.getElementById(`${type}-wind-dir`);
    const wSpd = document.getElementById(`${type}-wind-spd`);
    if (wDir) {
        if (weather.windDir !== undefined && weather.windDir !== null) {
            wDir.value = weather.windDir;
            console.log(`Set ${type} wind direction to ${weather.windDir}`);
        }
    }
    if (wSpd) {
        if (weather.windSpd !== undefined && weather.windSpd !== null) {
            wSpd.value = weather.windSpd;
            console.log(`Set ${type} wind speed to ${weather.windSpd}`);
        }
    }

    // Runway
    // Runway
    const rwy = document.getElementById(`${type}-rwy`);
    const availToInput = document.getElementById('avail-to-dist');
    const availLdgInput = document.getElementById('avail-ldg-dist');

    if (rwy && info && info.runways && info.runways.length > 0) {
        const best = weatherService.determineRunway(weather.windDir, info.runways);
        if (best !== null && best !== undefined) {
            const rwyNum = parseInt(best.id);
            if (!isNaN(rwyNum)) {
                rwy.value = rwyNum;
                console.log(`Set ${type} runway to ${rwyNum} (best for wind ${weather.windDir})`);

                // Auto-fill Available Runway based on type
                if (best.length) {
                    if (type === 'dep' && availToInput) {
                        availToInput.value = best.length;
                    } else if (type === 'arr' && availLdgInput) {
                        availLdgInput.value = best.length;
                    }
                }
            }
        }
    }
}

function calculateCruiseAverages() {
    const depOat = parseFloat(document.getElementById('dep-oat').value);
    const arrOat = parseFloat(document.getElementById('arr-oat').value);
    const depAlt = parseFloat(document.getElementById('dep-alt-set').value);
    const arrAlt = parseFloat(document.getElementById('arr-alt-set').value);

    // Temp Avg
    if (!isNaN(depOat) && !isNaN(arrOat)) {
        const avg = (depOat + arrOat) / 2;
        document.getElementById('cruise-oat').value = avg.toFixed(1);
    }

    // Altimeter Avg
    if (!isNaN(depAlt) && !isNaN(arrAlt)) {
        const avg = (depAlt + arrAlt) / 2;
        // Cruise altimeter isn't always standard 29.92 depending on altitude, but for planning:
        document.getElementById('cruise-alt-set').value = avg.toFixed(2);
    }

    // Winds Aloft (Simplified: Average of Surface Winds)
    const depDir = parseFloat(document.getElementById('dep-wind-dir').value);
    const depSpd = parseFloat(document.getElementById('dep-wind-spd').value);
    const arrDir = parseFloat(document.getElementById('arr-wind-dir').value);
    const arrSpd = parseFloat(document.getElementById('arr-wind-spd').value);

    if (!isNaN(depDir) && !isNaN(depSpd) && !isNaN(arrDir) && !isNaN(arrSpd)) {
        // Simple vector averaging or just scalar for speed?
        // Scalar avg for now.
        const avgSpd = (depSpd + arrSpd) / 2;

        // Circular avg for direction is strictly better but linear is "ok" for small diffs.
        // Let's do simple linear avg, handling 360 wrap logic is overkill for this step unless requested.
        let avgDir = (depDir + arrDir) / 2;
        if (Math.abs(depDir - arrDir) > 180) {
            avgDir += 180;
            if (avgDir > 360) avgDir -= 360;
        }

        document.getElementById('cruise-wind-dir').value = Math.round(avgDir);
        document.getElementById('cruise-wind-spd').value = Math.round(avgSpd);
    }
}

function startZuluClock() {
    // Initialize Timer Select
    const tzSelect = document.getElementById('time-zone-select');
    if (tzSelect && tzSelect.options.length === 1) { // Only default exists
        tzSelect.innerHTML = '';
        for (let i = -12; i <= 14; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            const sign = i >= 0 ? '+' : '';
            opt.textContent = `UTC${sign}${i}`;
            if (i === 0) opt.selected = true;
            tzSelect.appendChild(opt);
        }
        // Try to set system local default if no data
        const sysOffset = -new Date().getTimezoneOffset() / 60;
        tzSelect.value = Math.round(sysOffset);
    }

    function update() {
        const now = new Date();
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');

        const clockEl = document.getElementById('zulu-clock');
        if (clockEl) {
            clockEl.textContent = `${hours}:${minutes}:${seconds}Z`;
        }

        // Local Clock
        let offset = 0;
        if (tzSelect) offset = parseFloat(tzSelect.value) || 0;

        const localTime = new Date(now.getTime() + (offset * 3600000));
        const lHours = String(localTime.getUTCHours()).padStart(2, '0');
        const lMinutes = String(localTime.getUTCMinutes()).padStart(2, '0');
        const lSeconds = String(localTime.getUTCSeconds()).padStart(2, '0');

        const localEl = document.getElementById('local-clock');
        if (localEl) localEl.textContent = `${lHours}:${lMinutes}:${lSeconds}`;

        // Update relative time
        updateRelativeTime(now, offset);
    }

    update(); // Initial call
    setInterval(update, 1000); // Update every second
}

function updateRelativeTime(now, offset) {
    const input = document.getElementById('dep-time');
    const output = document.getElementById('dep-relative-time');

    if (!input || !output) return;

    let val = input.value.trim().replace(':', '');

    if (!/^\d{3,4}$/.test(val)) {
        output.textContent = "";
        return;
    }

    val = val.padStart(4, '0');

    if (!/^([01][0-9]|2[0-3])[0-5][0-9]$/.test(val)) {
        output.textContent = "Invalid time (HHMM)";
        return;
    }

    const depH = parseInt(val.substring(0, 2), 10);
    const depM = parseInt(val.substring(2, 4), 10);

    // Create Date object for Departure (UTC)
    let depTime = new Date(now);
    depTime.setUTCHours(depH, depM, 0, 0);

    // If depTime is in the past (e.g. now 1400Z, input 1300Z), assume tomorrow
    if (depTime < now) {
        depTime.setUTCDate(depTime.getUTCDate() + 1);
    }

    const diffMs = depTime - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    // Calculate "Local" Day
    // We add the offset to both UTC times to see what "day" it is locally
    const nowLocal = new Date(now.getTime() + (offset * 3600000));
    const depLocal = new Date(depTime.getTime() + (offset * 3600000));

    // Compare Local Date Strings (YYYY-MM-DD) to determine today/tomorrow
    // Using getUTCDate because 'nowLocal' acts as a UTC container for the shifted time
    const nowDay = nowLocal.getUTCDate();
    const depDay = depLocal.getUTCDate();

    // Simple check: if same day -> Today. If next day -> Tomorrow.
    // Note: If crossing month/year, dates differ.
    // robust check: compare full date strings
    const nowStr = nowLocal.toISOString().split('T')[0];
    const depStr = depLocal.toISOString().split('T')[0];

    const dayStr = (nowStr === depStr) ? "today" : "tomorrow";

    output.textContent = `That's ${dayStr} in ${diffHours}h ${diffMinutes}m (local time)`;
}


// --- Aircraft Logic ---
function loadAircraftLibrary() {
    const saved = localStorage.getItem('aircraftLibrary');
    if (saved) {
        try {
            aircraftLibrary = JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse aircraft library", e);
            aircraftLibrary = [];
        }
    }

    // Add test aircraft if library is empty
    if (aircraftLibrary.length === 0) {
        aircraftLibrary.push({
            registration: 'N-TRAINR',
            model: 'GENERIC',
            emptyWeight: 1120,
            emptyArm: 33.1
        });

        saveAircraftLibrary();
        console.log('Added default generic aircraft to library');
    }
}

function saveAircraftLibrary() {
    localStorage.setItem('aircraftLibrary', JSON.stringify(aircraftLibrary));
    renderShowAircraftDropdown(); // Refresh UI
}

function setupAircraftUI() {
    const selectBtn = document.getElementById('select-aircraft-btn');
    const dropdown = document.getElementById('aircraft-dropdown');
    const addMenuBtn = document.getElementById('add-aircraft-menu-item');

    // Toggle Dropdown
    selectBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        renderShowAircraftDropdown();
    });

    // Close Dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !selectBtn.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    // Modal Elements
    const modal = document.getElementById('add-aircraft-modal');
    const closeBtn = document.getElementById('close-modal-btn');

    // View Elements
    const viewList = document.getElementById('modal-view-list');
    const viewForm = document.getElementById('add-aircraft-form');
    const footerForm = document.getElementById('modal-footer-form');
    const btnAddNew = document.getElementById('btn-add-new');

    // Form Elements
    const cancelBtn = document.getElementById('cancel-add-btn');
    const saveBtn = document.getElementById('save-aircraft-btn');
    const modalTitle = document.getElementById('modal-title');
    const editIndexInput = document.getElementById('edit-index');

    // --- Modal Navigation ---
    function openModal() {
        dropdown.classList.add('hidden');
        modal.classList.remove('hidden');
        showListView();
    }

    // Expose for sidebar
    window.openAircraftManager = openModal;

    function showListView() {
        viewList.classList.remove('hidden');
        viewForm.classList.add('hidden');
        footerForm.classList.add('hidden');
        if (modalTitle) modalTitle.textContent = "Aircraft Profiles";
        renderAircraftListModal();
    }

    function showFormView(isEdit = false, index = -1) {
        viewList.classList.add('hidden');
        viewForm.classList.remove('hidden');
        footerForm.classList.remove('hidden');

        // Reset or Fill Form
        const regInput = document.getElementById('new-ac-reg');
        const modelSelect = document.getElementById('new-ac-model');
        const weightInput = document.getElementById('new-ac-weight');
        const armInput = document.getElementById('new-ac-arm');

        editIndexInput.value = index;

        // Populate model options
        populateModelOptions();

        if (isEdit && index >= 0) {
            const ac = aircraftLibrary[index];
            if (modalTitle) modalTitle.textContent = "Edit Aircraft";
            regInput.value = ac.registration;
            modelSelect.value = ac.model || '';
            weightInput.value = ac.emptyWeight;
            armInput.value = ac.emptyArm;
        } else {
            if (modalTitle) modalTitle.textContent = "Add New Aircraft";
            regInput.value = "";
            modelSelect.value = "";
            weightInput.value = "";
            armInput.value = "";
        }
    }

    // --- Wiring ---
    addMenuBtn?.addEventListener('click', openModal);

    // Sidebar link handled in setupSidebar, assumes it opens #add-aircraft-modal
    // We need to make sure it resets view
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class' && !modal.classList.contains('hidden')) {
                // Modal opened
                if (viewList.classList.contains('hidden') && viewForm.classList.contains('hidden')) {
                    // Initial state or broken state, show list
                    showListView();
                }
            }
        });
    });
    observer.observe(modal, { attributes: true });

    closeBtn?.addEventListener('click', () => modal.classList.add('hidden'));

    btnAddNew?.addEventListener('click', () => showFormView(false));

    cancelBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        showListView();
    });

    // --- Save Logic ---
    saveBtn?.addEventListener('click', (e) => {
        e.preventDefault();

        const regInput = document.getElementById('new-ac-reg');
        const modelSelect = document.getElementById('new-ac-model');
        const weightInput = document.getElementById('new-ac-weight');
        const armInput = document.getElementById('new-ac-arm');

        const reg = regInput?.value.trim().toUpperCase();
        const model = modelSelect?.value;
        const weight = parseFloat(weightInput?.value);
        const arm = parseFloat(armInput?.value);
        const index = parseInt(editIndexInput.value);

        if (!reg || !model || isNaN(weight) || isNaN(arm)) {
            showToast("Please fill in all fields correctly.", "error");
            return;
        }

        const newAircraft = {
            registration: reg,
            model: model,
            emptyWeight: weight,
            emptyArm: arm
        };

        if (index >= 0) {
            // Update
            aircraftLibrary[index] = newAircraft;
        } else {
            // Create
            aircraftLibrary.push(newAircraft);
        }

        saveAircraftLibrary();
        showListView();
    });

    // --- Delete Confirmation Logic ---
    const deleteModal = document.getElementById('delete-confirm-modal');
    const deleteText = document.getElementById('delete-confirm-text');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    let deleteIndex = -1;

    function openDeleteModal(index) {
        deleteIndex = index;
        const ac = aircraftLibrary[index];
        if (deleteText) deleteText.textContent = `Are you sure you want to delete ${ac.registration}?`;
        deleteModal.classList.remove('hidden');
    }

    function closeDeleteModal() {
        deleteModal.classList.add('hidden');
        deleteIndex = -1;
    }

    cancelDeleteBtn?.addEventListener('click', closeDeleteModal);

    confirmDeleteBtn?.addEventListener('click', () => {
        if (deleteIndex >= 0) {
            aircraftLibrary.splice(deleteIndex, 1);
            saveAircraftLibrary();
            showListView();
            closeDeleteModal();
        }
    });

    // Helper function to populate model options
    function populateModelOptions() {
        const modelSelect = document.getElementById('new-ac-model');
        if (!modelSelect) return;

        const models = aircraftDataSystem.getAvailableModels();
        modelSelect.innerHTML = '<option value="">Select Model</option>';

        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.code;
            option.textContent = `${model.name} (${model.category})`;
            modelSelect.appendChild(option);
        });
    }

    // --- Reset / Format Logic ---
    const resetBtn = document.getElementById('btn-format-reset');
    const resetModal = document.getElementById('reset-confirm-modal');
    const cancelResetBtn = document.getElementById('cancel-reset-btn');
    const confirmResetBtn = document.getElementById('confirm-reset-btn');

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetModal.classList.remove('hidden');
        });
    }

    if (cancelResetBtn) {
        cancelResetBtn.addEventListener('click', () => {
            resetModal.classList.add('hidden');
        });
    }

    if (confirmResetBtn) {
        confirmResetBtn.addEventListener('click', () => {
            // Nuclear option: Clear everything
            localStorage.clear();

            // Reload to reset state
            location.reload();
        });
    }

    // Make functions available to render logic (global scope hook)
    window.editAircraft = (index) => showFormView(true, index);
    window.deleteAircraft = (index) => openDeleteModal(index);
}

function renderAircraftListModal() {
    const listContainer = document.getElementById('modal-aircraft-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (aircraftLibrary.length === 0) {
        listContainer.innerHTML = '<div class="dropdown-placeholder" style="text-align:center;">No aircraft profiles found.</div>';
        return;
    }

    aircraftLibrary.forEach((ac, index) => {
        const item = document.createElement('div');
        item.className = 'aircraft-list-item';

        const dragHandle = `
            <div class="drag-handle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle>
                    <circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle>
                </svg>
            </div>
        `;

        const modelName = ac.model ? aircraftDataSystem.models[ac.model]?.name || ac.model : 'Unknown Model';

        const editIcon = `
            <button class="edit-btn" onclick="window.editAircraft(${index})" title="Edit">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </button>
            <button class="delete-btn" onclick="window.deleteAircraft(${index})" title="Delete" style="color: #ef4444; margin-left: 0.5rem; background: none; border: none; cursor: pointer;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        `;



        item.innerHTML = `
            ${dragHandle}
            <span class="ac-info">
                <div style="font-weight: 600;">${ac.registration}</div>
                <div style="font-size: 0.8rem; color: #6b7280;">${modelName}</div>
            </span>
            <div class="ac-controls">
                ${editIcon}
            </div>
        `;

        listContainer.appendChild(item);
    });
}

function renderShowAircraftDropdown() {
    const listContainer = document.getElementById('aircraft-list');
    if (!listContainer) return;

    listContainer.innerHTML = ''; // Clear current

    if (aircraftLibrary.length === 0) {
        listContainer.innerHTML = '<div class="dropdown-placeholder">No aircraft saved</div>';
        return;
    }

    aircraftLibrary.forEach((ac, index) => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        const modelName = ac.model ? aircraftDataSystem.models[ac.model]?.name || ac.model : 'Unknown Model';
        item.innerHTML = `
            <div style="font-weight: 600;">${ac.registration}</div>
            <div style="font-size: 0.8rem; color: #6b7280;">${modelName}</div>
        `;
        item.addEventListener('click', () => {
            selectAircraft(ac);
            document.getElementById('aircraft-dropdown').classList.add('hidden');
        });
        listContainer.appendChild(item);
    });
}

function selectAircraft(ac) {
    console.log('Selecting aircraft:', ac);

    // Populate fields
    const regInput = document.getElementById('registration');
    const weightInput = document.getElementById('wb-empty-w');
    const armInput = document.getElementById('wb-empty-a');

    if (regInput) {
        regInput.value = ac.registration;
        console.log('Set registration to:', ac.registration);
    }

    if (weightInput) {
        weightInput.value = ac.emptyWeight;
        console.log('Set empty weight to:', ac.emptyWeight);
    }

    if (armInput) {
        armInput.value = ac.emptyArm;
        console.log('Set empty arm to:', ac.emptyArm);
    }

    // Load model-specific data if available
    if (ac.model) {
        console.log('Loading data for model:', ac.model);
        loadModelData(ac.model);
    }

    // Trigger calculation
    calculateAll();
}

function setupSidebar() {
    const menuToggle = document.getElementById('menu-toggle');
    const menuClose = document.getElementById('menu-close');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    // Link "Aircraft Profiles" in sidebar to open Modal
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
        if (link.textContent.includes('Aircraft Profiles')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                // Close sidebar first
                sidebar.classList.remove('open');
                overlay.classList.remove('active');

                // Open add modal properly using the exposed function
                if (window.openAircraftManager) {
                    window.openAircraftManager();
                } else {
                    // Fallback if not ready
                    document.getElementById('add-aircraft-modal')?.classList.remove('hidden');
                }
            });
        }
    });


    function toggleMenu() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }

    menuToggle?.addEventListener('click', toggleMenu);
    menuClose?.addEventListener('click', toggleMenu);
    overlay?.addEventListener('click', toggleMenu);

    // Dark Mode Logic
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (darkModeToggle) darkModeToggle.checked = true;
    }

    darkModeToggle?.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });
}

function setupEventListeners() {
    const inputs = document.querySelectorAll('input');
    if (inputs.length === 0) return; // Exit if no inputs (e.g. About page)

    inputs.forEach(input => {
        input.addEventListener('input', calculateAll);
    });

    // Speed and Performance manual triggers
    document.getElementById('cruise-tas')?.addEventListener('input', calculateAll);
    document.getElementById('avail-to-dist')?.addEventListener('input', calculateAll);
    document.getElementById('avail-ldg-dist')?.addEventListener('input', calculateAll);

    // Fuel Weight Manual Trigger
    document.getElementById('wb-fuel-w')?.addEventListener('input', function () {
        const weight = parseFloat(this.value);
        const fuelOnBoard = document.getElementById('fuel-onboard');
        if (!isNaN(weight) && fuelOnBoard) {
            // Update Gallons based on Weight (6 lbs/gal)
            const gallons = weight / 6;
            // Only update the value, don't trigger its input event immediately to avoid loops
            fuelOnBoard.value = gallons.toFixed(1);

            // Now run calculations but calculateWB will respect focus
            calculateAll();
        }
    });

    // Help Button Toggle
    const helpBtn = document.getElementById('help-btn');
    const helpTooltip = document.getElementById('help-tooltip');
    if (helpBtn && helpTooltip) {
        helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            helpTooltip.classList.toggle('show');
            helpBtn.classList.toggle('active');
        });

        // Close when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!helpBtn.contains(e.target) && !helpTooltip.contains(e.target)) {
                helpTooltip.classList.remove('show');
                helpBtn.classList.remove('active');
            }
        });
    }
    const clearBtn = document.getElementById('clear-btn');
    clearBtn?.addEventListener('click', () => {
        // Target only user inputs (yellow), keeping custom row names intact
        const userInputs = document.querySelectorAll('input.input-yellow:not(.wb-name-input)');
        userInputs.forEach(input => {
            input.value = "";
        });

        // Reset summary and legs
        flightLegs = [];
        saveFlightLegs();
        console.log('Flight legs and summary reset');

        calculateAll();
    });

    // --- Sync GPH Fields Removed ---

    // Prevent dragging from output fields
    document.querySelectorAll('.output-white').forEach(el => {
        el.addEventListener('dragstart', e => e.preventDefault());
    });
}

function calculateAll() {
    try {
        calculateAtmosphere('dep');
        calculateAtmosphere('arr');
        calculateAtmosphere('cruise');

        // Wind depends on True Course which depends on coordinates (already set?)
        // Actually True Course is an input or calculated by calculateDistance which is called when stations update.
        // But calculateWind('cruise') uses true-crs input.

        calculateWind('dep');
        calculateWind('arr');
        calculateWind('cruise');

        // Speed depends on Wind (GS)
        calculateSpeed();

        // Fuel depends on Speed (GS checks) and Distance
        calculateFuel();

        calculateWB();
        calculatePerformance();
    } catch (e) {
        console.error("Calculation Error:", e);
    }
}

/**
 * Calculates Standard Temp, Pressure Alt, and Density Alt
 */
function calculateAtmosphere(prefix) {
    const altInput = document.getElementById(`${prefix}-alt`);
    // Fallback: if value is empty string, parse as NaN, then || 0. 
    // IF the input doesn't exist (null), result is 0.
    const alt = parseFloat(altInput?.value) || 0;

    const altSetInput = document.getElementById(`${prefix}-alt-set`);
    const altSet = parseFloat(altSetInput?.value) || 29.92;

    const oatInput = document.getElementById(`${prefix}-oat`);
    const oat = parseFloat(oatInput?.value) || 15;

    // Standard Temperature at Altitude: 15 - (1.98 * alt/1000)
    const stdT = 15 - (1.98 * (alt / 1000));

    // Pressure Altitude: (29.92 - altSet) * 1000 + alt
    const pAlt = (29.92 - altSet) * 1000 + alt;

    // Density Altitude: pAlt + (120 * (oat - stdT))
    const dAlt = pAlt + (120 * (oat - stdT));

    // Update UI
    updateOutput(`${prefix}-std-t`, stdT.toFixed(1));
    updateOutput(`${prefix}-palt`, pAlt.toFixed(0));
    updateOutput(`${prefix}-dalt`, dAlt.toFixed(0));
}

/**
 * Calculates Headwind and Crosswind components
 */
function calculateWind(prefix) {
    const wdirInput = document.getElementById(`${prefix}-wind-dir`);
    const wspdInput = document.getElementById(`${prefix}-wind-spd`);
    let rwyInput = document.getElementById(`${prefix}-rwy`);

    // Special case for cruise which uses true course
    if (prefix === 'cruise') {
        rwyInput = document.getElementById('true-crs');
    }

    // Ensure we have values
    if (!wdirInput || !wspdInput || !rwyInput) return; // Should not trigger if ids are correct

    const wdir = parseFloat(wdirInput.value);
    const wspd = parseFloat(wspdInput.value);
    const rwy = parseFloat(rwyInput.value);

    // If inputs are empty, show placeholders
    if (isNaN(wdir) || isNaN(wspd) || isNaN(rwy)) {
        updateOutput(`${prefix}-xwind`, "---");
        updateOutput(`${prefix}-hwind`, "---");
        return;
    }

    // Runway heading in degrees (e.g. 24 -> 240)
    // For true course (3 digits), use as is. For runway (2 digits), multiply by 10.
    let rwyHdg = rwy;
    if (prefix !== 'cruise') {
        rwyHdg = rwy * 10;
    }

    // Angular difference
    let angleDiff = Math.abs(wdir - rwyHdg);
    // Normalize to 0-180
    if (angleDiff > 180) angleDiff = 360 - angleDiff;

    const angleRad = angleDiff * (Math.PI / 180);

    const xwind = Math.abs(wspd * Math.sin(angleRad));
    const hwind = wspd * Math.cos(angleRad); // Positive = Headwind, Negative = Tailwind

    updateOutput(`${prefix}-xwind`, xwind.toFixed(1));
    updateOutput(`${prefix}-hwind`, hwind.toFixed(1));
}

/**
 * Fuel Calculations
 */
function calculateFuel() {
    // Get current aircraft model (for reference, but we use inputs now)
    const currentModel = getCurrentAircraftModel();

    let gph = parseFloat(document.getElementById('fuel-gph')?.value) || 0;
    const fuelOnBoard = parseFloat(document.getElementById('fuel-onboard')?.value) || 0;

    // Get fuel phases from inputs (now editable)
    let taxiStart = parseFloat(document.getElementById('fuel-taxi')?.value) || 0;
    let climb = parseFloat(document.getElementById('fuel-climb')?.value) || 0;
    // Reserve is auto-calculated below based on VFR day/night rules
    let reserve = 0;

    // Calculate Cruise Fuel
    // Needs Distance and Ground Speed
    const dist = parseFloat(document.getElementById('flight-dist')?.value) || 0;
    const gs = parseFloat(document.getElementById('cruise-gs')?.value) || 0;

    let cruiseTime = 0;
    let cruiseFuel = 0;

    if (dist > 0 && gs > 0) {
        cruiseTime = dist / gs; // Hours
        cruiseFuel = cruiseTime * gph;

        // Update ETE as well
        const eteHours = Math.floor(cruiseTime);
        const eteMinutes = Math.round((cruiseTime - eteHours) * 60);
        const eteStr = `${eteHours.toString().padStart(2, '0')}:${eteMinutes.toString().padStart(2, '0')}`;
        updateOutput('flight-ete', eteStr);

        // Update ETA if departure time is set
        const depTimeInput = document.getElementById('dep-time');
        if (depTimeInput && depTimeInput.value.length === 4) {
            const depH = parseInt(depTimeInput.value.substring(0, 2));
            const depM = parseInt(depTimeInput.value.substring(2, 4));

            let arrTimeM = depM + eteMinutes;
            let arrTimeH = depH + eteHours + Math.floor(arrTimeM / 60);
            arrTimeM = arrTimeM % 60;
            arrTimeH = arrTimeH % 24;

            const etaStr = `${arrTimeH.toString().padStart(2, '0')}${arrTimeM.toString().padStart(2, '0')}Z`;
            updateOutput('flight-eta', etaStr);
        } else {
            updateOutput('flight-eta', "--:--Z");
        }

    } else {
        updateOutput('flight-ete', "--:--");
        updateOutput('flight-eta', "--:--Z");
    }

    // --- VFR Reserve Calculation (auto, based on day/night) ---
    // Day VFR  (0600–1759 local): 30 min = GPH × 0.5
    // Night VFR (1800–0559 local): 45 min = GPH × 0.75
    let reserveLabel = '';

    if (gph > 0) {
        const depTimeInput2 = document.getElementById('dep-time');
        const tzSelect = document.getElementById('time-zone-select');
        const tzOffset = tzSelect ? (parseFloat(tzSelect.value) || 0) : 0;
        let reserveMultiplier = 0.5; // Default: Day VFR
        reserveLabel = 'Day VFR (30 min)';

        if (depTimeInput2 && depTimeInput2.value.length === 4) {
            const depHutc = parseInt(depTimeInput2.value.substring(0, 2));
            const depMutc = parseInt(depTimeInput2.value.substring(2, 4));
            // Convert UTC departure to local fractional hour
            const localHour = ((depHutc * 60 + depMutc + tzOffset * 60) / 60 + 48) % 24;
            if (localHour >= 6 && localHour < 18) {
                reserveMultiplier = 0.5;
                reserveLabel = 'Day VFR (30 min)';
            } else {
                reserveMultiplier = 0.75;
                reserveLabel = 'Night VFR (45 min)';
            }
        }

        reserve = gph * reserveMultiplier;
        const reserveInput = document.getElementById('fuel-reserve');
        if (reserveInput) reserveInput.value = reserve.toFixed(2);
    }

    // Update or create reserve fine-print note
    let reserveNote = document.getElementById('reserve-note');
    if (!reserveNote) {
        reserveNote = document.createElement('div');
        reserveNote.id = 'reserve-note';
        reserveNote.className = 'fine-print';
        reserveNote.style.gridColumn = '1 / -1';
        const reserveInput = document.getElementById('fuel-reserve');
        if (reserveInput && reserveInput.parentNode) {
            reserveInput.parentNode.insertBefore(reserveNote, reserveInput.nextSibling);
        }
    }
    reserveNote.textContent = reserveLabel;

    const reqFuel = taxiStart + climb + cruiseFuel + reserve;
    const remain = fuelOnBoard - reqFuel;

    updateOutput('fuel-cruise', cruiseFuel.toFixed(1));
    updateOutput('fuel-required', reqFuel.toFixed(1));
    updateOutput('fuel-remaining', remain.toFixed(1));

    // --- Insufficient Fuel Warning ---
    const remainingEl = document.getElementById('fuel-remaining');
    let insufficientNote = document.getElementById('fuel-insufficient-note');

    // Create the fine-print note element if it doesn't exist yet
    if (!insufficientNote) {
        insufficientNote = document.createElement('div');
        insufficientNote.id = 'fuel-insufficient-note';
        insufficientNote.className = 'fine-print';
        insufficientNote.style.gridColumn = '1 / -1';
        insufficientNote.style.color = '#ef4444';
        insufficientNote.style.fontWeight = '600';
        if (remainingEl && remainingEl.parentNode) {
            remainingEl.parentNode.insertBefore(insufficientNote, remainingEl.nextSibling);
        }
    }

    if (fuelOnBoard > 0 && remain < reserve) {
        // Show warning
        if (remainingEl) {
            remainingEl.style.color = '#ef4444';
            remainingEl.style.fontWeight = '800';
        }
        insufficientNote.textContent = '⚠ Insufficient fuel — below VFR reserve';
    } else {
        // Clear warning
        if (remainingEl) {
            remainingEl.style.color = '';
            remainingEl.style.fontWeight = '';
        }
        insufficientNote.textContent = '';
    }
}

/**
 * Weight and Balance
 */
function calculateWB() {
    // Get current aircraft model
    const currentModel = getCurrentAircraftModel();

    // Fuel Weight calculations (tied to fuel on board specifically)
    const fuelOnBoard = parseFloat(document.getElementById('fuel-onboard')?.value) || 0;
    const fuelW = fuelOnBoard * 6;
    const fuelWInput = document.getElementById('wb-fuel-w');
    if (fuelWInput && document.activeElement !== fuelWInput) {
        fuelWInput.value = fuelW.toFixed(1);
    }

    let totalW = 0;
    let totalM = 0;

    const rows = document.querySelectorAll('.wb-row');
    rows.forEach(row => {
        const wInput = row.querySelector('.wb-w');
        const aInput = row.querySelector('.wb-a');
        const mOutput = row.querySelector('.wb-m');

        const weight = parseFloat(wInput?.value) || 0;
        const arm = parseFloat(aInput?.value) || 0;

        const moment = weight * arm;
        if (mOutput) mOutput.value = moment.toFixed(0);

        totalW += weight;
        totalM += moment;
    });

    const cg = totalW > 0 ? totalM / totalW : 0;

    updateOutput('wb-total-w', totalW.toFixed(1));
    updateOutput('wb-total-m', totalM.toFixed(0));
    updateOutput('wb-cg', cg.toFixed(2));
}

function setupWBTable() {
    const tbody = document.getElementById('wb-tbody');
    const addBtn = document.getElementById('add-wb-row-btn');

    if (!tbody) return;

    let draggedRow = null;

    // Initialize drag & drop for a row
    function makeRowDraggable(row) {
        const handle = row.querySelector('.drag-handle');

        // Only allow dragging when clicking the handle
        if (handle) {
            handle.addEventListener('mousedown', () => row.setAttribute('draggable', 'true'));
            handle.addEventListener('mouseup', () => row.removeAttribute('draggable'));
            row.addEventListener('mouseleave', () => row.removeAttribute('draggable'));
        }

        row.addEventListener('dragstart', (e) => {
            draggedRow = row;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', row.innerHTML);
            setTimeout(() => row.classList.add('dragging'), 0);
        });

        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            row.removeAttribute('draggable');
            draggedRow = null;
            calculateAll(); // Recalculate if order matters for anything, or save state
        });

        // Delete button listener
        const delBtn = row.querySelector('.delete-wb-row');
        if (delBtn) {
            delBtn.addEventListener('click', () => {
                row.remove();
                calculateAll();
            });
            // Show delete button on hover
            row.addEventListener('mouseenter', () => delBtn.classList.remove('hidden'));
            row.addEventListener('mouseleave', () => delBtn.classList.add('hidden'));
        }

        // Input listeners for new rows
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', calculateAll);
        });
    }

    tbody.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(tbody, e.clientY);
        if (draggedRow) {
            if (afterElement == null) {
                tbody.appendChild(draggedRow);
            } else {
                tbody.insertBefore(draggedRow, afterElement);
            }
        }
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.wb-row:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Initialize existing rows
    const existingRows = tbody.querySelectorAll('.wb-row');
    existingRows.forEach(makeRowDraggable);

    // Add new row button
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const tr = document.createElement('tr');
            tr.className = 'wb-row';
            tr.innerHTML = `
                <td class="wb-item-cell">
                    <div class="drag-handle">≡</div>
                    <input type="text" class="input-yellow wb-name-input" value="New Item">
                </td>
                <td><input type="number" class="input-yellow wb-w"></td>
                <td><input type="number" class="input-yellow wb-a"></td>
                <td class="wb-action-cell">
                    <input type="text" class="output-white wb-m" readonly>
                    <button class="icon-btn delete-wb-row hidden" tabindex="-1">✕</button>
                </td>
            `;
            tbody.appendChild(tr);
            makeRowDraggable(tr);
            calculateAll();
        });
    }
}

/**
 * Performance (Takeoff & Landing) using Bilinear Interpolation
 */
function calculatePerformance() {
    // Get current aircraft model from registration or default
    const currentModel = getCurrentAircraftModel();

    if (!currentModel) {
        // Fallback to hardcoded data if no model selected
        updateOutput('perf-to-roll', "N/A");
        updateOutput('perf-to-50', "N/A");
        updateOutput('perf-ldg-roll', "N/A");
        updateOutput('perf-ldg-50', "N/A");
        return;
    }

    // Get performance data from aircraft data system
    const perfData = aircraftDataSystem.getPerformanceData(currentModel);

    if (!perfData) {
        updateOutput('perf-to-roll', "N/A");
        updateOutput('perf-to-50', "N/A");
        updateOutput('perf-ldg-roll', "N/A");
        updateOutput('perf-ldg-50', "N/A");
        return;
    }

    // Current conditions at Departure and Arrival
    const depPAlt = parseFloat(document.getElementById('dep-palt')?.value) || 0;
    const depTemp = parseFloat(document.getElementById('dep-oat')?.value) || 0;

    const arrPAlt = parseFloat(document.getElementById('arr-palt')?.value) || 0;
    const arrTemp = parseFloat(document.getElementById('arr-oat')?.value) || 0;

    const takeoff = getInterpolatedPerformance(perfData.takeoff, depPAlt, depTemp);
    const landing = getInterpolatedPerformance(perfData.landing, arrPAlt, arrTemp);

    const toTotal = takeoff ? Math.round(takeoff.clear50) : null;
    const ldgTotal = landing ? Math.round(landing.clear50) : null;

    updateOutput('perf-to-roll', takeoff ? Math.round(takeoff.roll) : "N/A");
    updateOutput('perf-to-50', toTotal || "N/A");

    updateOutput('perf-ldg-roll', landing ? Math.round(landing.roll) : "N/A");
    updateOutput('perf-ldg-50', ldgTotal || "N/A");

    // Update Runway Info Fine Print
    const depRwyVal = document.getElementById('dep-rwy')?.value;
    const arrRwyVal = document.getElementById('arr-rwy')?.value;
    updateOutput('dep-rwy-info', depRwyVal ? `Rwy ${depRwyVal} ` : "");
    updateOutput('arr-rwy-info', arrRwyVal ? `Rwy ${arrRwyVal} ` : "");

    // Safety Check Helper
    const checkSafety = (availId, reqDist, statusId) => {
        const avail = parseFloat(document.getElementById(availId)?.value);
        const statusEl = document.getElementById(statusId);

        if (statusEl) {
            statusEl.className = "rwy-safety-indicator"; // Reset
            statusEl.innerHTML = "";

            if (!isNaN(avail) && reqDist) {
                if (avail >= reqDist) {
                    statusEl.classList.add("ok");
                } else {
                    statusEl.classList.add("warn");
                }
            }
        }
    };

    // Perform Checks
    // Takeoff vs Takeoff Distance (Over 50' usually, or Roll? Safety usually implies clearing obstacle)
    // Using TO Over 50' for safety
    checkSafety('avail-to-dist', toTotal, 'to-safety-status');

    // Landing vs Landing Distance (Over 50')
    checkSafety('avail-ldg-dist', ldgTotal, 'ldg-safety-status');
}

/**
 * Speed Calculations (TAS, GS)
 */
function calculateSpeed() {
    // 1. Get Inputs
    const tasInput = document.getElementById('cruise-tas');
    const tas = parseFloat(tasInput?.value);

    // Get Density Altitude inputs
    const cruiseAlt = parseFloat(document.getElementById('cruise-alt')?.value) || 0;
    const cruiseAltSet = parseFloat(document.getElementById('cruise-alt-set')?.value) || 29.92;
    const cruiseOat = parseFloat(document.getElementById('cruise-oat')?.value) || 15;

    const stdT = 15 - (1.98 * (cruiseAlt / 1000));
    const pAlt = (29.92 - cruiseAltSet) * 1000 + cruiseAlt;
    const dAlt = pAlt + (120 * (cruiseOat - stdT));

    if (isNaN(tas)) {
        updateOutput('cruise-cas', "---");
        updateOutput('cruise-gs', "---");
        return;
    }

    // 2. Calculate CAS from TAS
    // Formula: CAS = TAS / (1 + (0.02 * (dAlt / 1000)))
    // This is the inverse of the approximation used before.
    const cas = tas / (1 + (0.02 * (dAlt / 1000)));
    updateOutput('cruise-cas', cas.toFixed(0));

    // 3. Calculate Ground Speed
    const wdir = parseFloat(document.getElementById('cruise-wind-dir')?.value);
    const wspd = parseFloat(document.getElementById('cruise-wind-spd')?.value);
    const course = parseFloat(document.getElementById('true-crs')?.value);

    if (isNaN(wdir) || isNaN(wspd) || isNaN(course)) {
        // If no wind data, GS = TAS
        updateOutput('cruise-gs', tas.toFixed(0));
        return;
    }

    // Calculate Wind Components relative to COURSE
    let angleDiff = (wdir - course) * (Math.PI / 180);
    const hwind = wspd * Math.cos(angleDiff);
    const xwind = wspd * Math.sin(angleDiff);

    if (Math.abs(xwind) > tas) {
        updateOutput('cruise-gs', "---");
        return;
    }

    const sinWCA = xwind / tas;
    const wca = Math.asin(sinWCA); // radians

    // GS = TAS * cos(WCA) - hwind
    const gs = (tas * Math.cos(wca)) - hwind;

    updateOutput('cruise-gs', Math.round(gs));
}

function getInterpolatedPerformance(table, pAlt, temp) {
    if (!table) return null;
    const { alts, temps, data } = table;

    // Simple Clamping
    const minAlt = alts[0];
    const maxAlt = alts[alts.length - 1];
    const minTemp = temps[0];
    const maxTemp = temps[temps.length - 1];

    const useAlt = Math.max(minAlt, Math.min(maxAlt, pAlt));
    const useTemp = Math.max(minTemp, Math.min(maxTemp, temp));

    // Find indices
    let altIdx = alts.findIndex(a => a >= useAlt);
    if (altIdx === -1) altIdx = alts.length - 1;
    if (altIdx === 0 && useAlt > alts[0]) altIdx = 1;
    if (altIdx === 0) altIdx = 1;

    let tempIdx = temps.findIndex(t => t >= useTemp);
    if (tempIdx === -1) tempIdx = temps.length - 1;
    if (tempIdx === 0) tempIdx = 1;

    // Coordinates
    const x1 = alts[altIdx - 1];
    const x2 = alts[altIdx];
    const y1 = temps[tempIdx - 1];
    const y2 = temps[tempIdx];

    // Check for "---" (null data points)
    const q11 = data[altIdx - 1][tempIdx - 1];
    const q12 = data[altIdx - 1][tempIdx];
    const q21 = data[altIdx][tempIdx - 1];
    const q22 = data[altIdx][tempIdx];

    if (!q11 || !q12 || !q21 || !q22) return null;

    // Interpolation Factors
    const fx = (useAlt - x1) / (x2 - x1);
    const fy = (useTemp - y1) / (y2 - y1);

    // Interpolate Roll
    const roll = bilinear(
        q11[0], q12[0],
        q21[0], q22[0],
        fx, fy
    );

    // Interpolate Clear 50
    const clear50 = bilinear(
        q11[1], q12[1],
        q21[1], q22[1],
        fx, fy
    );

    return { roll, clear50 };
}

function bilinear(q11, q12, q21, q22, fx, fy) {
    const r1 = q11 * (1 - fx) + q21 * fx;
    const r2 = q12 * (1 - fx) + q22 * fx;
    return r1 * (1 - fy) + r2 * fy;
}

// Helper function to get current aircraft model
function getCurrentAircraftModel() {
    // Try to get model from selected aircraft in library
    const regInput = document.getElementById('registration');
    if (regInput && regInput.value) {
        const registration = regInput.value.trim().toUpperCase();
        const aircraft = aircraftLibrary.find(ac => ac.registration === registration);
        if (aircraft && aircraft.model) {
            console.log('Found aircraft model:', aircraft.model);
            return aircraft.model;
        }
    }

    // Fallback to default model
    console.log('Using default model: GENERIC');
    return 'GENERIC';
}

// Helper function to load model-specific data into UI
function loadModelData(modelCode) {
    console.log('Loading model data for:', modelCode);

    const modelData = aircraftDataSystem.models[modelCode];
    if (!modelData) {
        console.error('Model data not found:', modelCode);
        return;
    }

    // Load fuel data
    if (modelData.fuel) {
        const gphInput = document.getElementById('fuel-gph');
        const taxiInput = document.getElementById('fuel-taxi');
        const climbInput = document.getElementById('fuel-climb');
        const reserveInput = document.getElementById('fuel-reserve');

        if (gphInput) gphInput.value = modelData.fuel.gph;
        if (taxiInput) taxiInput.value = modelData.fuel.taxiStart;
        if (climbInput) climbInput.value = modelData.fuel.climb;
        if (reserveInput) reserveInput.value = modelData.fuel.reserve;

        console.log('Loaded fuel data:', modelData.fuel);
    }

    // Load W&B arms
    if (modelData.weightBalance && modelData.weightBalance.arms) {
        const arms = modelData.weightBalance.arms;
        const frontAInput = document.getElementById('wb-front-a');
        const backAInput = document.getElementById('wb-back-a');
        const bagAInput = document.getElementById('wb-bag-a');
        const fuelAInput = document.getElementById('wb-fuel-a');

        if (frontAInput) frontAInput.value = arms.front;
        if (backAInput) backAInput.value = arms.back;
        if (bagAInput) bagAInput.value = arms.baggage;
        if (fuelAInput) fuelAInput.value = arms.fuel;

        console.log('Loaded W&B arms:', arms);
    }

    console.log('Model data loaded successfully');
}

// --- Flight Planning Extensions ---

function setupFlightPlanningUI() {
    const addLegBtn = document.getElementById('add-leg-btn');
    const seeSummaryBtn = document.getElementById('see-summary-btn');
    const closeSummaryBtn = document.getElementById('close-summary-btn');
    const closeSummaryFooterBtn = document.getElementById('close-summary-footer-btn');
    const closeLegsBtn = document.getElementById('close-legs-btn');
    const closeLegsFooterBtn = document.getElementById('close-legs-footer-btn');
    const clearLegsBtn = document.getElementById('clear-legs-btn');
    const copySummaryBtn = document.getElementById('copy-summary-btn');

    if (addLegBtn) addLegBtn.addEventListener('click', addLeg);
    if (seeSummaryBtn) seeSummaryBtn.addEventListener('click', showSummary);

    // Modal Close buttons
    if (closeSummaryBtn) closeSummaryBtn.addEventListener('click', () => document.getElementById('summary-modal').classList.add('hidden'));
    if (closeSummaryFooterBtn) closeSummaryFooterBtn.addEventListener('click', () => document.getElementById('summary-modal').classList.add('hidden'));
    if (closeLegsBtn) closeLegsBtn.addEventListener('click', () => document.getElementById('legs-modal').classList.add('hidden'));
    if (closeLegsFooterBtn) closeLegsFooterBtn.addEventListener('click', () => document.getElementById('legs-modal').classList.add('hidden'));
    if (clearLegsBtn) clearLegsBtn.addEventListener('click', clearLegs);
    if (copySummaryBtn) copySummaryBtn.addEventListener('click', copySummaryToClipboard);

    // Delete Leg Modal Listeners
    const deleteLegModal = document.getElementById('delete-leg-modal');
    const cancelDeleteLegBtn = document.getElementById('cancel-delete-leg-btn');
    const confirmDeleteLegBtn = document.getElementById('confirm-delete-leg-btn');

    if (cancelDeleteLegBtn) {
        cancelDeleteLegBtn.addEventListener('click', () => {
            if (deleteLegModal) deleteLegModal.classList.add('hidden');
        });
    }

    if (confirmDeleteLegBtn) {
        confirmDeleteLegBtn.addEventListener('click', () => {
            if (legToDeleteIndex >= 0 && legToDeleteIndex < flightLegs.length) {
                flightLegs.splice(legToDeleteIndex, 1);
                saveFlightLegs();
                showToast("Leg deleted.", "info");
                showSummary();
            }
            if (deleteLegModal) deleteLegModal.classList.add('hidden');
        });
    }
}

function calculateDistance() {
    if (!stationCoords.dep || !stationCoords.arr) return;

    const lat1 = stationCoords.dep.lat;
    const lon1 = stationCoords.dep.lon;
    const lat2 = stationCoords.arr.lat;
    const lon2 = stationCoords.arr.lon;

    const R = 3440.065; // Earth radius in Nautical Miles

    // Convert to radians
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    // Distance Calculation (Haversine)
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    const distInput = document.getElementById('flight-dist');
    if (distInput) distInput.value = Math.round(distance);

    // True Course Calculation (Initial Bearing)
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    let θ = Math.atan2(y, x);
    let bearing = (θ * 180 / Math.PI + 360) % 360; // Degrees

    const trueCrsInput = document.getElementById('true-crs');
    if (trueCrsInput) {
        trueCrsInput.value = Math.round(bearing);
        // Trigger calculation since we changed an input programmatically
        // But calculateDistance is usually called inside flow, let's play safe.
    }

    console.log(`Calculated distance: ${distance.toFixed(1)} nm, True Course: ${bearing.toFixed(1)}°`);
}

function addLeg() {
    const dep = document.getElementById('dep-station').value.trim().toUpperCase();
    const arr = document.getElementById('arr-station').value.trim().toUpperCase();

    if (!dep || !arr) {
        showToast("Please enter both departure and arrival stations.", "error");
        return;
    }

    const legData = {
        dep: dep,
        arr: arr,
        dist: document.getElementById('flight-dist').value,
        alt: document.getElementById('cruise-alt').value,
        ete: document.getElementById('flight-ete').value,
        fuel: document.getElementById('fuel-required').value,
        toRoll: document.getElementById('perf-to-roll').value,
        to50: document.getElementById('perf-to-50').value,
        ldgRoll: document.getElementById('perf-ldg-roll').value,
        ldg50: document.getElementById('perf-ldg-50').value,
        timestamp: new Date().toISOString(),
        // Capture State for restoration
        state: {
            depStation: dep,
            arrStation: arr,
            depAlt: document.getElementById('dep-alt').value,
            arrAlt: document.getElementById('arr-alt').value,
            cruiseAlt: document.getElementById('cruise-alt').value,
            depAltSet: document.getElementById('dep-alt-set').value,
            arrAltSet: document.getElementById('arr-alt-set').value,
            cruiseAltSet: document.getElementById('cruise-alt-set').value,
            depOat: document.getElementById('dep-oat').value,
            arrOat: document.getElementById('arr-oat').value,
            cruiseOat: document.getElementById('cruise-oat').value,
            depWindDir: document.getElementById('dep-wind-dir').value,
            depWindSpd: document.getElementById('dep-wind-spd').value,
            arrWindDir: document.getElementById('arr-wind-dir').value,
            arrWindSpd: document.getElementById('arr-wind-spd').value,
            cruiseWindDir: document.getElementById('cruise-wind-dir').value,
            cruiseWindSpd: document.getElementById('cruise-wind-spd').value,
            depRwy: document.getElementById('dep-rwy').value,
            arrRwy: document.getElementById('arr-rwy').value,
            cruiseRpm: document.getElementById('cruise-rpm').value,
            cruiseTas: document.getElementById('cruise-tas').value,
            fuelGph: document.getElementById('fuel-gph').value,
            fuelOnboard: document.getElementById('fuel-onboard').value,
            wbFuelW: document.getElementById('wb-fuel-w').value,
            payload: {
                front: document.getElementById('wb-front-w').value,
                back: document.getElementById('wb-back-w').value,
                bag: document.getElementById('wb-bag-w').value
            }
        }
    };

    flightLegs.push(legData);
    saveFlightLegs();
    showToast(`Leg ${dep} to ${arr} added! Total legs: ${flightLegs.length} `, "success");
}

function showSummary() {
    const modal = document.getElementById('summary-modal');
    const content = document.getElementById('summary-content');
    if (!modal || !content) return;

    // Check if we have global handlers attached
    if (!window.loadLeg) window.loadLeg = loadLeg;
    if (!window.deleteLeg) window.deleteLeg = deleteLeg;

    let html = `
                < div class="summary-section" >
            <h4>Route & Progress (Click leg to load)</h4>
            <table>
                <thead>
                    <tr>
                        <th>Leg</th>
                        <th>Dist</th>
                        <th>ETE</th>
                        <th>Fuel</th>
                        <th>TO Roll</th>
                        <th></th> 
                    </tr>
                </thead>
                <tbody>
    `;

    if (flightLegs.length === 0) {
        html += `<tr><td colspan="6" style="text-align:center;">No legs added yet</td></tr>`;
    } else {
        flightLegs.forEach((leg, index) => {
            html += `
                <tr class="summary-row">
                    <td onclick="window.loadLeg(${index})">${leg.dep}-${leg.arr}</td>
                    <td onclick="window.loadLeg(${index})">${leg.dist}nm</td>
                    <td onclick="window.loadLeg(${index})">${leg.ete}</td>
                    <td onclick="window.loadLeg(${index})">${leg.fuel}gal</td>
                    <td onclick="window.loadLeg(${index})">${leg.toRoll}ft</td>
                    <td style="text-align: right; width: 40px;">
                        <button onclick="window.deleteLeg(event, ${index})" class="icon-btn delete-leg-btn" title="Delete Leg" style="padding: 0.2rem; margin: 0; color: #ef4444; border: none; background: transparent;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    html += `
                </tbody>
            </table>
        </div >
                <div class="summary-section">
                    <h4>Current Performance Details</h4>
                    <p><strong>Aircraft:</strong> ${document.getElementById('registration').value || '---'}</p>
                    <p><strong>TAS:</strong> ${document.getElementById('cruise-tas').value || '---'} kts</p>
                    <p><strong>Gnd Spd:</strong> ${document.getElementById('cruise-gs').value || '---'} kts</p>
                    <p><strong>Total Weight:</strong> ${document.getElementById('wb-total-w').value || '---'} lbs</p>
                    <p><strong>CG:</strong> ${document.getElementById('wb-cg').value || '---'} in</p>
                </div>
            `;

    content.innerHTML = html;
    modal.classList.remove('hidden');
}

function deleteLeg(event, index) {
    event.stopPropagation(); // Prevent loading the leg
    if (index < 0 || index >= flightLegs.length) return;

    legToDeleteIndex = index;
    const leg = flightLegs[index];

    // Open Modal
    const modal = document.getElementById('delete-leg-modal');
    const text = document.getElementById('delete-leg-text');

    if (text) text.textContent = `Are you sure you want to delete leg ${leg.dep} -${leg.arr}?`;
    if (modal) modal.classList.remove('hidden');
}

function loadLeg(index) {
    if (index < 0 || index >= flightLegs.length) return;
    const leg = flightLegs[index];
    const s = leg.state;

    if (!s) {
        showToast("Leg data is incomplete (old version).", "error");
        return;
    }

    // Restore Values
    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }

    setVal('dep-station', s.depStation);
    setVal('arr-station', s.arrStation);
    setVal('dep-alt', s.depAlt);
    setVal('arr-alt', s.arrAlt);
    setVal('cruise-alt', s.cruiseAlt);
    setVal('dep-alt-set', s.depAltSet);
    setVal('arr-alt-set', s.arrAltSet);
    setVal('cruise-alt-set', s.cruiseAltSet);
    setVal('dep-oat', s.depOat);
    setVal('arr-oat', s.arrOat);
    setVal('cruise-oat', s.cruiseOat);
    setVal('dep-wind-dir', s.depWindDir);
    setVal('dep-wind-spd', s.depWindSpd);
    setVal('arr-wind-dir', s.arrWindDir);
    setVal('arr-wind-spd', s.arrWindSpd);
    setVal('cruise-wind-dir', s.cruiseWindDir);
    setVal('cruise-wind-spd', s.cruiseWindSpd);
    setVal('dep-rwy', s.depRwy);
    setVal('arr-rwy', s.arrRwy);
    setVal('cruise-rpm', s.cruiseRpm);
    setVal('cruise-tas', s.cruiseTas);
    setVal('fuel-gph', s.fuelGph);
    setVal('fuel-onboard', s.fuelOnboard);
    setVal('wb-fuel-w', s.wbFuelW);

    if (s.payload) {
        setVal('wb-front-w', s.payload.front);
        setVal('wb-back-w', s.payload.back);
        setVal('wb-bag-w', s.payload.bag);
    }

    // Trigger calculation
    // Note: We might want to re-fetch coordinates if they were not saved?
    // Current app architecture saves coords in a variable `stationCoords`.
    // We should probably trigger a station update or calculateDistance if needed.
    // Ideally we'd save coordinates too, but recalculating distance mainly needs coords.
    // Let's assume weather fetch might re-occur if user edits, but for now we just load values.

    // BUT calculateDistance relies on `stationCoords` which might be null if page reloaded.
    // We should probably force a weather/info update if we want coordinates back.
    // Converting simple load to a full restore is tricky.
    // Pragmantic approach: Just call weatherService to get info (silent update) or let user know.
    // For now, let's just run calculateAll and warn if distance is 0.

    // Actually, let's just re-trigger station update handles "blur" logic to ensure consistency.
    // But that is async.
    // Let's rely on stored values as much as possible.

    calculateAll();

    // Close modal
    document.getElementById('summary-modal').classList.add('hidden');

    showToast(`Loaded leg: ${s.depStation} -> ${s.arrStation} `, "success");

    // Attempt to restore coordinates via background fetch if missing
    if (!stationCoords.dep || !stationCoords.arr) {
        if (s.depStation) handleStationUpdate('dep');
        if (s.arrStation) handleStationUpdate('arr');
    }
}

function copySummaryToClipboard() {
    const content = document.getElementById('summary-content');
    if (!content) return;

    const text = content.innerText;
    navigator.clipboard.writeText(text).then(() => {
        showToast("Summary copied to clipboard!", "success");
    });
}

function clearLegs() {
    if (confirm("Clear all stored flight legs?")) {
        flightLegs = [];
        saveFlightLegs();
        showToast("Flight legs cleared.", "info");

        // Re-render summary if open
        const modal = document.getElementById('summary-modal');
        if (!modal.classList.contains('hidden')) {
            showSummary();
        }
    }
}

function saveFlightLegs() {
    localStorage.setItem('avTrainerLegs', JSON.stringify(flightLegs));
}

function loadFlightLegs() {
    const saved = localStorage.getItem('avTrainerLegs');
    if (saved) {
        flightLegs = JSON.parse(saved);
        console.log(`Loaded ${flightLegs.length} legs from storage`);
    }
}

/**
 * Utility to update UI output fields (grey cells)
 */
function updateOutput(id, val) {
    const el = document.getElementById(id);
    if (el) {
        // Value is an input if it's the flight calculator
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
            el.value = val;
        } else {
            el.textContent = val;
        }
    }
}
