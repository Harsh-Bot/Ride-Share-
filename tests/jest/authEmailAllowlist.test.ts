import { validateEmailAgainstAllowlist, __internal } from '../../src/config/emailAllowlist';

describe('email allowlist validation', () => {
  beforeEach(() => {
    __internal.resetCache();
    process.env.ALLOWED_EMAIL_DOMAINS = 'sfu.ca,cs.sfu.ca';
    delete process.env.EXPO_PUBLIC_ALLOWED_EMAIL_DOMAINS;
  });

  it('accepts primary SFU domain', () => {
    const result = validateEmailAgainstAllowlist('student@sfu.ca');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalizedEmail).toBe('student@sfu.ca');
      expect(result.domain).toBe('sfu.ca');
    }
  });

  it('accepts allowlisted subdomain with normalization', () => {
    const result = validateEmailAgainstAllowlist('User@CS.SFU.CA');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalizedEmail).toBe('user@cs.sfu.ca');
      expect(result.domain).toBe('cs.sfu.ca');
    }
  });

  it('rejects non-allowlisted domains', () => {
    const result = validateEmailAgainstAllowlist('user@gmail.com');
    expect(result).toMatchObject({ ok: false, error: 'domain-not-allowed' });
  });

  it('rejects look-alike unicode domains', () => {
    const result = validateEmailAgainstAllowlist('user@ѕfu.ca');
    expect(result).toMatchObject({ ok: false, error: 'homograph-detected' });
  });
});
