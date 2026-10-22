/**
 * High-Reliability Geolocation Service with Fast GPS & Universal Multi-Tier Fallback
 */

/**
 * Reverse geocoding helper with fast fallback and deduplicated naming
 */
export async function reverseGeocode(lat, lng) {
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
        return {
            city: 'Nearby Area',
            state: '',
            zipCode: '',
            country: 'India',
            streetAddress: 'Current Location',
            name: 'Current Location'
        };
    }

    // 1. Try BigDataCloud Reverse Geocoding (Fast, CORS-friendly client API)
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const bdcRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
            { signal: controller.signal }
        );
        clearTimeout(timeout);
        if (bdcRes.ok) {
            const data = await bdcRes.json();
            const locality = (data.locality || data.neighbourhood || '').trim();
            const city = (data.city || data.principalSubdivision || locality || 'Nearby Area').trim();
            const state = (data.principalSubdivision || '').trim();
            const zipCode = (data.postcode || '').trim();
            const country = (data.countryName || 'India').trim();

            const distinctParts = [];
            if (locality) distinctParts.push(locality);
            if (city && !distinctParts.some(p => p.toLowerCase() === city.toLowerCase())) distinctParts.push(city);
            if (state && !distinctParts.some(p => p.toLowerCase() === state.toLowerCase())) distinctParts.push(state);

            const streetAddress = distinctParts.join(', ') || city;
            const fullName = [streetAddress, zipCode].filter(Boolean).join(' ');

            return {
                city: city || 'Nearby',
                state,
                zipCode,
                country,
                streetAddress: streetAddress || city,
                name: fullName || streetAddress || city
            };
        }
    } catch {
        // Fallback to OpenStreetMap Nominatim
    }

    // 2. OpenStreetMap Nominatim
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);
        const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { signal: controller.signal }
        );
        clearTimeout(timeout);
        if (nomRes.ok) {
            const data = await nomRes.json();
            if (data && data.address) {
                const addr = data.address;
                const road = (addr.road || addr.street || '').trim();
                const suburb = (addr.suburb || addr.neighbourhood || addr.residential || addr.subdivision || '').trim();
                const city = (addr.city || addr.town || addr.village || addr.municipality || addr.state_district || addr.state || 'Nearby').trim();
                const houseNumber = (addr.house_number || '').trim();
                const state = (addr.state || '').trim();
                const zipCode = (addr.postcode || '').trim();
                const country = (addr.country || 'India').trim();

                const parts = [houseNumber, road, suburb, city].filter(Boolean);
                const uniqueParts = parts.filter((item, idx, arr) => !idx || item.toLowerCase() !== arr[idx - 1].toLowerCase());
                const streetAddress = uniqueParts.join(', ') || road || city;
                const fullName = data.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : streetAddress;

                return {
                    city: city || 'Nearby',
                    state,
                    zipCode,
                    country,
                    streetAddress: streetAddress || 'Current Location',
                    name: fullName || streetAddress || city
                };
            }
        }
    } catch {
        // Fallback
    }

    return {
        city: 'Nearby Area',
        state: '',
        zipCode: '',
        country: 'India',
        streetAddress: `Location (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`,
        name: `Location (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`
    };
}

/**
 * High-Reliability Geolocation Service
 *
 * Tier 1: Hardware GPS / Wi-Fi high accuracy (up to 9 seconds to allow permission prompt)
 * Tier 2: Low-accuracy standard browser positioning (for desktops/laptops without GPS chip)
 * Tier 3: IP-based Network Geolocation (ipapi.co / ipwho.is / freeipapi.com)
 * Tier 4: Safe default location
 */
export async function detectCoordinatesAndAddress(options = {}) {
    const forceDevice = options?.forceDevice ?? false;

    // 1. Try Browser Device Geolocation
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        // Check permission if query API is available
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const status = await navigator.permissions.query({ name: 'geolocation' });
                if (status.state === 'denied' && forceDevice) {
                    throw new Error('Location access is blocked by your browser. Please click the lock or site settings icon in your address bar to allow Location, then try again.');
                }
            } catch (pErr) {
                if (pErr.message && pErr.message.includes('Location access is blocked')) {
                    throw pErr;
                }
            }
        }

        let gpsResult = null;
        let permissionDenied = false;

        // Pass 1: High Accuracy (Mobile GPS / Wi-Fi triangulation)
        try {
            gpsResult = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    const err = new Error('GPS timeout');
                    err.code = 3;
                    reject(err);
                }, 9000);

                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        clearTimeout(timer);
                        resolve({
                            lat: parseFloat(pos.coords.latitude.toFixed(6)),
                            lng: parseFloat(pos.coords.longitude.toFixed(6)),
                            accuracy: pos.coords.accuracy,
                        });
                    },
                    (err) => {
                        clearTimeout(timer);
                        reject(err);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 8500,
                        maximumAge: 120000 // 2 minutes cached position acceptable
                    }
                );
            });
        } catch (gpsError) {
            if (gpsError.code === 1) { // PERMISSION_DENIED
                permissionDenied = true;
            } else {
                console.warn('High-accuracy GPS detection failed or timed out, trying standard browser location:', gpsError.message || gpsError);
            }
        }

        // Pass 2: Low-Accuracy / Fast Network Positioning (vital for Windows/Mac desktops without GPS hardware)
        if (!gpsResult && !permissionDenied) {
            try {
                gpsResult = await new Promise((resolve, reject) => {
                    const timer = setTimeout(() => {
                        const err = new Error('Network location timeout');
                        err.code = 3;
                        reject(err);
                    }, 7000);

                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            clearTimeout(timer);
                            resolve({
                                lat: parseFloat(pos.coords.latitude.toFixed(6)),
                                lng: parseFloat(pos.coords.longitude.toFixed(6)),
                                accuracy: pos.coords.accuracy,
                            });
                        },
                        (err) => {
                            clearTimeout(timer);
                            reject(err);
                        },
                        {
                            enableHighAccuracy: false,
                            timeout: 6500,
                            maximumAge: 300000 // 5 minutes
                        }
                    );
                });
            } catch (lowAccError) {
                if (lowAccError.code === 1) permissionDenied = true;
                console.warn('Standard browser location lookup failed:', lowAccError.message || lowAccError);
            }
        }

        if (permissionDenied && forceDevice) {
            throw new Error('Location access is blocked by your browser. Please click the lock or tune icon in your browser address bar to allow Location, then try again.');
        }

        if (gpsResult && gpsResult.lat && gpsResult.lng) {
            const addr = await reverseGeocode(gpsResult.lat, gpsResult.lng);
            return {
                lat: gpsResult.lat,
                lng: gpsResult.lng,
                accuracy: Math.round(gpsResult.accuracy || 0),
                name: addr.name || addr.streetAddress || addr.city || 'My Current Location',
                city: addr.city || 'Nearby',
                streetAddress: addr.streetAddress || addr.name || 'Current Location',
                state: addr.state || '',
                zipCode: addr.zipCode || '',
                country: addr.country || 'India',
                source: 'gps'
            };
        }
    }

    // 2. Primary IP-based Geolocation (ipapi.co)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const ipRes = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (ipRes.ok) {
            const data = await ipRes.json();
            if (data && data.latitude && data.longitude) {
                const cityName = (data.city || data.region || 'Current Area').trim();
                const region = (data.region || data.country_name || '').trim();
                return {
                    lat: parseFloat(parseFloat(data.latitude).toFixed(6)),
                    lng: parseFloat(parseFloat(data.longitude).toFixed(6)),
                    name: region && region !== cityName ? `${cityName}, ${region}` : cityName,
                    city: cityName,
                    streetAddress: `${cityName}, ${region || 'India'}`,
                    state: data.region || '',
                    zipCode: data.postal || '',
                    country: data.country_name || 'India',
                    source: 'ip',
                    isApproximate: true
                };
            }
        }
    } catch (ipErr) {
        console.warn('Primary IP geolocation failed, attempting secondary IP service:', ipErr);
    }

    // 3. Secondary IP Geolocation Fallback (ipwho.is)
    try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 4000);
        const ipRes2 = await fetch('https://ipwho.is/', { signal: controller2.signal });
        clearTimeout(timeoutId2);

        if (ipRes2.ok) {
            const data = await ipRes2.json();
            if (data && data.success !== false && data.latitude && data.longitude) {
                const cityName = (data.city || data.region || 'Current Area').trim();
                return {
                    lat: parseFloat(parseFloat(data.latitude).toFixed(6)),
                    lng: parseFloat(parseFloat(data.longitude).toFixed(6)),
                    name: `${cityName}, ${data.country || 'India'}`,
                    city: cityName,
                    streetAddress: `${cityName}, ${data.country || 'India'}`,
                    state: data.region || '',
                    zipCode: data.postal || '',
                    country: data.country || 'India',
                    source: 'ip',
                    isApproximate: true
                };
            }
        }
    } catch (err2) {
        console.warn('Secondary geolocation lookup failed:', err2);
    }

    // 4. Tertiary IP Geolocation Fallback (freeipapi.com)
    try {
        const controller3 = new AbortController();
        const timeoutId3 = setTimeout(() => controller3.abort(), 4000);
        const ipRes3 = await fetch('https://freeipapi.com/api/json', { signal: controller3.signal });
        clearTimeout(timeoutId3);

        if (ipRes3.ok) {
            const data = await ipRes3.json();
            if (data && data.latitude && data.longitude) {
                const cityName = (data.cityName || data.regionName || 'Current Area').trim();
                return {
                    lat: parseFloat(parseFloat(data.latitude).toFixed(6)),
                    lng: parseFloat(parseFloat(data.longitude).toFixed(6)),
                    name: `${cityName}, ${data.countryName || 'India'}`,
                    city: cityName,
                    streetAddress: `${cityName}, ${data.countryName || 'India'}`,
                    state: data.regionName || '',
                    zipCode: data.zipCode || '',
                    country: data.countryName || 'India',
                    source: 'ip',
                    isApproximate: true
                };
            }
        }
    } catch {
        // Fallback
    }

    // 5. Guaranteed Safe Default (Connaught Place, Delhi) if completely offline/blocked
    return {
        lat: 28.6304,
        lng: 77.2177,
        name: 'Connaught Place, Delhi',
        city: 'Delhi',
        streetAddress: 'Connaught Place, Delhi',
        state: 'Delhi',
        zipCode: '110001',
        country: 'India',
        source: 'default',
        isApproximate: true
    };
}

/**
 * Accurate Haversine Distance in Kilometers
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined ||
        lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
        return null;
    }
    const numLat1 = parseFloat(lat1);
    const numLon1 = parseFloat(lon1);
    const numLat2 = parseFloat(lat2);
    const numLon2 = parseFloat(lon2);
    if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

    const R = 6371; // Earth radius in km
    const dLat = (numLat2 - numLat1) * Math.PI / 180;
    const dLon = (numLon2 - numLon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(numLat1 * Math.PI / 180) * Math.cos(numLat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return dist < 1 ? parseFloat(dist.toFixed(2)) : parseFloat(dist.toFixed(1));
}

const INDIAN_CITIES_COORDS = {
    'delhi': { lat: 28.6139, lng: 77.2090 },
    'new delhi': { lat: 28.6139, lng: 77.2090 },
    'delhi ncr': { lat: 28.6139, lng: 77.2090 },
    'noida': { lat: 28.5355, lng: 77.3910 },
    'gurgaon': { lat: 28.4595, lng: 77.0266 },
    'gurugram': { lat: 28.4595, lng: 77.0266 },
    'ghaziabad': { lat: 28.6692, lng: 77.4538 },
    'faridabad': { lat: 28.4089, lng: 77.3178 },
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'navi mumbai': { lat: 19.0330, lng: 73.0297 },
    'thane': { lat: 19.2183, lng: 72.9781 },
    'bengaluru': { lat: 12.9716, lng: 77.5946 },
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'pune': { lat: 18.5204, lng: 73.8567 },
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'kolkata': { lat: 22.5726, lng: 88.3639 },
    'ahmedabad': { lat: 23.0225, lng: 72.5714 },
    'jaipur': { lat: 26.9124, lng: 75.7873 },
    'lucknow': { lat: 26.8467, lng: 80.9462 },
    'chandigarh': { lat: 30.7333, lng: 76.7794 },
    'kochi': { lat: 9.9312, lng: 76.2673 },
    'cochin': { lat: 9.9312, lng: 76.2673 },
    'indore': { lat: 22.7196, lng: 75.8577 },
    'bhopal': { lat: 23.2599, lng: 77.4126 },
    'bhubaneswar': { lat: 20.2961, lng: 85.8245 },
    'patna': { lat: 25.5941, lng: 85.1376 },
    'guwahati': { lat: 26.1445, lng: 91.7362 },
    'surat': { lat: 21.1702, lng: 72.8311 },
    'dehradun': { lat: 30.3165, lng: 78.0322 },
    'amritsar': { lat: 31.6340, lng: 74.8723 },
    'nagpur': { lat: 21.1458, lng: 79.0882 },
    'varanasi': { lat: 25.3176, lng: 82.9739 },
    'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
    'coimbatore': { lat: 11.0168, lng: 76.9558 },
    'vadodara': { lat: 22.3072, lng: 73.1812 },
    'ludhiana': { lat: 30.9010, lng: 75.8573 },
    'agra': { lat: 27.1767, lng: 78.0081 },
    'nashik': { lat: 19.9975, lng: 73.7898 },
    'ranchi': { lat: 23.3441, lng: 85.3096 },
    'mysuru': { lat: 12.2958, lng: 76.6394 },
    'mysore': { lat: 12.2958, lng: 76.6394 },
    'kanpur': { lat: 26.4499, lng: 80.3319 },
    'thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
    'trivandrum': { lat: 8.5241, lng: 76.9366 }
};

/**
 * Geocode an address query with quick city cache and Nominatim fallback
 */
export async function geocodeAddress(street = '', city = '', state = '') {
    const cleanCity = (city || '').trim().toLowerCase();
    if (cleanCity && INDIAN_CITIES_COORDS[cleanCity]) {
        return INDIAN_CITIES_COORDS[cleanCity];
    }

    const fullQuery = [street, city, state, 'India'].filter(Boolean).join(', ');
    if (!fullQuery.trim()) return null;

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=1`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
        }
    } catch {
        // Fallback if network/CORS fails
    }

    // Try just city if street failed
    if (cleanCity) {
        for (const [key, coords] of Object.entries(INDIAN_CITIES_COORDS)) {
            if (cleanCity.includes(key) || key.includes(cleanCity)) {
                return coords;
            }
        }
    }

    return null;
}

