const {
  createMagicLinkRecord,
  consumeMagicLinkRecord,
  MagicLinkError,
  getMagicLinkStatus,
  __internal
} = require('../src/auth/magicLinkStore');

const createMemoryDb = () => {
  const store = new Map();

  const buildDocRef = id => ({
    id,
    async get() {
      const data = store.get(id);
      return {
        exists: store.has(id),
        data: () => data,
        ref: buildDocRef(id)
      };
    },
    async set(value) {
      store.set(id, { ...value });
    },
    async update(update) {
      const existing = store.get(id) || {};
      store.set(id, { ...existing, ...update });
    }
  });

  return {
    collection: () => ({
      doc: id => buildDocRef(id)
    }),
    runTransaction: async handler => {
      const tx = {
        get: ref => ref.get(),
        update: (ref, update) => ref.update(update),
        set: (ref, value) => ref.set(value)
      };
      return handler(tx);
    },
    __store: store
  };
};

describe('magicLinkStore', () => {
  const memoryDb = createMemoryDb();
  const fixedNow = 1_000_000;

  beforeEach(() => {
    memoryDb.__store.clear();
    __internal.setFirestoreAccessor(() => memoryDb);
    __internal.setNowAccessor(() => fixedNow);
  });

  afterAll(() => {
    __internal.resetAccessors();
  });

  it('creates a magic link record with normalized email', async () => {
    await createMagicLinkRecord({ email: 'Student@SFU.ca', nonce: 'abc' });
    const status = await getMagicLinkStatus('abc');
    expect(status).toEqual({
      email: 'Student@SFU.ca',
      issuedAt: fixedNow,
      consumed: false,
      consumedAt: null
    });
  });

  it('consumes a magic link once', async () => {
    await createMagicLinkRecord({ email: 'student@sfu.ca', nonce: 'nonce-1' });
    await consumeMagicLinkRecord({ email: 'student@sfu.ca', nonce: 'nonce-1' });

    const status = await getMagicLinkStatus('nonce-1');
    expect(status.consumed).toBe(true);
    expect(status.consumedAt).toBe(fixedNow);
  });

  it('rejects reused magic links', async () => {
    await createMagicLinkRecord({ email: 'student@sfu.ca', nonce: 'nonce-2' });
    await consumeMagicLinkRecord({ email: 'student@sfu.ca', nonce: 'nonce-2' });

    await expect(consumeMagicLinkRecord({ email: 'student@sfu.ca', nonce: 'nonce-2' })).rejects.toThrow(
      MagicLinkError
    );
  });

  it('rejects expired magic links', async () => {
    __internal.setNowAccessor(() => 0);
    await createMagicLinkRecord({ email: 'student@sfu.ca', nonce: 'nonce-3' });

    const ttlMs = 15 * 60 * 1000;
    __internal.setNowAccessor(() => ttlMs + 1);

    await expect(consumeMagicLinkRecord({ email: 'student@sfu.ca', nonce: 'nonce-3' })).rejects.toThrow(
      MagicLinkError
    );
  });
});
