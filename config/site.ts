/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Site identity and search settings. Edit here when the domain changes.
 */

// The one address search engines should treat as the real one (canonical URL).
// Change this when you connect your own domain, e.g. 'https://www.dchostcalc.com'.
// It can also be set with the SITE_URL environment variable.
export const SITE_URL = (process.env.SITE_URL || 'https://dc-airbnb-earnings-estimator.ai.studio').replace(/\/+$/, '');

export const SITE_NAME = 'DC Host Calculator';

// Shown as the blue link in Google results. Keep it under ~60 characters.
export const SITE_TITLE = 'DC Airbnb Calculator: How Much Can Your Home Earn?';

// Shown under the link in Google results. Keep it under ~155 characters.
export const SITE_DESCRIPTION =
  "Free Airbnb earnings calculator for Washington, DC homeowners. Estimate monthly income from nearby listings, see hosting costs and check DC's rental rules.";

export const ABOUT_TITLE = 'How the DC Airbnb Earnings Calculator Works | DC Host Calculator';
export const ABOUT_DESCRIPTION =
  "How we estimate Airbnb income for Washington, DC homes, what hosting costs, and DC's short-term rental rules: licenses, the 90-night cap, insurance and taxes.";

// Google Search Console → Add property → URL prefix → "HTML tag" method gives a code like
// <meta name="google-site-verification" content="abc123">. Paste only the content value here
// (or set GOOGLE_SITE_VERIFICATION). Leave empty until you have one.
export const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION || '';

// Date the public pages last changed meaningfully (used in the sitemap).
export const CONTENT_UPDATED = '2026-11-13';
