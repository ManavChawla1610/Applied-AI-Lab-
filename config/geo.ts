/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const PHOTON_BASE_URL = 'https://photon.komoot.io/api/';
export const PHOTON_BBOX = '-77.12,38.79,-76.90,39.00';
export const PHOTON_LAT = 38.9072;
export const PHOTON_LON = -77.0369;
export const PHOTON_USER_AGENT = 'DC-Airbnb-Estimator/1.0 (educational short-term rental analytics)';

export const GEOCODE_DEBOUNCE_MS = 400;
export const MIN_QUERY_LENGTH = 3;

export const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

// DC Bounding Box: left,top,right,bottom (minLon, maxLat, maxLon, minLat)
// viewbox=-77.12,39.00,-76.90,38.79
export const DC_VIEWBOX = '-77.12,39.00,-76.90,38.79';

export const DC_BOUNDS = {
  minLat: 38.79,
  maxLat: 39.00,
  minLng: -77.12,
  maxLng: -76.90,
};

export const NOMINATIM_USER_AGENT = 'DC-Airbnb-Estimator student project (educational preview)';
