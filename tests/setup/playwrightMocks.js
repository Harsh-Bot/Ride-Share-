const Module = require('module');

const originalRequire = Module.prototype.require;

Module.prototype.require = function patchedRequire(id) {
  if (id === 'expo-secure-store') {
    return {
      isAvailableAsync: async () => true,
      setItemAsync: async () => {},
      getItemAsync: async () => null,
      deleteItemAsync: async () => {}
    };
  }

  if (id === '@react-native-async-storage/async-storage') {
    return {
      setItem: async () => null,
      getItem: async () => null,
      removeItem: async () => null
    };
  }

  if (id === 'react-native') {
    return {
      Platform: { OS: 'web' },
      Alert: { alert: () => {} },
      ToastAndroid: { SHORT: 0, show: () => {} }
    };
  }

  return originalRequire.apply(this, [id]);
};
