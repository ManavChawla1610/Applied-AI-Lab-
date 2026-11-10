/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Listing {
  listing_id: number;
  listing_name: string;
  listing_type: string;
  room_type: 'entire_home' | 'private_room';
  bedrooms_clean: number | null;
  latitude: number;
  longitude: number;
  exact_location: boolean | null;
  rating_overall: number | null;
  num_reviews: number | null;
  ttm_revenue: number | null;
  ttm_avg_rate: number;
  ttm_adjusted_occupancy: number;
  ttm_reserved_days: number | null;
  hosting_mode: string | null;
  is_active: boolean;
}

export const DATA_FILE_URL = '/assets/aistudio/dc_listings_clean_3b72fa17.json';

let cachedListings: Listing[] | null = null;

/**
 * Loads the cleaned DC listings dataset.
 * Throws a descriptive error if loading fails so the UI displays a visible error banner
 * rather than falling back to placeholder numbers.
 */
export async function loadListings(): Promise<Listing[]> {
  if (cachedListings) {
    return cachedListings;
  }

  try {
    // If running in Node.js test environment
    if (typeof window === 'undefined') {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.resolve(process.cwd(), 'public/assets/aistudio/dc_listings_clean_3b72fa17.json');
      const fileData = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(fileData) as Listing[];
      cachedListings = parsed;
      return parsed;
    }

    // In browser environment
    const response = await fetch(DATA_FILE_URL);
    if (!response.ok) {
      throw new Error(`Failed to load DC listings dataset (HTTP ${response.status}: ${response.statusText})`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid listings dataset format: expected JSON array');
    }

    cachedListings = data as Listing[];
    return cachedListings;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Data loading failure: ${message}`);
  }
}
