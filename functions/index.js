const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

const { getAllowedEmailDomains } = require('./src/config');
const { validateEmailDomain } = require('./src/auth/domainAllowlist');
const {
  createMagicLinkRecord,
  consumeMagicLinkRecord,
  MagicLinkError,
  getMagicLinkTtlSeconds
} = require('./src/auth/magicLinkStore');

admin.initializeApp();

exports.enforceEmailAllowlist = functions.auth.user().beforeCreate(user => {
  const allowedDomains = getAllowedEmailDomains();
  const validation = validateEmailDomain(user.email || '', allowedDomains);

  if (!validation.ok) {
    throw new functions.auth.HttpsError('permission-denied', validation.message);
  }

  return {
    email: validation.email
  };
});

exports.prepareMagicLink = functions.https.onCall(async (data, context) => {
  const email = typeof data?.email === 'string' ? data.email : '';
  const allowedDomains = getAllowedEmailDomains();
  const validation = validateEmailDomain(email, allowedDomains);

  if (!validation.ok) {
    throw new functions.https.HttpsError('failed-precondition', validation.message);
  }

  const nonce = crypto.randomUUID();
  await createMagicLinkRecord({ email: validation.email, nonce });

  return {
    nonce,
    ttlSeconds: getMagicLinkTtlSeconds()
  };
});

exports.verifyMagicLink = functions.auth.user().beforeSignIn(async event => {
  const credential = event.credential?.emailLinkSignin;
  if (!credential) {
    return;
  }

  const link = credential.emailLink || credential.link || credential.signInLink;
  if (!link) {
    throw new functions.auth.HttpsError('permission-denied', 'Magic link is invalid.');
  }

  const parsedLink = new URL(link);
  const continueUrlParam = parsedLink.searchParams.get('continueUrl');
  if (!continueUrlParam) {
    throw new functions.auth.HttpsError('permission-denied', 'Magic link is invalid.');
  }

  const continueUrl = new URL(continueUrlParam);
  const nonce = continueUrl.searchParams.get('nonce');
  if (!nonce) {
    throw new functions.auth.HttpsError('permission-denied', 'Magic link is invalid.');
  }

  try {
    await consumeMagicLinkRecord({
      nonce,
      email: (event.data.email || '').toLowerCase()
    });
  } catch (error) {
    if (error instanceof MagicLinkError) {
      const message =
        error.code === 'expired'
          ? 'Magic link has expired. Request a new one.'
          : error.code === 'consumed'
          ? 'Magic link has already been used. Request a new one.'
          : 'Magic link is invalid.';
      throw new functions.auth.HttpsError('permission-denied', message);
    }
    throw error;
  }
});
