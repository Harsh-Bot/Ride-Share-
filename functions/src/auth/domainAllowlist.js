const punycode = require('punycode');

const ASCII_DOMAIN_REGEX = /^[a-z0-9.-]+$/;

const containsOnlyAscii = value => ASCII_DOMAIN_REGEX.test(value);

const normalizeDomain = rawDomain => {
  if (!rawDomain) {
    return '';
  }
  const trimmed = rawDomain.trim().toLowerCase();
  if (!trimmed) {
    return '';
  }
  // Reject non-ASCII characters early.
  if (!containsOnlyAscii(trimmed)) {
    return '';
  }
  // Reject punycode look-alikes.
  if (trimmed.includes('xn--')) {
    return '';
  }

  try {
    const ascii = punycode.toASCII(trimmed);
    if (ascii.includes('xn--')) {
      return '';
    }
    return ascii;
  } catch (error) {
    console.warn('Failed to normalize domain', error);
    return '';
  }
};

const normalizeEmail = rawEmail => rawEmail.trim().toLowerCase();

exports.normalizeDomain = normalizeDomain;
exports.normalizeEmail = normalizeEmail;

exports.validateEmailDomain = (email, allowedDomains) => {
  const normalizedEmail = normalizeEmail(email || '');
  if (!normalizedEmail) {
    return {
      ok: false,
      code: 'invalid-format',
      message: 'Email is required.'
    };
  }

  const atIndex = normalizedEmail.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === normalizedEmail.length - 1) {
    return {
      ok: false,
      code: 'invalid-format',
      message: 'Email must include an @ symbol.'
    };
  }

  const domain = normalizedEmail.slice(atIndex + 1);
  const normalizedDomain = normalizeDomain(domain);

  if (!normalizedDomain) {
    return {
      ok: false,
      code: 'homograph-detected',
      message: 'Email domain is not permitted.'
    };
  }

  if (!allowedDomains.includes(normalizedDomain)) {
    return {
      ok: false,
      code: 'domain-not-allowed',
      message: 'Email domain is not allowlisted.'
    };
  }

  return {
    ok: true,
    email: normalizedEmail,
    domain: normalizedDomain
  };
};
