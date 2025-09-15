// Namada SDK types and interfaces
export interface NamadaTxResult {
  hash?: string;
  height?: number;
  code?: number;
  log?: string;
}

export interface NamadaTransaction {
  txHash: string;
  userPublicAddress: string;
  chainId: string;
  chainName: string;
  type: 'delegate';
  amount: string;
  tokenSymbol: string;
  tokenDenom: string;
  validatorAddress: string;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  rawTx?: any;
}
