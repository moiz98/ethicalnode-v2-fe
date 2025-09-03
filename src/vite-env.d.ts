/// <reference types="vite/client" />

interface Window {
  keplr?: {
    enable(chainIds: string[]): Promise<void>;
    getKey(chainId: string): Promise<{
      name: string;
      algo: string;
      pubKey: Uint8Array;
      address: Uint8Array;
      bech32Address: string;
      isNanoLedger: boolean;
    }>;
  };
}
