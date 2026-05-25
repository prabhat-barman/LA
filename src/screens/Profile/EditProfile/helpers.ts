import type { CountryData } from 'country-codes-list';
import { COUNTRIES } from './constants';

// Country-specific phone-number length cap. Defaults to a generous 15
// for codes we haven't explicitly enumerated.
export const getPhoneMaxLength = (countryCode: string): number => {
  const code = (countryCode || '').toUpperCase();
  switch (code) {
    case 'IN':
    case 'US':
    case 'CA':
    case 'GB':
      return 10;
    case 'AU':
    case 'AE':
      return 9;
    case 'SG':
      return 8;
    default:
      return 15;
  }
};

export const formatExamDateDisplay = (d: Date | null): string => {
  if (!d) return 'Set your exam date';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const toISODate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Parses a stored phone (which may include country code) into a
// {country, localPhone} pair by matching against the longest country
// calling code prefix. Falls back to "no country match" so the user
// still sees their digits.
export interface ParsedPhone {
  country: CountryData | null;
  localPhone: string;
}

export const parsePhoneWithCountry = (
  rawPhone: string | undefined | null,
): ParsedPhone => {
  if (!rawPhone) return { country: null, localPhone: '' };
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return { country: null, localPhone: '' };

  // Sort longest-first so e.g. +91 wins over +9 lookups.
  const sortedCountries = [...COUNTRIES].sort(
    (a, b) => b.countryCallingCode.length - a.countryCallingCode.length,
  );
  for (const country of sortedCountries) {
    if (cleanPhone.startsWith(country.countryCallingCode)) {
      return {
        country,
        localPhone: cleanPhone.slice(country.countryCallingCode.length),
      };
    }
  }
  return { country: null, localPhone: cleanPhone };
};

export const filterCountriesByQuery = (
  countries: CountryData[],
  query: string,
): CountryData[] => {
  const trimmed = query.toLowerCase().trim();
  if (!trimmed) return countries;
  return countries.filter(country => {
    return (
      country.countryNameEn.toLowerCase().includes(trimmed) ||
      country.countryCallingCode.includes(trimmed) ||
      country.countryCode.toLowerCase().includes(trimmed)
    );
  });
};

export const buildProfileImageUrl = (
  photoPath: string | undefined | null,
  baseUrl: string,
  fallback: string,
): string => {
  if (!photoPath || photoPath === 'null' || photoPath === 'undefined') {
    return fallback;
  }
  if (photoPath.startsWith('http')) return photoPath;
  const separator = baseUrl.endsWith('/') ? '' : '/';
  const cleanPath = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
  return `${baseUrl}${separator}${cleanPath}`;
};
