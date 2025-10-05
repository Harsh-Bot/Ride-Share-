import Constants from 'expo-constants';

const DEFAULT_ALLOWED_DOMAINS = ['sfu.ca'];

const DOMAIN_SPLIT_REGEX = /[\s,]+/;
const ASCII_DOMAIN_REGEX = /^[a-z0-9.-]+$/;

const readFromExtra = (): string[] => {
  const extra = Constants?.expoConfig?.extra ?? Constants?.manifest?.extra;
  const configured = extra?.allowedEmailDomains;
  if (!configured) {
    return [];
  }
  if (Array.isArray(configured)) {
    return configured.filter((value: unknown): value is string => typeof value === 'string');
  }
  if (typeof configured === 'string') {
    return configured.split(DOMAIN_SPLIT_REGEX);
  }
  return [];
};

const toArray = (raw: unknown): string[] => {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  }
  if (typeof raw === 'string') {
    return raw.split(DOMAIN_SPLIT_REGEX).filter(value => value.trim().length > 0);
  }
  return [];
};

const collectAllowedDomains = () => {
  const fromEnv = toArray(process.env.EXPO_PUBLIC_ALLOWED_EMAIL_DOMAINS ?? process.env.ALLOWED_EMAIL_DOMAINS);
  const fromExtra = readFromExtra();
  const merged = [...fromEnv, ...fromExtra].map(value => value.trim().toLowerCase()).filter(Boolean);
  if (merged.length === 0) {
    return DEFAULT_ALLOWED_DOMAINS;
  }
  return Array.from(new Set(merged));
};

let cachedAllowlist: string[] | null = null;

export const getAllowedEmailDomains = () => {
  if (!cachedAllowlist) {
    cachedAllowlist = collectAllowedDomains();
  }
  return cachedAllowlist;
};

export const __internal = {
  resetCache: () => {
    cachedAllowlist = null;
  }
};

type EmailValidationSuccess = {
  ok: true;
  normalizedEmail: string;
  domain: string;
};

type EmailValidationError = {
  ok: false;
  error: 'invalid-format' | 'domain-not-allowed' | 'homograph-detected';
  message: string;
};

export type EmailValidationResult = EmailValidationSuccess | EmailValidationError;

const toNormalizedEmail = (email: string) => email.trim().toLowerCase();

const buildDomainErrorMessage = (allowedDomains: string[]) =>
  `Use your SFU email (${allowedDomains.join(', ')}) to sign in.`;

const containsOnlyAscii = (value: string) => ASCII_DOMAIN_REGEX.test(value);

const containsPunycode = (value: string) => value.includes('xn--');

export const validateEmailAgainstAllowlist = (rawEmail: string, allowedDomains = getAllowedEmailDomains()): EmailValidationResult => {
  const normalizedEmail = toNormalizedEmail(rawEmail);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return {
      ok: false,
      error: 'invalid-format',
      message: 'Enter a valid email address.'
    };
  }

  const [, domainPartRaw] = normalizedEmail.split('@');
  const domainPart = domainPartRaw?.trim().toLowerCase();
  if (!domainPart) {
    return {
      ok: false,
      error: 'invalid-format',
      message: 'Enter a valid email address.'
    };
  }

  if (!containsOnlyAscii(domainPart) || containsPunycode(domainPart)) {
    return {
      ok: false,
      error: 'homograph-detected',
      message: 'This email domain is not supported. Use your official SFU address.'
    };
  }

  if (!allowedDomains.includes(domainPart)) {
    return {
      ok: false,
      error: 'domain-not-allowed',
      message: buildDomainErrorMessage(allowedDomains)
    };
  }

  return {
    ok: true,
    normalizedEmail,
    domain: domainPart
  };
};
