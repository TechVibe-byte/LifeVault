/**
 * Calculates the Haversine distance between two sets of GPS coordinates in meters.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // Distance in meters
}

/**
 * Gets current user coordinates via browser HTML5 Geolocation API.
 */
export function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        let msg = 'Failed to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied by user.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location position unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Checks if user current position is within office geofence bounds.
 */
export async function checkUserAtOfficeLocation(
  officeLat: number,
  officeLng: number,
  radiusMeters: number
): Promise<{ isAtOffice: boolean; distance: number; lat: number; lng: number }> {
  const coords = await getCurrentLocation();
  const distance = calculateDistance(officeLat, officeLng, coords.lat, coords.lng);
  const isAtOffice = distance <= radiusMeters;
  return { isAtOffice, distance, lat: coords.lat, lng: coords.lng };
}
