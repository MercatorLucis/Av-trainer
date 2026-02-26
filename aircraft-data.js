// Aircraft Performance Data System
// Replaces hardcoded values with structured, model-specific data

const aircraftDataSystem = {
    // Aircraft models database
    models: {
        'GENERIC': {
            name: 'Standard Trainer',
            category: 'Single Engine Land',
            performance: {
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
                        // 7000
                        [[1285, 2510], [1390, 2730], [1505, 2970], [1625, 3240], null],
                        // 8000
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
            },
            fuel: {
                gph: 4.1,
                taxiStart: 0.8,
                climb: 0.7,
                reserve: 2.05
            },
            weightBalance: {
                arms: {
                    empty: 33.07,
                    front: 39,
                    back: 64,
                    fuel: 42.2,
                    baggage: 64
                },
                limits: {
                    maxWeight: 1600,
                    minWeight: 0,
                    cgRange: {
                        forward: 35,
                        aft: 47
                    }
                }
            }
        },
        'C150M': {
            name: 'Cessna 150M',
            category: 'Single Engine Land',
            performance: {
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
            },
            fuel: {
                gph: 4.1,
                taxiStart: 0.8,
                climb: 0.7,
                reserve: 2.05
            },
            weightBalance: {
                arms: {
                    empty: 33.07,
                    front: 39,
                    back: 64,
                    fuel: 42.2,
                    baggage: 64
                },
                limits: {
                    maxWeight: 1600,
                    minWeight: 0,
                    cgRange: {
                        forward: 35,
                        aft: 47
                    }
                }
            }
        },
        'C172N': {
            name: 'Cessna 172N',
            category: 'Single Engine Land',
            performance: {
                // Source: Cessna 172N POH, Section 5, Short Field
                // Weight: 2300 lbs  |  Flaps Up (TO) / Flaps 40° (LDG)
                // [ground roll (ft), total to clear 50ft (ft)]
                takeoff: {
                    alts: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000],
                    temps: [0, 10, 20, 30, 40],
                    data: [
                        // SL
                        [[720, 1300], [775, 1390], [835, 1490], [895, 1590], [960, 1700]],
                        // 1000
                        [[790, 1420], [850, 1525], [915, 1630], [980, 1745], [1050, 1865]],
                        // 2000
                        [[865, 1555], [930, 1670], [1000, 1790], [1075, 1915], [1155, 2055]],
                        // 3000
                        [[950, 1710], [1025, 1835], [1100, 1970], [1185, 2115], [1270, 2265]],
                        // 4000
                        [[1045, 1880], [1125, 2025], [1210, 2175], [1300, 2335], [1400, 2510]],
                        // 5000
                        [[1150, 2075], [1240, 2240], [1335, 2410], [1435, 2595], [1540, 2795]],
                        // 6000
                        [[1265, 2305], [1365, 2485], [1475, 2680], [1585, 2895], [1705, 3125]],
                        // 7000
                        [[1400, 2565], [1510, 2770], [1630, 3000], [1755, 3245], [1890, 3515]],
                        // 8000
                        [[1550, 2870], [1675, 3110], [1805, 3375], [1945, 3670], [2095, 3990]]
                    ]
                },
                landing: {
                    // Source: Cessna 172N POH, Section 5, Fig 5-10 Short Field, 2300 lbs
                    // Flaps 40°, Power Off, Maximum Braking
                    alts: [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000],
                    temps: [0, 10, 20, 30, 40],
                    data: [
                        // SL
                        [[495, 1205], [510, 1235], [530, 1265], [545, 1295], [565, 1330]],
                        // 1000
                        [[510, 1235], [530, 1265], [550, 1300], [565, 1330], [585, 1365]],
                        // 2000
                        [[530, 1265], [550, 1300], [570, 1335], [590, 1370], [610, 1405]],
                        // 3000
                        [[550, 1300], [570, 1335], [590, 1370], [610, 1405], [630, 1440]],
                        // 4000
                        [[570, 1335], [590, 1370], [615, 1410], [635, 1445], [655, 1480]],
                        // 5000
                        [[600, 1370], [615, 1415], [635, 1450], [655, 1485], [680, 1525]],
                        // 6000
                        [[615, 1415], [640, 1455], [660, 1490], [685, 1535], [705, 1570]],
                        // 7000
                        [[640, 1455], [660, 1495], [685, 1535], [710, 1575], [730, 1615]],
                        // 8000
                        [[665, 1500], [690, 1540], [710, 1580], [735, 1620], [760, 1665]]
                    ]
                }
            },
            fuel: {
                // 172N: O-320-H2AD (150 hp), typical cruise 8–9 GPH
                gph: 8.5,
                taxiStart: 1.0,
                climb: 1.5,
                reserve: 4.25  // 30 min day VFR at cruise GPH (auto-calculated in UI)
            },
            weightBalance: {
                // Source: Cessna 172N POH, Section 6, Figure 6-3 Loading Arrangements
                arms: {
                    empty: 35.0,   // BEW arm varies per aircraft; typical 172N ~35 in
                    front: 37.0,   // Pilot & front passenger (station 37, range 34–46)
                    back: 73.0,   // Rear passengers
                    fuel: 48.0,   // Wing fuel tanks (standard tanks, station 48)
                    baggage: 95.0    // Baggage area 1 (station 95); area 2 at station 123
                },
                limits: {
                    maxWeight: 2300,
                    minWeight: 0,
                    cgRange: {
                        forward: 35.0,
                        aft: 47.3
                    }
                }
            }
        }
        // Add more aircraft models here as they're digitized
    },

    // Get performance data for a specific model
    getPerformanceData: function (modelCode) {
        return this.models[modelCode]?.performance || null;
    },

    // Get fuel data for a specific model
    getFuelData: function (modelCode) {
        return this.models[modelCode]?.fuel || null;
    },

    // Get weight & balance data for a specific model
    getWeightBalanceData: function (modelCode) {
        return this.models[modelCode]?.weightBalance || null;
    },

    // Add new aircraft model data
    addModel: function (modelCode, data) {
        this.models[modelCode] = data;
        this.saveToStorage();
    },

    // Get all available models
    getAvailableModels: function () {
        return Object.keys(this.models).map(code => ({
            code: code,
            name: this.models[code].name,
            category: this.models[code].category
        }));
    },

    // Save data to localStorage
    saveToStorage: function () {
        try {
            localStorage.setItem('aircraftDataSystem', JSON.stringify(this.models));
        } catch (e) {
            console.error('Failed to save aircraft data system:', e);
        }
    },

    // Load data from localStorage
    loadFromStorage: function () {
        try {
            const saved = localStorage.getItem('aircraftDataSystem');
            if (saved) {
                const data = JSON.parse(saved);
                // Merge with default data (don't overwrite built-in models)
                Object.assign(this.models, data);
            }
        } catch (e) {
            console.error('Failed to load aircraft data system:', e);
        }
    },

    // Initialize the system
    init: function () {
        this.loadFromStorage();
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    aircraftDataSystem.init();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = aircraftDataSystem;
} else {
    window.aircraftDataSystem = aircraftDataSystem;
}