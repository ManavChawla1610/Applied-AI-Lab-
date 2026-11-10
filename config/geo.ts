/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

export const GEOCODE_DEBOUNCE_MS = 1000;
export const MIN_QUERY_LENGTH = 4;

export const NOMINATIM_USER_AGENT = 'DC-Airbnb-Estimator student project (educational preview)';
