const DEFAULT_ALLOWED_DOMAINS = ['sfu.ca'];

const DOMAIN_SPLIT_REGEX = /[\s,]+/;

const toArray = value => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(entry => typeof entry === 'string' && entry.trim().length > 0);
  }
  if (typeof value === 'string') {
    return value.split(DOMAIN_SPLIT_REGEX).filter(entry => entry.trim().length > 0);
  }
  return [];
};

let cached;

const loadAllowlist = () => {
  const raw = process.env.ALLOWED_EMAIL_DOMAINS ?? process.env.EXPO_PUBLIC_ALLOWED_EMAIL_DOMAINS;
  const domains = toArray(raw).map(domain => domain.trim().toLowerCase());
  if (domains.length === 0) {
    return DEFAULT_ALLOWED_DOMAINS;
  }
  return Array.from(new Set(domains));
};

exports.getAllowedEmailDomains = () => {
  if (!cached) {
    cached = loadAllowlist();
  }
  return cached;
};

exports.__internal = {
  resetCache: () => {
    cached = undefined;
  }
};
