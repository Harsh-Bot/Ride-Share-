declare global {
  // Google Maps JavaScript SDK attaches `google` to the global scope.
  const google: any;
  // Node-style global used in some legacy modules.
  // eslint-disable-next-line no-var
  var global: any;
}

export {};
