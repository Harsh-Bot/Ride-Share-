const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { beforeUserCreated, beforeUserSignedIn } = require('firebase-functions/v2/identity');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');

const { getAllowedEmailDomains } = require('./src/config');
const { validateEmailDomain } = require('./src/auth/domainAllowlist');
const {
  createMagicLinkRecord,
  consumeMagicLinkRecord,
  MagicLinkError,
  getMagicLinkTtlSeconds,
  findLatestPendingMagicLink
} = require('./src/auth/magicLinkStore');

admin.initializeApp();

exports.enforceEmailAllowlist = beforeUserCreated(event => {
  const allowedDomains = getAllowedEmailDomains();
  const validation = validateEmailDomain(event.data.email || '', allowedDomains);

  if (!validation.ok) {
    throw new HttpsError('permission-denied', validation.message);
  }

  return {
    email: validation.email
  };
});

exports.prepareMagicLink = onCall(async request => {
  const email = typeof request.data?.email === 'string' ? request.data.email : '';
  const allowedDomains = getAllowedEmailDomains();
  const validation = validateEmailDomain(email, allowedDomains);

  if (!validation.ok) {
    throw new HttpsError('failed-precondition', validation.message);
  }

  const nonce = crypto.randomUUID();
  await createMagicLinkRecord({ email: validation.email, nonce });

  return {
    nonce,
    ttlSeconds: getMagicLinkTtlSeconds()
  };
});

exports.verifyMagicLink = beforeUserSignedIn(async event => {
  const credential = event.credential?.emailLinkSignin;
  logger.debug('verifyMagicLink event payload', {
    hasCredential: Boolean(credential),
    credentialKeys: credential ? Object.keys(credential) : null,
    email: event.data?.email,
    uid: event.uid
  });

  const normalizedEmail = (event.data?.email || '').toLowerCase();
  if (!normalizedEmail) {
    throw new HttpsError('permission-denied', 'Magic link is invalid.');
  }
  let resolvedNonce = null;

  if (credential) {
    const link = credential.emailLink || credential.link || credential.signInLink;
    if (!link) {
      throw new HttpsError('permission-denied', 'Magic link is invalid.');
    }

    const parsedLink = new URL(link);
    const continueUrlParam = parsedLink.searchParams.get('continueUrl');
    if (!continueUrlParam) {
      throw new HttpsError('permission-denied', 'Magic link is invalid.');
    }

    const continueUrl = new URL(continueUrlParam);
    const nonce = continueUrl.searchParams.get('nonce');
    if (!nonce) {
      throw new HttpsError('permission-denied', 'Magic link is invalid.');
    }
    resolvedNonce = nonce;
  }

  if (!resolvedNonce) {
    const pending = await findLatestPendingMagicLink(normalizedEmail);
    if (!pending) {
      throw new HttpsError('permission-denied', 'Magic link is invalid or already used.');
    }
    resolvedNonce = pending.id;
  }

  logger.debug('verifyMagicLink checking record', {
    nonce: resolvedNonce,
    email: normalizedEmail,
    uid: event.uid
  });

  try {
    await consumeMagicLinkRecord({
      nonce: resolvedNonce,
      email: normalizedEmail,
      metadata: {
        uid: event.uid
      }
    });
  } catch (error) {
    if (error instanceof MagicLinkError) {
      const message =
        error.code === 'expired'
          ? 'Magic link has expired. Request a new one.'
          : error.code === 'consumed'
          ? 'Magic link has already been used or expired. Request a new one.'
          : 'Magic link is invalid.';
      throw new HttpsError('permission-denied', message);
    }
    throw error;
  }
});
