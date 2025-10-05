const { spawn } = require('child_process');
const path = require('path');

const firebaseConfig = require('../../firebase.json');

const PLAYWRIGHT_REGISTER_PATH = path.resolve(__dirname, 'playwrightRegister.js');

const emulatorConfig = firebaseConfig.emulators || {};

const defaultHost = (config = {}, fallbackPort) => {
  if (!config) {
    return `127.0.0.1:${fallbackPort}`;
  }

  const host = config.host || '127.0.0.1';
  const port = config.port || fallbackPort;
  return `${host}:${port}`;
};

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST
  || defaultHost(emulatorConfig.auth, 9099);
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST
  || defaultHost(emulatorConfig.firestore, 8080);
const FUNCTIONS_HOST = process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST
  || defaultHost(emulatorConfig.functions, 5001);
const PLAYWRIGHT_ARGS = ['test', '--reporter=list'];

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url, options = {}, retries = 10) => {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status === 404) {
        return response;
      }
    } catch (error) {
      if (attempt === retries - 1) {
        throw error;
      }
    }
    await wait(200);
  }
  throw new Error(`Failed to reach ${url}`);
};

const serverFromHost = host => {
  if (host.startsWith('http')) {
    return host;
  }
  return `http://${host}`;
};

const ensureEmulators = async () => {
  const baseUrl = serverFromHost(AUTH_HOST);
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'demo-no-project';
  const healthUrl = `${baseUrl}/emulator/v1/projects/${projectId}/config`;
  const functionsHealthUrl = `${serverFromHost(FUNCTIONS_HOST)}/emulator/v1/projects/${projectId}/functions`;
  const firestoreHealthUrl = `${serverFromHost(FIRESTORE_HOST)}/`;

  try {
    await fetchWithRetry(healthUrl, {}, 2);
    await fetchWithRetry(firestoreHealthUrl, {}, 2);
    await fetchWithRetry(functionsHealthUrl, {}, 2);
    return { stop: () => {} };
  } catch (error) {
    // need to start emulator
  }

  const firebaseBin = process.platform === 'win32'
    ? path.join('node_modules', '.bin', 'firebase.cmd')
    : path.join('node_modules', '.bin', 'firebase');

  const emulatorTargets = ['auth', 'firestore', 'functions'];

  const emulatorArgs = [
    'emulators:start',
    '--only',
    emulatorTargets.join(','),
    '--project',
    projectId
  ];

  const child = spawn(firebaseBin, emulatorArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      FIREBASE_CONFIG: process.env.FIREBASE_CONFIG || '{}'
    }
  });

  let resolved = false;

  const logs = [];

  const readyPromise = new Promise((resolve, reject) => {
    const onData = data => {
      const text = data.toString();
      logs.push(text);
      if (/Auth Emulator listening/i.test(text) || /All emulators ready/i.test(text)) {
        resolved = true;
        cleanup();
        resolve();
      }
    };

    const onError = error => {
      if (!resolved) {
        cleanup();
        reject(error);
      }
    };

    const onExit = code => {
      if (!resolved) {
        cleanup();
        const err = new Error(`Auth emulator exited with code ${code}`);
        err.logs = logs.join('');
        reject(err);
      }
    };

    const cleanup = () => {
      child.stdout.off('data', onData);
      child.stderr.off('data', onData);
      child.off('error', onError);
      child.off('exit', onExit);
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('error', onError);
    child.once('exit', onExit);
  });

  await readyPromise;
  await fetchWithRetry(healthUrl, {}, 10);
  await fetchWithRetry(firestoreHealthUrl, {}, 10);
  await fetchWithRetry(functionsHealthUrl, {}, 10);

  return {
    stop: () => {
      if (!child.killed) {
        child.kill('SIGINT');
      }
    }
  };
};

const runPlaywright = () => {
  const playwrightBin = process.platform === 'win32'
    ? path.join('node_modules', '.bin', 'playwright.cmd')
    : path.join('node_modules', '.bin', 'playwright');

  return new Promise((resolve, reject) => {
  const existingNodeOptions = process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : '';
  const child = spawn(playwrightBin, PLAYWRIGHT_ARGS, {
    stdio: 'inherit',
    env: {
      ...process.env,
      FIRESTORE_EMULATOR_HOST: FIRESTORE_HOST,
      FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST,
      FIREBASE_FUNCTIONS_EMULATOR_HOST: FUNCTIONS_HOST,
      NODE_OPTIONS: `${existingNodeOptions}--require=${PLAYWRIGHT_REGISTER_PATH}`.trim()
    }
  });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Playwright exited with code ${code}`));
      }
    });
  });
};

(async () => {
  let emulatorHandle;
  try {
    emulatorHandle = await ensureEmulators();
    await runPlaywright();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (emulatorHandle) {
      emulatorHandle.stop();
    }
  }
})();
