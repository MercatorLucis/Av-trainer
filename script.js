/* Aircraft Performance Calculator Logic */

// Performance data now loaded from aircraft-data.js system

// --- Aircraft Management State ---
let aircraftLibrary = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.log("App initialized");
    try {
        // Initialize POH extractor
        if (window.pohDataExtractor) {
            await pohDataExtractor.init();
        }

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
    
    // Add test aircraft if library is empty
    if (aircraftLibrary.length === 0) {
        aircraftLibrary.push({
            registration: 'C-TEST',
            model: 'C150N',
            emptyWeight: 1116.22,
            emptyArm: 33.07
        });
        
        aircraftLibrary.push({
            registration: 'C-GACW',
            model: 'C150N',
            emptyWeight: 1095.5,
            emptyArm: 33.1
        });
        
        saveAircraftLibrary();
        console.log('Added test aircraft to library');
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
            alert("Please fill in all fields correctly.");
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

        calculateWind('dep');
        calculateWind('arr');
        calculateWind('cruise');

        calculateFuel();
        calculateWB();

        calculatePerformance();
        calculateSpeed();
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
    // Get current aircraft model
    const currentModel = getCurrentAircraftModel();

    let gph = parseFloat(document.getElementById('fuel-gph')?.value) || 0;
    const fuelOnBoard = parseFloat(document.getElementById('fuel-onboard')?.value) || 0;

    // Get fuel data from aircraft data system
    let taxiStart = 0.8;
    let climb = 0.7;
    let reserve = 2.05;

    if (currentModel) {
        const fuelData = aircraftDataSystem.getFuelData(currentModel);
        if (fuelData) {
            gph = fuelData.gph;
            taxiStart = fuelData.taxiStart;
            climb = fuelData.climb;
            reserve = fuelData.reserve;

            // Update GPH input to match aircraft data
            const gphInput = document.getElementById('fuel-gph');
            if (gphInput) gphInput.value = gph;
        }
    }

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
    // Get current aircraft model
    const currentModel = getCurrentAircraftModel();

    // Get Weights
    const emptyW = parseFloat(document.getElementById('wb-empty-w')?.value) || 0;
    const frontW = parseFloat(document.getElementById('wb-front-w')?.value) || 0;
    const backW = parseFloat(document.getElementById('wb-back-w')?.value) || 0;
    const bagW = parseFloat(document.getElementById('wb-bag-w')?.value) || 0;
    const fuelOnBoard = parseFloat(document.getElementById('fuel-onboard')?.value) || 0;

    // Get arms from aircraft data system
    let emptyA = parseFloat(document.getElementById('wb-empty-a')?.value) || 0;
    let frontA = 39;
    let backA = 64;
    let bagA = 64;
    let fuelA = 42.2;

    if (currentModel) {
        const wbData = aircraftDataSystem.getWeightBalanceData(currentModel);
        if (wbData && wbData.arms) {
            frontA = wbData.arms.front;
            backA = wbData.arms.back;
            bagA = wbData.arms.baggage;
            fuelA = wbData.arms.fuel;

            // Update arm inputs to match aircraft data
            const frontAInput = document.getElementById('wb-front-a');
            const backAInput = document.getElementById('wb-back-a');
            const bagAInput = document.getElementById('wb-bag-a');
            const fuelAInput = document.getElementById('wb-fuel-a');

            if (frontAInput) frontAInput.value = frontA;
            if (backAInput) backAInput.value = backA;
            if (bagAInput) bagAInput.value = bagA;
            if (fuelAInput) fuelAInput.value = fuelA;
        }
    }

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

    updateOutput('perf-to-roll', takeoff ? Math.round(takeoff.roll) : "N/A");
    updateOutput('perf-to-50', takeoff ? Math.round(takeoff.clear50) : "N/A");

    updateOutput('perf-ldg-roll', landing ? Math.round(landing.roll) : "N/A");
    updateOutput('perf-ldg-50', landing ? Math.round(landing.clear50) : "N/A");
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

    // Fallback to default model (C150N)
    console.log('Using default model: C150N');
    return 'C150N';
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

// Helper
function updateOutput(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}
