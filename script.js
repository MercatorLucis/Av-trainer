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

document.addEventListener('DOMContentLoaded', () => {
    console.log("App initialized");
    try {
        setupEventListeners();
        setupSidebar();
        calculateAll();
    } catch (e) {
        console.error("Critical Error during initialization:", e);
        // Optionally alert user or show error toast
    }
});

function setupSidebar() {
    const menuToggle = document.getElementById('menu-toggle');
    const menuClose = document.getElementById('menu-close');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

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
    inputs.forEach(input => {
        input.addEventListener('input', calculateAll);
    });
}

function calculateAll() {
    try {
        calculateAtmosphere('dep');
        calculateAtmosphere('arr');
        calculateAtmosphere('cruise');

        calculateWind('dep');
        calculateWind('arr');

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
    const rwyInput = document.getElementById(`${prefix}-rwy`);

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
    const rwyHdg = rwy * 10;

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
