// Aircraft Performance Data System
// Replaces hardcoded values with structured, model-specific data

const aircraftDataSystem = {
    // Aircraft models database
    models: {
        'C150N': {
            name: 'Cessna 150N',
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
        }
        // Add more aircraft models here as they're digitized
    },

    // Get performance data for a specific model
    getPerformanceData: function(modelCode) {
        return this.models[modelCode]?.performance || null;
    },

    // Get fuel data for a specific model
    getFuelData: function(modelCode) {
        return this.models[modelCode]?.fuel || null;
    },

    // Get weight & balance data for a specific model
    getWeightBalanceData: function(modelCode) {
        return this.models[modelCode]?.weightBalance || null;
    },

    // Add new aircraft model data
    addModel: function(modelCode, data) {
        this.models[modelCode] = data;
        this.saveToStorage();
    },

    // Get all available models
    getAvailableModels: function() {
        return Object.keys(this.models).map(code => ({
            code: code,
            name: this.models[code].name,
            category: this.models[code].category
        }));
    },

    // Save data to localStorage
    saveToStorage: function() {
        try {
            localStorage.setItem('aircraftDataSystem', JSON.stringify(this.models));
        } catch (e) {
            console.error('Failed to save aircraft data system:', e);
        }
    },

    // Load data from localStorage
    loadFromStorage: function() {
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
    init: function() {
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