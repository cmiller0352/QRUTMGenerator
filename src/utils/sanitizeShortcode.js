// src/utils/sanitizeShortcode.js

/**
 * Convert an arbitrary string into a safe, URL-friendly shortcode.
 * - Lowercases
 * - Trims whitespace
 * - Replaces any non [a-z0-9-] with '-'
 * - Collapses multiple '-' into a single '-'
 * - Strips leading/trailing '-'
 *
 * @param {string} input
 * @returns {string} sanitized shortcode (may be empty string if nothing valid remains)
 */
export default function sanitizeShortcode(input) {
  if (!input || typeof input !== 'string') return '';

  let s = input.trim().toLowerCase();

  // Replace invalid chars with '-'
  s = s.replace(/[^a-z0-9-]/g, '-');

  // Collapse multiple dashes
  s = s.replace(/-+/g, '-');

  // Remove leading/trailing dash
  s = s.replace(/^-|-$/g, '');

  return s;
}

/**
 * Optional helper: add a short random suffix when collisions occur.
 * Example output: "campaign-7gk"
 *
 * @param {string} base
 * @param {number} len number of random alphanumerics to append (default 3)
 * @returns {string}
 */
export function withRandomSuffix(base, len = 3) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < len; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const core = sanitizeShortcode(base) || 'link';
  return `${core}-${suffix}`;
}
