const SFU_DOMAIN_ALLOWLIST = ['sfu.ca', 'cs.sfu.ca'];

export const isSfuEmail = (email: string) => {
  // TODO: Harden domain validation, consider punycode normalization and plus-address handling
  const normalized = email.trim().toLowerCase();
  const [, domain] = normalized.split('@');
  if (!domain) {
    return false;
  }
  return SFU_DOMAIN_ALLOWLIST.includes(domain);
};
