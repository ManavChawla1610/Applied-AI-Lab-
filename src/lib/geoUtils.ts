import { DC_BOUNDS } from '../../config/geo.ts';

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
  outsideDc?: boolean;
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

export interface PhotonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    osm_type?: string;
    osm_id?: number | string;
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    locality?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    countrycode?: string;
    [key: string]: any;
  };
}

export interface PhotonFeatureCollection {
  type: string;
  features: PhotonFeature[];
}

/**
 * Filters, validates, logs, and deduplicates Photon GeoJSON geocode results.
 * Drops non-DC items silently during typing.
 * Deduplicates by same housenumber + street OR within 50 meters.
 * Formats: "[housenumber] [street], [district or locality], Washington, DC"
 * If no housenumber, uses properties.name.
 */
export function processPhotonResults(features: PhotonFeature[]): ProcessedSuggestions {
  const validCandidates: ValidatedSuggestion[] = [];
  let hadExplicitOutsideDc = false;

  for (const feature of features) {
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;

    // GeoJSON: [lon, lat]
    const lon = typeof coords[0] === 'number' ? coords[0] : parseFloat(String(coords[0]));
    const lat = typeof coords[1] === 'number' ? coords[1] : parseFloat(String(coords[1]));

    if (isNaN(lat) || isNaN(lon)) {
      continue;
    }

    const p = feature.properties || {};
    const state = (p.state || '').trim();
    const city = (p.city || '').trim();

    const isInsideDcBbox =
      lat >= DC_BOUNDS.minLat &&
      lat <= DC_BOUNDS.maxLat &&
      lon >= DC_BOUNDS.minLng &&
      lon <= DC_BOUNDS.maxLng;

    // STEP 3: Keep a result if properties.state === "District of Columbia"
    // OR (properties.city === "Washington" AND the point is inside the DC bbox).
    // Drop everything else silently.
    const isDc =
      state === 'District of Columbia' ||
      (city.toLowerCase() === 'washington' && isInsideDcBbox);

    if (!isDc) {
      if (state || city) {
        hadExplicitOutsideDc = true;
      }
      continue;
    }

    const housenumber = (p.housenumber || '').trim();
    const street = (p.street || '').trim();
    const districtOrLocality = (p.district || p.locality || p.suburb || '').trim();
    const name = (p.name || '').trim();

    let shortLabel = '';
    let fullLabel = '';
    let addressKey = '';
    const hasHouseNumber = Boolean(housenumber);

    if (housenumber && street) {
      shortLabel = `${housenumber} ${street}`;
      fullLabel = districtOrLocality
        ? `${shortLabel}, ${districtOrLocality}, Washington, DC`
        : `${shortLabel}, Washington, DC`;
      addressKey = `${housenumber.toLowerCase()} ${street.toLowerCase()}`;
    } else if (name) {
      shortLabel = name;
      fullLabel = districtOrLocality
        ? `${name}, ${districtOrLocality}, Washington, DC`
        : `${name}, Washington, DC`;
      addressKey = name.toLowerCase();
    } else if (street) {
      shortLabel = street;
      fullLabel = districtOrLocality
        ? `${street}, ${districtOrLocality}, Washington, DC`
        : `${street}, Washington, DC`;
      addressKey = street.toLowerCase();
    } else {
      shortLabel = districtOrLocality || 'Washington, DC';
      fullLabel = `${shortLabel}, Washington, DC`;
      addressKey = shortLabel.toLowerCase();
    }

    validCandidates.push({
      id: String(p.osm_id || `${lat}-${lon}`),
      displayName: fullLabel,
      shortLabel,
      fullLabel,
      neighborhood: districtOrLocality || 'Washington, DC',
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
  if (features.length > 0 && uniqueList.length === 0 && hadExplicitOutsideDc) {
    result.outsideDc = true;
  }
  return result;
}
