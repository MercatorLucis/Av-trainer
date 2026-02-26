const weatherService = {
    // NOAA Aviation Weather Center APIs (Free, Public)
    apiBase: 'https://aviationweather.gov/api/data',
    // CORS proxy for browser compatibility (switch to your own proxy for production)
    corsProxy: 'https://av-cors-proxy.liu-qianheng-ai.workers.dev/',

    get metarUrl() { return `${this.apiBase}/metar`; },
    get tafUrl() { return `${this.apiBase}/taf`; },
    get stationUrl() { return `${this.apiBase}/airport`; },

    // Helper to wrap URLs with CORS proxy
    proxyUrl(url) {
        return this.corsProxy + encodeURIComponent(url);
    },

    // Station Database (Local fallback for static data like Elevation/Runways)
    stationDB: {
        'CYUL': { elevation: 118, runways: ['06L', '06R', '24L', '24R', '10', '28'], name: 'Montreal/Trudeau', lat: 45.4705, lon: -73.7408 },
        'CYYZ': { elevation: 569, runways: ['05', '23', '06L', '06R', '24L', '24R', '15L', '15R', '33L', '33R'], name: 'Toronto/Pearson', lat: 43.6772, lon: -79.6306 },
        'CYVR': { elevation: 14, runways: ['08L', '08R', '26L', '26R', '13', '31'], name: 'Vancouver', lat: 49.1947, lon: -123.1841 },
        'CYOW': { elevation: 374, runways: ['07', '25', '14', '32'], name: 'Ottawa', lat: 45.3225, lon: -75.6672 },
        'CYQB': { elevation: 244, runways: ['06', '24', '11', '29'], name: 'Quebec City', lat: 46.7911, lon: -71.3933 },
        'CYHU': { elevation: 90, runways: ['06L', '06R', '24L', '24R', '10', '28'], name: 'St-Hubert', lat: 45.5175, lon: -73.4169 },
        'CYMX': { elevation: 270, runways: ['06', '24', '11', '29'], name: 'Mirabel', lat: 45.6797, lon: -74.0053 },
        'KZLA': { elevation: 128, runways: ['06', '07L', '07R', '24', '25L', '25R'], name: 'Los Angeles', lat: 33.9425, lon: -118.4081 },
        'KJFK': { elevation: 13, runways: ['04L', '04R', '22L', '22R', '13L', '13R', '31L', '31R'], name: 'JFK', lat: 40.6413, lon: -73.7781 },
    },

    async getStationInfo(stationId) {
        if (!stationId) return null;
        try {
            const url = `${this.stationUrl}?ids=${stationId}&format=json`;
            console.log(`Fetching station info from: ${url}`);
            const response = await fetch(this.proxyUrl(url));
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    const stn = data[0];
                    const local = this.stationDB[stationId] || {};
                    const elevM = stn.elev;
                    const elevFt = elevM !== undefined ? Math.round(elevM * 3.28084) : (local.elevation || 0);

                    let apiRunways = [];
                    if (stn.runways && Array.isArray(stn.runways)) {
                        stn.runways.forEach(r => {
                            if (r.id) {
                                // Extract length from dimension "11000x200"
                                let length = null;
                                if (r.dimension) {
                                    const match = r.dimension.match(/^(\d+)/);
                                    if (match) length = parseInt(match[1]);
                                }

                                const parts = r.id.split('/');
                                parts.forEach(p => {
                                    apiRunways.push({ id: p, length: length });
                                });
                            }
                        });
                    }

                    return {
                        elevationFeet: elevFt,
                        name: stn.name || local.name || stationId,
                        runways: apiRunways.length > 0 ? apiRunways : (local.runways || []),
                        lat: stn.lat || local.lat || null,
                        lon: stn.lon || local.lon || null
                    };
                }
            }
        } catch (e) {
            console.warn("Station fetch failed, using fallback", e);
        }
        const local = this.stationDB[stationId];
        if (local) {
            return {
                elevationFeet: local.elevation,
                runways: local.runways,
                name: local.name,
                lat: local.lat || null,
                lon: local.lon || null
            };
        }
        return { elevationFeet: null, runways: [], name: stationId, lat: null, lon: null };
    },

    async getWeather(stationId, type = 'metar', time = null) {
        if (!stationId) return null;
        try {
            let url = (type === 'taf') ?
                `${this.tafUrl}?ids=${stationId}&format=json` :
                `${this.metarUrl}?ids=${stationId}&format=json`;

            console.log(`Fetching weather from: ${url}`);
            const response = await fetch(this.proxyUrl(url));
            if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);

            const data = await response.json();
            if (!data) return null;
            if (Array.isArray(data)) return data.length > 0 ? data[0] : null;
            return data;
        } catch (error) {
            console.error("Weather fetch failed:", error);
            return null;
        }
    },

    parseMetar(data) {
        if (!data) return null;
        const flightRules = data.fltCat || data.fltcat || 'UNK';
        let altInHg = null;
        if (data.altim !== undefined && data.altim !== null) {
            altInHg = (data.altim > 800) ? (data.altim * 0.02953) : data.altim;
        }
        return {
            type: 'METAR',
            raw: data.rawOb || "",
            temp: (data.temp !== undefined && data.temp !== null) ? parseFloat(data.temp) : null,
            dewpoint: (data.dewp !== undefined && data.dewp !== null) ? parseFloat(data.dewp) : null,
            windDir: (data.wdir === 'VRB' || data.wdir === undefined || data.wdir === null) ? 0 : parseFloat(data.wdir),
            windSpd: (data.wspd !== undefined && data.wspd !== null) ? parseFloat(data.wspd) : 0,
            altimeterInHg: altInHg,
            visibility: data.visib !== undefined ? data.visib : null,
            flightRules: flightRules,
            elevation: data.elev !== undefined ? data.elev : null
        };
    },

    parseTaf(data, targetTime) {
        if (!data || !data.fcsts) return null;
        const timestamp = targetTime.getTime();
        let validForecast = null;
        for (let fcst of data.fcsts) {
            const tFrom = new Date(fcst.timeFrom * 1000).getTime();
            const tTo = new Date(fcst.timeTo * 1000).getTime();
            if (timestamp >= tFrom && timestamp < tTo) {
                validForecast = fcst;
                break;
            }
        }
        if (!validForecast && data.fcsts.length > 0) validForecast = data.fcsts[0];
        if (!validForecast) return null;
        return {
            type: 'TAF',
            raw: data.rawTAF || "",
            temp: null,
            windDir: (validForecast.wdir === 'VRB' || validForecast.wdir === undefined || validForecast.wdir === null) ? 0 : parseFloat(validForecast.wdir),
            windSpd: (validForecast.wspd !== undefined && validForecast.wspd !== null) ? parseFloat(validForecast.wspd) : 0,
            visibility: validForecast.visib !== undefined ? validForecast.visib : null,
            clouds: validForecast.clouds || []
        };
    },

    determineRunway(windDir, runways) {
        if (windDir === undefined || windDir === null || !runways || runways.length === 0) return null;
        let bestRwy = null;
        let maxHeadwind = -Infinity;

        // Convert runways to flat list of objects {id, length} if needed
        let rwyList = [];
        runways.forEach(r => {
            if (typeof r === 'string') {
                rwyList.push({ id: r, length: null });
            } else {
                rwyList.push(r);
            }
        });

        rwyList.forEach(rwyObj => {
            const headingStr = rwyObj.id.replace(/[LRC]/g, '');
            const heading = parseInt(headingStr) * 10;
            const angleDiff = (windDir - heading) * (Math.PI / 180);
            const headwind = Math.cos(angleDiff);
            if (headwind > maxHeadwind) {
                maxHeadwind = headwind;
                bestRwy = rwyObj;
            }
        });
        return bestRwy;
    }
};
