/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NominatimAddress {
  house_number?: string;
  road?: string;
  street?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  quarter?: string;
  city?: string;
  state?: string;
  country_code?: string;
  [key: string]: string | undefined;
}

export interface NominatimRawItem {
  place_id?: number | string;
  osm_id?: number | string;
  lat: string | number;
  lon: string | number;
  display_name: string;
  address?: NominatimAddress;
}

export interface ValidatedSuggestion {
  id: string;
  displayName: string;
  shortLabel: string;
  fullLabel: string;
  neighborhood: string;
  lat: number;
  lng: number;
  hasHouseNumber: boolean;
  addressKey: string;
}

export interface DcValidationResult {
  isValid: boolean;
  reason: string;
}

/**
 * Calculates distance between two coordinates in meters using the Haversine formula.
 */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validates whether an address is within Washington, DC based on address attributes.
 * Accept a result only if addressdetails=1 returns address.state === "District of Columbia"
 * OR address.city === "Washington" with address.country_code === "us" and no state other than DC.
 */
export function validateDcAddress(address?: NominatimAddress): DcValidationResult {
  if (!address) {
    return { isValid: false, reason: 'Missing address details' };
  }

  const country = (address.country_code || '').toLowerCase().trim();
  if (country && country !== 'us') {
    return { isValid: false, reason: `Country is '${country}', not 'us'` };
  }

  const state = (address.state || '').trim();
  const city = (address.city || '').trim();

  // Explicit state check
  if (state === 'District of Columbia') {
    return { isValid: true, reason: 'State is District of Columbia' };
  }

  // If another US state is specified (e.g. Virginia, Maryland), strictly reject
  if (state && state !== 'District of Columbia') {
    return { isValid: false, reason: `State is '${state}', not DC` };
  }

  // If city is Washington, country is us, and state is not other than DC
  if (city.toLowerCase() === 'washington' && (!country || country === 'us')) {
    return { isValid: true, reason: 'City is Washington with US country code' };
  }

  return { isValid: false, reason: `Not in DC (state='${state}', city='${city}')` };
}

/**
 * Derives standard formatted short label and full suggestion label:
 * Suggestion label: "[house_number] [road], [neighbourhood or suburb], Washington, DC"
 */
export function formatSuggestionLabels(address?: NominatimAddress, displayName: string = ''): {
  shortLabel: string;
  fullLabel: string;
  neighborhood: string;
  addressKey: string;
  hasHouseNumber: boolean;
} {
  const houseNumber = (address?.house_number || '').trim();
  const road = (address?.road || address?.street || address?.pedestrian || '').trim();
  const neighborhood = (
    address?.neighbourhood ||
    address?.suburb ||
    address?.city_district ||
    address?.quarter ||
    ''
  ).trim();

  const hasHouseNumber = Boolean(houseNumber);
  const streetPart = houseNumber && road ? `${houseNumber} ${road}` : road || (displayName.split(',')[0] || '').trim();
  const shortLabel = streetPart;

  let fullLabel = '';
  if (streetPart) {
    if (neighborhood) {
      fullLabel = `${streetPart}, ${neighborhood}, Washington, DC`;
    } else {
      fullLabel = `${streetPart}, Washington, DC`;
    }
  } else if (neighborhood) {
    fullLabel = `${neighborhood}, Washington, DC`;
  } else {
    fullLabel = displayName;
  }

  // Key for merging identical street addresses (case-insensitive)
  const addressKey = `${houseNumber.toLowerCase()} ${road.toLowerCase()}`.trim();

  return {
    shortLabel,
    fullLabel,
    neighborhood: neighborhood || 'Washington, DC',
    addressKey,
    hasHouseNumber,
  };
}

export const formatShortLabel = formatSuggestionLabels;

export interface ProcessedSuggestions extends Array<ValidatedSuggestion> {
  outsideDc?: boolean;
}

/**
 * Filters, validates, logs, and deduplicates raw Nominatim geocode results.
 * Merges results sharing the same normalized street address (house number + road)
 * OR within 50 meters of each other, keeping the most specific (has house_number).
 * Max 5 unique suggestions returned.
 */
export function processGeocodeResults(rawItems: NominatimRawItem[]): ProcessedSuggestions {
  const validCandidates: ValidatedSuggestion[] = [];
  let hadExplicitOutsideDc = false;

  for (const item of rawItems) {
    const lat = typeof item.lat === 'number' ? item.lat : parseFloat(String(item.lat));
    const lon = typeof item.lon === 'number' ? item.lon : parseFloat(String(item.lon));

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error(`Invalid coordinates received: lat='${item.lat}', lon='${item.lon}'`);
    }

    const valResult = validateDcAddress(item.address);

    // Dev console logging: parsed lat/lon, state, and pass/fail reason
    console.log(
      `[Geocode Result] lat: ${lat}, lon: ${lon}, state: '${item.address?.state || ''}', valid: ${valResult.isValid}, reason: '${valResult.reason}'`
    );

    if (!valResult.isValid) {
      if (item.address?.state && item.address.state !== 'District of Columbia') {
        hadExplicitOutsideDc = true;
      }
      continue;
    }

    const { shortLabel, fullLabel, neighborhood, addressKey, hasHouseNumber } = formatSuggestionLabels(
      item.address,
      item.display_name
    );

    validCandidates.push({
      id: String(item.place_id || item.osm_id || `${lat}-${lon}`),
      displayName: fullLabel,
      shortLabel,
      fullLabel,
      neighborhood,
      lat,
      lng: lon,
      hasHouseNumber,
      addressKey,
    });
  }

  // Deduplication: merge items sharing addressKey (if non-empty) OR within 50 meters
  const uniqueList: ValidatedSuggestion[] = [];

  for (const candidate of validCandidates) {
    let existingIndex = -1;

    for (let i = 0; i < uniqueList.length; i++) {
      const existing = uniqueList[i];

      const sameAddressKey =
        candidate.addressKey &&
        existing.addressKey &&
        candidate.addressKey === existing.addressKey;

      const dist = distanceMeters(candidate.lat, candidate.lng, existing.lat, existing.lng);
      const isWithin50m = dist <= 50;

      if (sameAddressKey || isWithin50m) {
        existingIndex = i;
        break;
      }
    }

    if (existingIndex >= 0) {
      // Keep the one with the most specific address (has house_number)
      const existing = uniqueList[existingIndex];
      if (!existing.hasHouseNumber && candidate.hasHouseNumber) {
        uniqueList[existingIndex] = candidate;
      }
    } else {
      uniqueList.push(candidate);
    }

    if (uniqueList.length >= 5) {
      break;
    }
  }

  const result: ProcessedSuggestions = uniqueList.slice(0, 5);
  if (rawItems.length > 0 && uniqueList.length === 0 && hadExplicitOutsideDc) {
    result.outsideDc = true;
  }
  return result;
}
