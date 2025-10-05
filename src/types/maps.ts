export type MapServiceErrorCode =
  | 'permission-denied'
  | 'location-unavailable'
  | 'loader-error'
  | 'config-missing';

type MapServiceErrorOptions = {
  cause?: unknown;
};

export class MapServiceError extends Error {
  readonly code: MapServiceErrorCode;
  readonly cause?: unknown;

  constructor(message: string, code: MapServiceErrorCode, options?: MapServiceErrorOptions) {
    super(message);
    this.name = 'MapServiceError';
    this.code = code;
    this.cause = options?.cause;
  }
}

export const isMapServiceError = (error: unknown): error is MapServiceError =>
  Boolean(error) && (error as MapServiceError).name === 'MapServiceError';
