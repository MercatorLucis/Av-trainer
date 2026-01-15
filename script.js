/* Aircraft Performance Calculator Logic */

// --- DATA TABLES (Moved to top for safety) ---
// Data Tables (1600 lbs) as per provided image
const performanceData = {
    takeoff: {
        alts: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000],
        temps: [0, 10, 20, 30, 40],
        data: [
            // SL
            [[655, 1245], [710, 1335], [765, 1435], [820, 1540], [880, 1650]],
            // 1000
            [[720, 1365], [775, 1465], [835, 1575], [900, 1690], [970, 1815]],
            // 2000
            [[790, 1500], [855, 1615], [920, 1735], [990, 1865], [1065, 2005]],
            // 3000
            [[870, 1650], [935, 1780], [1010, 1915], [1090, 2065], [1170, 2225]],
            // 4000
            [[955, 1820], [1030, 1965], [1115, 2125], [1200, 2290], [1290, 2475]],
            // 5000
            [[1050, 2015], [1140, 2185], [1230, 2360], [1325, 2555], [1430, 2770]],
            // 6000
            [[1160, 2245], [1255, 2435], [1360, 2640], [1465, 2870], [1580, 3120]],
            // 7000 (Note: 40C is null)
            [[1285, 2510], [1390, 2730], [1505, 2970], [1625, 3240], null],
            // 8000 (Note: 30C, 40C are null)
            [[1420, 2820], [1540, 3080], [1670, 3370], null, null]
        ]
    },
    landing: {
        alts: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000],
        temps: [0, 10, 20, 30, 40],
        data: [
            // SL
            [[425, 1045], [440, 1065], [455, 1090], [470, 1110], [485, 1135]],
            // 1000
            [[440, 1065], [455, 1090], [470, 1110], [485, 1135], [505, 1165]],
            // 2000
            [[455, 1090], [470, 1115], [490, 1140], [505, 1165], [520, 1185]],
            // 3000
            [[470, 1115], [490, 1140], [505, 1165], [525, 1195], [540, 1215]],
            // 4000
            [[490, 1140], [505, 1165], [525, 1195], [545, 1225], [560, 1245]],
            // 5000
            [[510, 1170], [525, 1195], [545, 1225], [565, 1255], [585, 1285]],
            // 6000
            [[530, 1200], [545, 1225], [565, 1255], [585, 1285], [605, 1315]],
            // 7000
            [[550, 1230], [570, 1260], [590, 1290], [610, 1320], [630, 1350]],
            // 8000
            [[570, 1260], [590, 1290], [610, 1320], [630, 1350], [655, 1385]]
        ]
    }
};

// --- Aircraft Management State ---
let aircraftLibrary = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log("App initialized");
    try {
        setupEventListeners();
        setupSidebar();

        // Initialize Aircraft Manager
        loadAircraftLibrary();
        setupAircraftUI();

        if (document.querySelector('.dashboard-grid')) {
            calculateAll();
        }
    } catch (e) {
        console.error("Critical Error during initialization:", e);
    }
});

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
        const weightInput = document.getElementById('new-ac-weight');
        const armInput = document.getElementById('new-ac-arm');

        editIndexInput.value = index;

        if (isEdit && index >= 0) {
            const ac = aircraftLibrary[index];
            if (modalTitle) modalTitle.textContent = "Edit Aircraft";
            regInput.value = ac.registration;
            weightInput.value = ac.emptyWeight;
            armInput.value = ac.emptyArm;
        } else {
            if (modalTitle) modalTitle.textContent = "Add New Aircraft";
            regInput.value = "";
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
        const weightInput = document.getElementById('new-ac-weight');
        const armInput = document.getElementById('new-ac-arm');

        const reg = regInput?.value.trim().toUpperCase();
        const weight = parseFloat(weightInput?.value);
        const arm = parseFloat(armInput?.value);
        const index = parseInt(editIndexInput.value);

        if (!reg || isNaN(weight) || isNaN(arm)) {
            alert("Please fill in all fields correctly.");
            return;
        }

        const newAircraft = { registration: reg, emptyWeight: weight, emptyArm: arm };

        if (index >= 0) {
            // Update
            aircraftLibrary[index] = newAircraft;
        } else {
            // Create
            aircraftLibrary.push(newAircraft);
        }

        saveAircraftLibrary();
        showListView();

        // Optional: If we just edited the currently loaded aircraft, refresh inputs?
        // We'll skip for now to keep logic simple unless requested.
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
            <span class="ac-info">${ac.registration}</span>
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
        item.textContent = `${ac.registration}`;
        item.addEventListener('click', () => {
            selectAircraft(ac);
            document.getElementById('aircraft-dropdown').classList.add('hidden');
        });
        listContainer.appendChild(item);
    });
}

function selectAircraft(ac) {
    // Populate fields
    const regInput = document.getElementById('registration');
    const weightInput = document.getElementById('wb-empty-w');
    const armInput = document.getElementById('wb-empty-a');

    if (regInput) regInput.value = ac.registration;
    if (weightInput) weightInput.value = ac.emptyWeight;
    if (armInput) armInput.value = ac.emptyArm;

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
        // Target only user inputs (yellow)
        const userInputs = document.querySelectorAll('input.input-yellow');
        userInputs.forEach(input => {
            input.value = "";
        });
        calculateAll();
    });
}

function calculateAll() {
    try {
        calculateAtmosphere('dep');
        calculateAtmosphere('arr');
        calculateAtmosphere('cruise');

        calculateWind('dep');
        calculateWind('arr');
        calculateWind('cruise');

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
    const gph = parseFloat(document.getElementById('fuel-gph')?.value) || 0;
    const fuelOnBoard = parseFloat(document.getElementById('fuel-onboard')?.value) || 0;

    // Fixed values for now based on screenshot
    const taxiStart = 0.8;
    const climb = 0.7;
    const reserve = 2.05;

    const cruiseTime = 0; // Hours
    const cruiseFuel = cruiseTime * gph;

    const reqFuel = taxiStart + climb + cruiseFuel + reserve;
    const remain = fuelOnBoard - reqFuel;

    updateOutput('fuel-cruise', cruiseFuel.toFixed(1));
    updateOutput('fuel-required', reqFuel.toFixed(2));
    updateOutput('fuel-remaining', remain.toFixed(2));
}

/**
 * Weight and Balance
 */
function calculateWB() {
    // Get Weights
    const emptyW = parseFloat(document.getElementById('wb-empty-w')?.value) || 0;
    const frontW = parseFloat(document.getElementById('wb-front-w')?.value) || 0;
    const backW = parseFloat(document.getElementById('wb-back-w')?.value) || 0;
    const bagW = parseFloat(document.getElementById('wb-bag-w')?.value) || 0;
    const fuelOnBoard = parseFloat(document.getElementById('fuel-onboard')?.value) || 0;

    // Arms from screenshot/defaults
    const emptyA = parseFloat(document.getElementById('wb-empty-a')?.value) || 0;
    const frontA = 39;
    const backA = 64;
    const bagA = 64;
    const fuelA = 42.2;

    // Fuel Weight (6 lbs/gal)
    const fuelW = fuelOnBoard * 6;
    updateOutput('wb-fuel-w', fuelW.toFixed(1));

    // Moments
    const emptyM = emptyW * emptyA;
    const frontM = frontW * frontA;
    const backM = backW * backA;
    const bagM = bagW * bagA;
    const fuelM = fuelW * fuelA;

    updateOutput('wb-empty-m', emptyM.toFixed(0));
    updateOutput('wb-front-m', frontM.toFixed(0));
    updateOutput('wb-back-m', backM.toFixed(0));
    updateOutput('wb-bag-m', bagM.toFixed(0));
    updateOutput('wb-fuel-m', fuelM.toFixed(0));

    // Totals
    const totalW = emptyW + frontW + backW + bagW + fuelW;
    const totalM = emptyM + frontM + backM + bagM + fuelM;
    const cg = totalW > 0 ? totalM / totalW : 0;

    updateOutput('wb-total-w', totalW.toFixed(1));
    updateOutput('wb-total-m', totalM.toFixed(0));
    updateOutput('wb-cg', cg.toFixed(2));
}

/**
 * Performance (Takeoff & Landing) using Bilinear Interpolation
 */
function calculatePerformance() {
    // Current conditions at Departure and Arrival
    const depPAlt = parseFloat(document.getElementById('dep-palt')?.value) || 0;
    const depTemp = parseFloat(document.getElementById('dep-oat')?.value) || 0;

    const arrPAlt = parseFloat(document.getElementById('arr-palt')?.value) || 0;
    const arrTemp = parseFloat(document.getElementById('arr-oat')?.value) || 0;

    const takeoff = getInterpolatedPerformance(performanceData.takeoff, depPAlt, depTemp);
    const landing = getInterpolatedPerformance(performanceData.landing, arrPAlt, arrTemp);

    updateOutput('perf-to-roll', takeoff ? Math.round(takeoff.roll) : "N/A");
    updateOutput('perf-to-50', takeoff ? Math.round(takeoff.clear50) : "N/A");

    updateOutput('perf-ldg-roll', landing ? Math.round(landing.roll) : "N/A");
    updateOutput('perf-ldg-50', landing ? Math.round(landing.clear50) : "N/A");
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

// Helper
function updateOutput(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}
