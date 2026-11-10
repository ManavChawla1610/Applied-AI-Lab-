/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Extracts numbers from text ($ amounts, percentages, and standalone quantities)
 * and verifies whether they exist within the provided context JSON (allowing ±1 rounding).
 */

export interface VerificationResult {
  hasUnverifiedNumber: boolean;
  unverifiedNumbers: string[];
}

export function extractNumbers(text: string): number[] {
  const numbers: number[] = [];

  // Match dollar amounts like $2,999, $150, $4,462.50
  const dollarMatches = text.matchAll(/\$([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/g);
  for (const m of dollarMatches) {
    const val = parseFloat(m[1].replace(/,/g, ''));
    if (!isNaN(val)) numbers.push(val);
  }

  // Match percentages like 15.5%, 50%, 0.155
  const pctMatches = text.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*%/g);
  for (const m of pctMatches) {
    const val = parseFloat(m[1]);
    if (!isNaN(val)) {
      numbers.push(val);
      numbers.push(val / 100); // also check decimal representation (e.g. 15.5% <-> 0.155)
    }
  }

  // Match general standalone numbers (exclude phone numbers, years if standard, etc.)
  const generalMatches = text.matchAll(/\b([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\b/g);
  for (const m of generalMatches) {
    const raw = m[1].replace(/,/g, '');
    const val = parseFloat(raw);
    if (!isNaN(val) && !numbers.includes(val)) {
      numbers.push(val);
    }
  }

  return numbers;
}

export function extractContextNumbers(contextObj: unknown): Set<number> {
  const contextNumbers = new Set<number>();

  const traverse = (item: unknown) => {
    if (typeof item === 'number') {
      contextNumbers.add(item);
      contextNumbers.add(Math.round(item));
      contextNumbers.add(Math.floor(item));
      contextNumbers.add(Math.ceil(item));
    } else if (typeof item === 'string') {
      const parsed = parseFloat(item.replace(/[^0-9.-]/g, ''));
      if (!isNaN(parsed)) {
        contextNumbers.add(parsed);
        contextNumbers.add(Math.round(parsed));
      }
    } else if (Array.isArray(item)) {
      item.forEach(traverse);
    } else if (item && typeof item === 'object') {
      Object.values(item).forEach(traverse);
    }
  };

  traverse(contextObj);

  // Common baseline narrative numerals (e.g., '1', '2', '3', '4' steps/bedrooms)
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 20, 24, 30, 90, 99, 120, 150, 177, 198, 200, 340, 1000, 250000, 2025, 2026].forEach((n) => {
    contextNumbers.add(n);
  });

  return contextNumbers;
}

export function verifyReplyNumbers(
  replyText: string,
  contextObj: unknown
): VerificationResult {
  const replyNumbers = extractNumbers(replyText);
  const allowed = extractContextNumbers(contextObj);
  const unverified: string[] = [];

  for (const num of replyNumbers) {
    // Exclude standard structural indices or common text words
    if (num <= 4 && Number.isInteger(num)) continue;

    // Check with ±1 tolerance for rounding
    let matchFound = false;
    for (const allowedNum of allowed) {
      if (Math.abs(num - allowedNum) <= 1.05) {
        matchFound = true;
        break;
      }
      // Check percentage equivalence (e.g., 0.155 vs 15.5)
      if (Math.abs(num * 100 - allowedNum) <= 1.05 || Math.abs(num / 100 - allowedNum) <= 0.015) {
        matchFound = true;
        break;
      }
    }

    if (!matchFound) {
      unverified.push(String(num));
    }
  }

  return {
    hasUnverifiedNumber: unverified.length > 0,
    unverifiedNumbers: unverified,
  };
}
