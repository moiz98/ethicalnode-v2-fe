/**
 * Namada SDK Integration
 * Handles transaction building and signing using the official Namada SDK
 */

// Import Buffer polyfill first
import { Buffer } from 'buffer'

// Ensure Buffer is available globally before importing Namada SDK
if (typeof (globalThis as any).Buffer === 'undefined') {
  ;(globalThis as any).Buffer = Buffer
}

// Use the inline import for Vite to avoid WebAssembly loading issues
import { initSdk, getNativeToken } from '@namada/sdk/inline'
import BigNumber from 'bignumber.js'
import { NamadaTxResult } from './types'

// Import transaction types from SDK
interface BondProps {
  source: string;
  validator: string;
  amount: BigNumber;
  nativeToken: string;
}

interface UnbondProps {
  source: string;
  validator: string;
  amount: BigNumber;
}

interface WithdrawProps {
  source: string;
  validator: string;
}

interface WrapperTxProps {
  token: string;
  feeAmount: BigNumber;
  gasLimit: BigNumber;
  chainId: string;
  publicKey: string;
  memo?: string;
}

// Re-export TxProps type
type TxProps = any; // SDK's actual transaction type

// Namada token address on mainnet
const NAM_TOKEN_ADDRESS = 'tnam1q9gr66cvu4hrzm0sd5kmlnjje82gs3xlfg3v6nu7';

export class NamadaSDKIntegration {
  private sdk: any | null = null;
  private rpcUrl: string;
  private chainId: string;
  
  constructor(rpcUrl: string, chainId: string) {
    this.rpcUrl = rpcUrl;
    this.chainId = chainId;
  }

  /**
   * Initialize the SDK
   */
  async init(): Promise<void> {
    if (!this.sdk) {
      // Get native token from the node
      let nativeToken = NAM_TOKEN_ADDRESS;
      try {
        nativeToken = await getNativeToken(this.rpcUrl);
      } catch (error) {
        // Use default if fetching fails
      }
      
      // Initialize the SDK with correct props
      this.sdk = await initSdk({
        rpcUrl: this.rpcUrl,
        token: nativeToken,
      });
    }
  }

  /**
   * Check if public key is revealed for an address
   */
  async isPublicKeyRevealed(address: string): Promise<boolean> {
    if (!this.sdk) await this.init();
    try {
      // Try to query the public key
      const pk = await this.sdk!.rpc.queryPublicKey(address);
      return !!pk;
    } catch (error) {
      return false;
    }
  }

  /**
   * Build wrapper transaction properties
   */
  private getWrapperTxProps(
    publicKey: string,
    gasLimit: string = '150000',
    memo?: string
  ): WrapperTxProps {
    return {
      token: NAM_TOKEN_ADDRESS,
      // IMPORTANT: feeAmount is fee per gas unit, NOT total fee!
      // 0.000001 NAM per gas unit × 150000 gas = 0.15 NAM total fee
      feeAmount: new BigNumber('0.000001'),
      gasLimit: new BigNumber(gasLimit),
      chainId: this.chainId,
      publicKey,
      memo,
    };
  }

  /**
   * Build a bond (staking) transaction
   */
  async buildBondTx(
    source: string,
    validator: string,
    amount: string,
    publicKey: string,
    memo?: string
  ): Promise<TxProps[]> {
    if (!this.sdk) await this.init();
    
    // First check the actual balance
    await this.getBalance(source);
    
    const txs: TxProps[] = [];
    const wrapperTxProps = this.getWrapperTxProps(publicKey, '150000', memo);
    
    // Check if we need to reveal public key
    const isRevealed = await this.isPublicKeyRevealed(source);
    if (!isRevealed) {
      const revealPkTx = await this.sdk!.tx.buildRevealPk(wrapperTxProps);
      txs.push(revealPkTx);
    }
    
    // Build bond transaction
    // Amount should be in NAM units, not smallest denomination
    const bondProps: BondProps = {
      source,
      validator,
      amount: new BigNumber(amount), // Amount in NAM units
      nativeToken: NAM_TOKEN_ADDRESS,
    };
    
    const bondTx = await this.sdk!.tx.buildBond(wrapperTxProps, bondProps);
    txs.push(bondTx);
    
    return txs;
  }

  /**
   * Build an unbond (unstaking) transaction
   */
  async buildUnbondTx(
    source: string,
    validator: string,
    amount: string,
    publicKey: string,
    memo?: string
  ): Promise<TxProps[]> {
    if (!this.sdk) await this.init();
    
    const wrapperTxProps = this.getWrapperTxProps(publicKey, '150000', memo);
    
    const unbondProps: UnbondProps = {
      source,
      validator,
      amount: new BigNumber(amount),
    };
    
    const unbondTx = await this.sdk!.tx.buildUnbond(wrapperTxProps, unbondProps);
    
    return [unbondTx];
  }

  /**
   * Build a withdraw (claim rewards) transaction
   */
  async buildWithdrawTx(
    source: string,
    validator: string,
    publicKey: string,
    memo?: string
  ): Promise<TxProps[]> {
    if (!this.sdk) await this.init();
    
    const wrapperTxProps = this.getWrapperTxProps(publicKey, '150000', memo);
    
    const withdrawProps: WithdrawProps = {
      source,
      validator,
    };
    
    const withdrawTx = await this.sdk!.tx.buildWithdraw(wrapperTxProps, withdrawProps);
    
    return [withdrawTx];
  }

  /**
   * Sign transactions using the Namada extension
   */
  async signTxs(
    txs: TxProps[],
    owner: string
  ): Promise<Uint8Array[]> {
    const namada = (window as any).namada;
    if (!namada) {
      throw new Error('Namada extension not available');
    }

    const signer = namada.getSigner();
    if (!signer) {
      throw new Error('Namada signer not available');
    }

    try {
      // The signer expects the txs array format
      const signedTxs = await signer.sign(txs, owner);
      
      if (!signedTxs || signedTxs.length === 0) {
        throw new Error('No signatures returned');
      }
      
      return signedTxs;
    } catch (error: any) {
      console.error('Signing error:', error);
      throw error;
    }
  }

  /**
   * Broadcast signed transactions to the network
   */
  async broadcastTx(signedTx: Uint8Array): Promise<NamadaTxResult> {
    if (!this.sdk) await this.init();
    
    try {
      const response = await this.sdk!.rpc.broadcastTx(signedTx);
      
      console.log('Broadcast response:', response);
      return {
        hash: response.hash,
        height: Number(response.height),
        code: response.code,
        log: response.log,
      };
    } catch (error: any) {
      console.error('Broadcast error:', error);
      throw error;
    }
  }

  /**
   * Get staking positions (bonds, unbonds)
   */
  async getStakingPositions(owner: string): Promise<any> {
    if (!this.sdk) await this.init();
    
    try {
      const stakingPositions = await this.sdk!.rpc.queryStakingPositions([owner]);
      return stakingPositions;
    } catch (error) {
      console.error('Error fetching staking positions:', error);
      return null;
    }
  }

  /**
   * Get total bonds for an address
   */
  async getTotalBonds(owner: string): Promise<string> {
    if (!this.sdk) await this.init();
    
    try {
      const stakingTotals = await this.sdk!.rpc.queryStakingTotals([owner]);
      
      if (stakingTotals && stakingTotals.length > 0) {
        const total = stakingTotals[0];
        if (total && total.bonds) {
          return total.bonds.toString();
        }
      }
      return '0';
    } catch (error) {
      console.error('Error fetching total bonds:', error);
      return '0';
    }
  }

  /**
   * Get account balance
   */
  async getBalance(owner: string, token: string = NAM_TOKEN_ADDRESS): Promise<string> {
    if (!this.sdk) await this.init();
    
    try {
      const balances = await this.sdk!.rpc.queryBalance(owner, [token], this.chainId);
      
      // Balance type is: [string, string][]
      // It's an array of [token, amount] tuples
      if (Array.isArray(balances) && balances.length > 0) {
        const firstBalance = balances[0];
        if (Array.isArray(firstBalance) && firstBalance.length >= 2) {
          const [, amount] = firstBalance;
          return amount.toString();
        }
      }
      
      return '0';
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0';
    }
  }
}

export default NamadaSDKIntegration;
