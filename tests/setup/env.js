const ensureEnv = (key, fallback) => {
  if (!process.env[key]) {
    process.env[key] = fallback;
  }
};

ensureEnv('EXPO_PUBLIC_FIREBASE_API_KEY', 'demo-api-key');
ensureEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'localhost');
ensureEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'demo-no-project');
ensureEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'demo-no-project.appspot.com');
ensureEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '1234567890');
ensureEnv('EXPO_PUBLIC_FIREBASE_APP_ID', '1:1234567890:web:abcdef123456');
ensureEnv('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID', 'G-TEST123');
ensureEnv('EXPO_PUBLIC_FIREBASE_DYNAMIC_LINK_DOMAIN', 'sfurideshare.page.link');
ensureEnv('EXPO_PUBLIC_FIREBASE_MAGIC_LINK_PATH', 'auth/verify');
ensureEnv('EXPO_PUBLIC_IOS_BUNDLE_ID', 'ca.sfu.rideshare');
ensureEnv('EXPO_PUBLIC_ANDROID_PACKAGE_NAME', 'ca.sfu.rideshare');
ensureEnv('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099');
ensureEnv('ALLOWED_EMAIL_DOMAINS', 'sfu.ca,cs.sfu.ca');
ensureEnv('FIREBASE_FUNCTIONS_EMULATOR_HOST', '127.0.0.1:5001');
