const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

const COLLECTION_NAME = 'magicLinkRequests';
const MAX_TTL_SECONDS = 15 * 60;
const DEFAULT_TTL_SECONDS = MAX_TTL_SECONDS;

const parseTtl = raw => {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TTL_SECONDS;
  }
  return Math.min(parsed, MAX_TTL_SECONDS);
};

let firestoreAccessor = () => admin.firestore();
let nowAccessor = () => Date.now();

const getTtlSeconds = () => parseTtl(process.env.MAGIC_LINK_TTL_SECONDS);

class MagicLinkError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const collection = () => firestoreAccessor().collection(COLLECTION_NAME);

const findLatestPendingMagicLink = async email => {
  const normalizedEmail = email.toLowerCase();
  const snapshot = await collection().where('email', '==', normalizedEmail).get();

  let latest = null;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.consumed) {
      return;
    }
    if (!latest || (typeof data.issuedAt === 'number' && data.issuedAt > latest.data.issuedAt)) {
      latest = {
        id: doc.id,
        data
      };
    }
  });

  return latest;
};

const createMagicLinkRecord = async ({ email, nonce }) => {
  const issuedAt = nowAccessor();
  const docRef = collection().doc(nonce);
  await docRef.set({
    email,
    issuedAt,
    consumed: false,
    consumedAt: null
  });
  return { nonce, issuedAt };
};

const consumeMagicLinkRecord = async ({ email, nonce, metadata = {} }) => {
  const ttlMs = getTtlSeconds() * 1000;
  const now = nowAccessor();

  const db = firestoreAccessor();
  await db.runTransaction(async tx => {
    const docRef = collection().doc(nonce);
    const snapshot = await tx.get(docRef);

    if (!snapshot.exists) {
      throw new MagicLinkError('not_found', 'Magic link has expired or is invalid.');
    }

    const data = snapshot.data();
    logger.debug('magicLinkRecord', { nonce, data });
    const storedEmail = (data.email || '').toLowerCase();
    if (storedEmail !== email.toLowerCase()) {
      throw new MagicLinkError('email_mismatch', 'Magic link email mismatch.');
    }

    if (data.consumed) {
      throw new MagicLinkError('consumed', 'Magic link has already been used.');
    }

    if (typeof data.issuedAt !== 'number' || now - data.issuedAt > ttlMs) {
      throw new MagicLinkError('expired', 'Magic link has expired.');
    }

    const updatePayload = {
      consumed: true,
      consumedAt: now
    };

    if (metadata.uid) {
      updatePayload.consumedByUid = metadata.uid;
    }

    tx.update(docRef, updatePayload);
  });
};

const getMagicLinkStatus = async nonce => {
  const doc = await collection().doc(nonce).get();
  if (!doc.exists) {
    return null;
  }
  return doc.data();
};

exports.MagicLinkError = MagicLinkError;
exports.createMagicLinkRecord = createMagicLinkRecord;
exports.consumeMagicLinkRecord = consumeMagicLinkRecord;
exports.getMagicLinkStatus = getMagicLinkStatus;
exports.getMagicLinkTtlSeconds = getTtlSeconds;
exports.findLatestPendingMagicLink = findLatestPendingMagicLink;

exports.__internal = {
  setFirestoreAccessor: fn => {
    firestoreAccessor = fn;
  },
  setNowAccessor: fn => {
    nowAccessor = fn;
  },
  resetAccessors: () => {
    firestoreAccessor = () => admin.firestore();
    nowAccessor = () => Date.now();
  }
};
