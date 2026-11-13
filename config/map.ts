/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Map tile style. CARTO "Voyager": a light, muted basemap similar to the look of
 * Airbnb's host page. Free for non-commercial use; a paid CARTO plan (or another
 * provider such as Google Maps, Stadia or MapTiler) is needed for commercial use.
 * Other CARTO styles: 'light_all' (grey, minimal), 'rastertiles/voyager_labels_under'.
 */
export const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';
