// eslint-disable-next-line no-undef
const { IPC } = BareKit
const HRPC = require('../spec/hrpc')

const { WdkManager } = require('../src/wdk-core/wdk-manager')
const rpcException = require('../src/exceptions/rpc-exception')

const rpc = new HRPC(IPC)

// Forward worklet console output to the main thread via the log RPC channel.
// log-type-enum: info=1, error=2, debug=3
const _wdkLogTypeEnum = { log: 1, warn: 1, error: 2, debug: 3 }
global.__wdkLog = function (level, args) {
  try {
    const type = _wdkLogTypeEnum[level] || 1
    const data = args.map(function (a) {
      if (typeof a === 'object') { try { return JSON.stringify(a) } catch (e) { return '[Circular]' } }
      return String(a)
    }).join(' ')
    rpc.log({ type, data })
  } catch (e) { /* ignore */ }
}

/**
 *
 * @type {WdkManager}
 */
let wdk = null

rpc.onWorkletStart(async init => {
  try {
    if (wdk) wdk.dispose() // cleanup existing;
    wdk = new WdkManager(init.seedPhrase || init.seedBuffer, JSON.parse(init.config))
    return { status: 'started' }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onGetAddress(async payload => {
  try {
    return { address: await wdk.getAddress(payload.network, payload.accountIndex) }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onGetAddressBalance(async payload => {
  try {
    const balance = await wdk.getAddressBalance(payload.network, payload.accountIndex)
    return { balance: balance.toString() }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onQuoteSendTransaction(async payload => {
  try {
    // Convert amount value to number
    payload.options.value = Number(payload.options.value)
    const transaction = await wdk.quoteSendTransaction(payload.network, payload.accountIndex, payload.options)
    return { fee: transaction.fee.toString() }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onQuoteSendTransactionTX(async payload => {
  try {
    // Convert amount value to number
    payload.options.value = Number(payload.options.value)
    // Convert feeRate to number if provided
    if (payload.options.feeRate !== undefined) {
      payload.options.feeRate = Number(payload.options.feeRate)
    }
    const txHex = await wdk.quoteSendTransactionTX(payload.network, payload.accountIndex, payload.options)
    return { txHex }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onQuoteSendTransactionWithMemo(async payload => {
  try {
    // Convert amount value to number
    payload.options.value = Number(payload.options.value)
    const transaction = await wdk.quoteSendTransactionWithMemo(payload.network, payload.accountIndex, payload.options)
    return { fee: transaction.fee.toString() }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onQuoteSendTransactionWithMemoTX(async payload => {
  try {
    // Convert amount value to number
    payload.options.value = Number(payload.options.value)
    // Convert feeRate to number if provided
    if (payload.options.feeRate !== undefined) {
      payload.options.feeRate = Number(payload.options.feeRate)
    }
    const txHex = await wdk.quoteSendTransactionWithMemoTX(payload.network, payload.accountIndex, payload.options)
    return { txHex }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onSendTransaction(async payload => {
  try {
    payload.options.value = Number(payload.options.value)
    const transaction = await wdk.sendTransaction(payload.network, payload.accountIndex, payload.options)
    return { fee: transaction.fee.toString(), hash: transaction.hash }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onSendTransactionWithMemo(async payload => {
  try {
    payload.options.value = Number(payload.options.value)
    const transaction = await wdk.sendTransactionWithMemo(payload.network, payload.accountIndex, payload.options)
    return { fee: transaction.fee.toString(), hash: transaction.hash }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

/*****************
 *
 * ABSTRACTION
 *
 *****************/
rpc.onGetAbstractedAddress(async payload => {
  try {
    return { address: await wdk.getAbstractedAddress(payload.network, payload.accountIndex) }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onGetAbstractedAddressBalance(async payload => {
  try {
    const balance = await wdk.getAbstractedAddressBalance(payload.network, payload.accountIndex)
    return { balance: balance.toString() }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onGetAbstractedAddressTokenBalance(async payload => {
  try {
    const balance = await wdk.getAbstractedAddressTokenBalance(payload.network, payload.accountIndex, payload.tokenAddress)
    return { balance: balance.toString() }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onAbstractedAccountTransfer(async payload => {
  try {
    payload.options.amount = Number(payload.options.amount)
    const transfer = await wdk.abstractedAccountTransfer(payload.network, payload.accountIndex, payload.options, payload.config)
    return { fee: transfer.fee.toString(), hash: transfer.hash }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onAbstractedSendTransaction(async payload => {
  try {
    const options = JSON.parse(payload.options)
    const transfer = await wdk.abstractedSendTransaction(payload.network, payload.accountIndex, options, payload.config)
    return { fee: transfer.fee.toString(), hash: transfer.hash }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onAbstractedAccountQuoteTransfer(async payload => {
  try {
    payload.options.amount = Number(payload.options.amount)
    console.log(payload)
    const transfer = await wdk.abstractedAccountQuoteTransfer(payload.network, payload.accountIndex, payload.options, payload.config)
    return { fee: transfer.fee.toString() }
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onGetTransactionReceipt(async payload => {
  try {
    const receipt = await wdk.getTransactionReceipt(payload.network, payload.accountIndex, payload.hash)
    if (receipt) {
      return { receipt: JSON.stringify(receipt) }
    }
    return {}
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onGetApproveTransaction(async payload => {
  try {
    payload.amount = Number(payload.amount)
    const approveTx = await wdk.getApproveTransaction(payload)
    if (approveTx) {
      approveTx.value = approveTx.value.toString()
      return approveTx
    }
    return {}
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})

rpc.onDispose(() => {
  try {
    wdk.dispose()
    wdk = null
  } catch (error) {
    throw new Error(rpcException.stringifyError(error))
  }
})
