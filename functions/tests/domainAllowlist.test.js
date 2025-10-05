const { __internal: configInternal, getAllowedEmailDomains } = require('../src/config');
const { validateEmailDomain } = require('../src/auth/domainAllowlist');

const resetEnv = () => {
  delete process.env.ALLOWED_EMAIL_DOMAINS;
  delete process.env.EXPO_PUBLIC_ALLOWED_EMAIL_DOMAINS;
  configInternal.resetCache();
};

describe('functions email allowlist', () => {
  beforeEach(() => {
    resetEnv();
    process.env.ALLOWED_EMAIL_DOMAINS = 'sfu.ca,cs.sfu.ca';
    configInternal.resetCache();
  });

  afterEach(() => {
    resetEnv();
  });

  const allowed = () => getAllowedEmailDomains();

  test.each([
    ['student@sfu.ca', true],
    ['User@CS.SFU.CA', true],
    ['user@sfu.co', false],
    ['user@xn--sfu-123.ca', false],
    ['user@ѕfu.ca', false]
  ])('validates %s => %s', (email, expected) => {
    const result = validateEmailDomain(email, allowed());
    expect(result.ok).toBe(expected);
    if (expected) {
      expect(result.email).toBe(email.trim().toLowerCase());
    }
  });
});
