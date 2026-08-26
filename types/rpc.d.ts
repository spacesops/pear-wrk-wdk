/**
 * Log type enumeration
 */
export enum LogType {
  INFO = 1,
  ERROR = 2,
  DEBUG = 3
}

/**
 * Log request message
 */
export interface LogRequest {
  type?: LogType;
  data?: string | null;
}

/**
 * Worklet start request
 */
export interface WorkletStartRequest {
  enableDebugLogs?: number;
  seedPhrase?: string | null;
  seedBuffer?: string | null;
  config: string; // JSON string of network configurations
}

/**
 * Worklet start response
 */
export interface WorkletStartResponse {
  status?: string | null;
}

/**
 * Dispose request (empty)
 */
export interface DisposeRequest {
  // Empty request
}

/**
 * Call method request
 */
export interface CallMethodRequest {
  methodName: string;
  network: string;
  accountIndex: number;
  args?: string | null; // JSON string of method arguments
}

/**
 * Call method response
 */
export interface CallMethodResponse {
  result?: string | null; // JSON string of method result
}

/**
 * Call method by derivation path request.
 * Path is the wallet-relative BIP suffix passed to `wdk.getAccountByPath`
 * (e.g. "0'/0/0" or "9'/0/1"), not the full m/86'/0'/… path.
 */
export interface CallMethodByPathRequest {
  methodName: string;
  network: string;
  path: string;
  args?: string | null; // JSON string of method arguments
}

/**
 * Call method by path response (same shape as callMethod)
 */
export interface CallMethodByPathResponse {
  result?: string | null; // JSON string of method result
}

/**
 * Batch-derive Taproot addresses from wallet-relative BIP path suffixes.
 * `relativePathsJson` is a JSON array of suffixes passed to `wdk.getAccountByPath`
 * (e.g. `["9'/0/0","9'/0/1"]`). `includeKeyMaterial` is 1 to also return
 * internal/tweaked Taproot key hex.
 */
export interface DeriveTaprootAddressesFromPathsRequest {
  relativePathsJson: string;
  network?: string | null;
  includeKeyMaterial?: number;
}

export interface DeriveTaprootAddressesFromPathsResponse {
  addressesJson?: string | null;
}

/**
 * Network configuration map
 * Keys are network names (e.g., 'ethereum', 'spark')
 * Values are network-specific configuration objects
 */
export interface NetworkConfigs {
  [networkName: string]: unknown;
}
