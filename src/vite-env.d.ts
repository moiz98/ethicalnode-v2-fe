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
    getOfflineSigner(chainId: string): any;
    getAllBalances(chainId: string, address: string): Promise<any[]>;
    getBalance(chainId: string, address: string, denom: string): Promise<any>;
  };
  namada?: {
    accounts(): Promise<Array<{ address: string; alias?: string }>>;
    sign(tx: any): Promise<any>;
    connect(): Promise<void>;
    isConnected(): Promise<boolean>;
    enable?(): Promise<void>;
  };
}
