/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Map tiles: the standard OpenStreetMap map. Free and needs no API key.
 * OSM's tile servers are run by volunteers for light use; if traffic grows a lot,
 * move to a paid provider by changing these two values.
 * The softer, cleaner look comes from the CSS filter on .dc-map tiles in src/index.css.
 */
export const MAP_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
