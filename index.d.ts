export { default as HRPC } from "./spec/hrpc";
export * as schema from "./spec/schema";
export type FeeRates = import("@wdk/wallet").FeeRates;
export type TransferOptions = import("@wdk/wallet").TransferOptions;
export type TransferResult = import("@wdk/wallet").TransferResult;
export type IWalletAccount = import("@wdk/wallet").IWalletAccount;
export type Seed = import("./src/wdk-core/wdk-manager.js").Seed;
export type Seeds = import("./src/wdk-core/wdk-manager.js").Seeds;
export type WdkConfig = import("./src/wdk-core/wdk-manager.js").WdkConfig;
export type TransferConfig = import("./src/wdk-core/wdk-manager.js").TransferConfig;
export { WdkManager, Blockchain } from "./src/wdk-core/wdk-manager.js";
//# sourceMappingURL=index.d.ts.map