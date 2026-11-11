/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Primary geocoder: Photon (OpenStreetMap data, built for search-as-you-type, no API key)
export const PHOTON_BASE_URL = 'https://photon.komoot.io/api/';

// Fallback geocoder: Nominatim (OpenStreetMap, full-address lookup)
export const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

// DC Bounding Box
// Nominatim viewbox order: left,top,right,bottom (minLon, maxLat, maxLon, minLat)
export const DC_VIEWBOX = '-77.12,39.00,-76.90,38.79';
// Photon bbox order: minLon,minLat,maxLon,maxLat
export const DC_PHOTON_BBOX = '-77.12,38.79,-76.90,39.00';

export const DC_BOUNDS = {
  minLat: 38.79,
  maxLat: 39.00,
  minLng: -77.12,
  maxLng: -76.90,
};

// Center of DC, used to bias Photon results
export const DC_CENTER = { lat: 38.9072, lng: -77.0369 };

export const GEOCODE_DEBOUNCE_MS = 400;
export const MIN_QUERY_LENGTH = 3;

export const GEOCODER_USER_AGENT = 'DC-Airbnb-Estimator student project (educational preview)';
export const NOMINATIM_USER_AGENT = GEOCODER_USER_AGENT;
