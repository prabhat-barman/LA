import { all, CountryData } from 'country-codes-list';

export const COUNTRIES: CountryData[] = all();

export const DEFAULT_COUNTRY: CountryData =
  COUNTRIES.find(c => c.countryCode === 'IN') || COUNTRIES[0];

export const FALLBACK_AVATAR_URI =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

export const TIMEZONES: ReadonlyArray<string> = [
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Nairobi',
  'America/Argentina/Buenos_Aires',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Sao_Paulo',
  'America/Toronto',
  'America/Vancouver',
  'Asia/Baghdad',
  'Asia/Bangkok',
  'Asia/Dubai',
  'Asia/Dhaka',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Kabul',
  'Asia/Karachi',
  'Asia/Kathmandu',
  'Asia/Kolkata',
  'Asia/Kuala_Lumpur',
  'Asia/Manila',
  'Asia/Riyadh',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Tehran',
  'Asia/Tokyo',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Darwin',
  'Australia/Hobart',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Sydney',
  'Europe/Amsterdam',
  'Europe/Athens',
  'Europe/Berlin',
  'Europe/Istanbul',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Paris',
  'Europe/Rome',
  'Europe/Zurich',
  'Pacific/Auckland',
  'UTC',
];
