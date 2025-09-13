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
    getOfflineSigner(chainId: string): {
      getAccounts(): Promise<Array<{
        address: string;
        algo: string;
        pubkey: Uint8Array;
      }>>;
      signAmino(signerAddress: string, signDoc: {
        chain_id: string;
        account_number: string;
        sequence: string;
        fee: {
          gas: string;
          amount: Array<{ denom: string; amount: string }>;
        };
        msgs: any[];
        memo: string;
      }): Promise<{
        signed: any;
        signature: {
          pub_key: any;
          signature: string;
        };
      }>;
    };
    getAllBalances(chainId: string, address: string): Promise<any[]>;
    getBalance(chainId: string, address: string, denom: string): Promise<any>;
    sendTx(chainId: string, tx: {
      msgs: any[];
      fee: {
        gas: string;
        amount: Array<{ denom: string; amount: string }>;
      };
      memo: string;
    }, mode: string): Promise<Uint8Array>;
  };
  namada?: {
    accounts(): Promise<Array<{ address: string; alias?: string }>>;
    sign(tx: any): Promise<any>;
    connect(): Promise<void>;
    isConnected(): Promise<boolean>;
    enable?(): Promise<void>;
  };
}
