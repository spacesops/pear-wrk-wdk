import type {
  LogRequest,
  WorkletStartRequest,
  WorkletStartResponse,
  DisposeRequest,
  CallMethodRequest,
  CallMethodResponse,
  CallMethodByPathRequest,
  CallMethodByPathResponse
} from './rpc';

/**
 * Stream interface for RPC communication
 */
export interface RPCStream {
  data?: unknown;
  [key: string]: unknown;
}

/**
 * Request stream interface for RPC communication
 */
export interface RPCRequestStream {
  [key: string]: unknown;
}

/**
 * HRPC class for handling RPC communication with the worklet
 */
export class HRPC {
  constructor(stream: unknown);

  /**
   * Send a log message
   * @param args - Log request
   */
  log(args: LogRequest): void;

  /**
   * Start the worklet
   * @param args - Worklet start request
   * @returns Promise resolving to worklet start response
   */
  workletStart(args: WorkletStartRequest): Promise<WorkletStartResponse>;

  /**
   * Dispose of the worklet
   * @param args - Dispose request
   */
  dispose(args: DisposeRequest): void;

  /**
   * Call a method on a wallet account resolved by account index
   * @param args - Call method request
   * @returns Promise resolving to call method response
   */
  callMethod(args: CallMethodRequest): Promise<CallMethodResponse>;

  /**
   * Call a method on a wallet account resolved by BIP relative derivation path
   * via `wdk.getAccountByPath(network, path)`.
   * @param args - Call method by path request
   * @returns Promise resolving to call method by path response
   */
  callMethodByPath(args: CallMethodByPathRequest): Promise<CallMethodByPathResponse>;

  /**
   * Register a handler for log messages
   * @param responseFn - Handler function for log requests
   */
  onLog(responseFn: (request: LogRequest) => void | Promise<void>): void;

  /**
   * Register a handler for worklet start
   * @param responseFn - Handler function for worklet start requests
   */
  onWorkletStart(
    responseFn: (request: WorkletStartRequest) => WorkletStartResponse | Promise<WorkletStartResponse>
  ): void;

  /**
   * Register a handler for dispose
   * @param responseFn - Handler function for dispose requests
   */
  onDispose(responseFn: (request: DisposeRequest) => void | Promise<void>): void;

  /**
   * Register a handler for call method
   * @param responseFn - Handler function for call method requests
   */
  onCallMethod(
    responseFn: (request: CallMethodRequest) => CallMethodResponse | Promise<CallMethodResponse>
  ): void;

  /**
   * Register a handler for call method by path
   * @param responseFn - Handler function for call method by path requests
   */
  onCallMethodByPath(
    responseFn: (
      request: CallMethodByPathRequest
    ) => CallMethodByPathResponse | Promise<CallMethodByPathResponse>
  ): void;
}

export default HRPC;


