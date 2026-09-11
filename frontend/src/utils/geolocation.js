/**
 * Robust Geolocation Service with GPS & IP Fallback
 */

export async function detectCoordinatesAndAddress() {
    // 1. Try Browser GPS first
    if ('geolocation' in navigator) {
        try {
            const gpsResult = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        resolve({
                            lat: parseFloat(pos.coords.latitude.toFixed(4)),
                            lng: parseFloat(pos.coords.longitude.toFixed(4)),
                            accuracy: pos.coords.accuracy,
                        });
                    },
                    (err) => reject(err),
                    {
                        enableHighAccuracy: false, // Prevents timeouts on desktop/Wi-Fi
                        timeout: 7000,
                        maximumAge: 300000 // 5 minutes cache
                    }
                );
            });

            if (gpsResult && gpsResult.lat && gpsResult.lng) {
                // Reverse geocode coordinates to human-readable address
                const addr = await reverseGeocode(gpsResult.lat, gpsResult.lng);
                return {
                    lat: gpsResult.lat,
                    lng: gpsResult.lng,
                    name: addr.name || 'My Current Location',
                    city: addr.city || 'Nearby',
                    streetAddress: addr.streetAddress || 'Current Location',
                    state: addr.state || '',
                    zipCode: addr.zipCode || '',
                    country: addr.country || 'India',
                    source: 'gps'
                };
            }
        } catch (gpsError) {
            console.warn('Browser GPS detection failed or timed out, falling back to IP geolocation:', gpsError.message || gpsError);
        }
    }

    // 2. Fallback to IP-based Geolocation (works universally on Desktops / Laptops without GPS)
    try {
        const ipRes = await fetch('https://ipapi.co/json/', { timeout: 5000 });
        if (ipRes.ok) {
            const data = await ipRes.json();
            if (data && data.latitude && data.longitude) {
                const cityName = data.city || data.region || 'Current Area';
                const region = data.region || data.country_name || '';
                return {
                    lat: parseFloat(parseFloat(data.latitude).toFixed(4)),
                    lng: parseFloat(parseFloat(data.longitude).toFixed(4)),
                    name: region ? `${cityName}, ${region}` : cityName,
                    city: cityName,
                    streetAddress: `${cityName}, ${region || 'India'}`,
                    state: data.region || '',
                    zipCode: data.postal || '',
                    country: data.country_name || 'India',
                    source: 'ip'
                };
            }
        }
    } catch (ipErr) {
        console.warn('Primary IP geolocation failed, attempting secondary IP service:', ipErr);
    }

    // 3. Secondary IP Geolocation Fallback
    try {
        const ipRes2 = await fetch('https://ipwho.is/', { timeout: 5000 });
        if (ipRes2.ok) {
            const data = await ipRes2.json();
            if (data && data.success !== false && data.latitude && data.longitude) {
                const cityName = data.city || data.region || 'Current Area';
                return {
                    lat: parseFloat(parseFloat(data.latitude).toFixed(4)),
                    lng: parseFloat(parseFloat(data.longitude).toFixed(4)),
                    name: `${cityName}, ${data.country || 'India'}`,
                    city: cityName,
                    source: 'ip'
                };
            }
        }
    } catch (err2) {
        console.error('All geolocation lookups failed:', err2);
    }

    throw new Error('Could not automatically determine location. Please select your city from the list.');
}

/**
 * Reverse geocoding helper with fast fallback
 */
async function reverseGeocode(lat, lng) {
    try {
        // BigDataCloud client-side reverse geocode API (Fast, CORS open, no API key required)
        const bdcRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        if (bdcRes.ok) {
            const data = await bdcRes.json();
            const city = data.city || data.locality || data.principalSubdivision || 'Nearby';
            const suburb = data.locality || data.neighbourhood || '';
            const state = data.principalSubdivision || '';
            const zipCode = data.postcode || '';
            const country = data.countryName || 'India';
            const streetAddress = [suburb, city].filter(Boolean).join(', ') || city;
            const fullName = [suburb, city, state, zipCode].filter(Boolean).join(', ');
            return {
                city,
                state,
                zipCode,
                country,
                streetAddress: streetAddress || 'Current Location',
                name: fullName || city
            };
        }
    } catch {
        // Fallback to OpenStreetMap Nominatim
    }

    try {
        const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
        );
        if (nomRes.ok) {
            const data = await nomRes.json();
            if (data && data.address) {
                const addr = data.address;
                const city = addr.city || addr.town || addr.village || addr.state_district || addr.state || 'Nearby';
                const road = addr.road || addr.suburb || addr.neighbourhood || '';
                const houseNumber = addr.house_number || '';
                const state = addr.state || '';
                const zipCode = addr.postcode || '';
                const country = addr.country || 'India';
                const streetAddress = [houseNumber, road, addr.suburb || addr.neighbourhood].filter(Boolean).join(' ') || road || city;
                const fullName = data.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : city;
                return {
                    city,
                    state,
                    zipCode,
                    country,
                    streetAddress: streetAddress || 'Current Location',
                    name: fullName || city
                };
            }
        }
    } catch {
        // Fallback
    }

    return {
        city: 'Nearby',
        state: '',
        zipCode: '',
        country: 'India',
        streetAddress: `Location (${lat}, ${lng})`,
        name: `Location (${lat}, ${lng})`
    };
}

