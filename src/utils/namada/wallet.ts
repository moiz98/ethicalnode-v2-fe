// Restore SDK import
import { NamadaSDKIntegration } from './sdk';
import { NamadaTxResult } from './types';

/**
 * Wallet manager for Namada chain using Namada wallet extension
 */
export class NamadaWalletManager {
  private connected: boolean = false;
  private address: string = '';
  private publicKey: string = '';
  private chainId: string = '';
  private sdkIntegration: NamadaSDKIntegration | null = null;

  async checkNamadaWallet(): Promise<boolean> {
    if (!window.namada) {
      console.log('Namada wallet not detected');
      return false;
    }
    
    console.log('Namada wallet detected');
    return true;
  }

  async connect(chainId: string, rpcUrl?: string): Promise<boolean> {
    if (!await this.checkNamadaWallet()) return false;

    try {
      this.chainId = chainId;
      console.log('Connecting to Namada with chain ID:', chainId);
      
      // Connect to Namada wallet - different wallets have different APIs
      let address = '';
      
      // IMPORTANT: Call connect() first - this makes other methods available
      // The Namada extension v0.8.1 requires calling connect() first
      // After connect(), other methods like accounts() become available
      if (typeof window.namada!.connect === 'function') {
        try {
          await window.namada!.connect(chainId);
        } catch (e) {
          // Try without chainId if it fails
          try {
            await window.namada!.connect();
          } catch (e2) {
            console.error('Connect failed:', e2);
          }
        }
      }
      
      // Small delay to ensure methods are injected
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get accounts - the method should be available after connect()
      const accountsMethod = window.namada?.accounts;
      
      if (typeof accountsMethod === 'function') {
        try {
          const accounts = await accountsMethod();
          
          console.log('Available accounts:', accounts);
          
          // Find the transparent (non-shielded) account
          // The transparent account has type "mnemonic" and address starts with "tnam"
          let transparentAccount = accounts.find((acc: any) => 
            acc.type === 'mnemonic' || 
            acc.type === 'transparent' ||
            (acc.address && acc.address.startsWith('tnam') && !acc.address.startsWith('znam'))
          );
          
          if (!transparentAccount) {
            // If no transparent account found, use the first one that starts with tnam
            transparentAccount = accounts.find((acc: any) => 
              acc.address && acc.address.startsWith('tnam')
            );
          }
          
          if (!transparentAccount && accounts.length > 0) {
            console.log('No transparent account found, using first account');
            transparentAccount = accounts[0];
          }
          
          if (transparentAccount) {
            address = transparentAccount.address || '';
            // Store the public key for later use
            this.publicKey = transparentAccount.publicKey || '';
          }
        } catch (e) {
          console.log('Error calling accounts():', e);
        }
      } else {
        console.log('accounts is not a function after connect');
      }
      
      if (!address) {
        console.error('Could not get Namada address - wallet API not recognized');
        console.log('Available methods on window.namada:', Object.keys(window.namada || {}));
        return false;
      }
      
      this.address = address;
      console.log(`Connected to Namada wallet: ${address}`);
      
      // Only initialize SDK if RPC URL is provided and we actually need it for transactions
      // For balance fetching, we'll use the backend API instead
      if (rpcUrl) {
        console.log('RPC URL provided, but SDK initialization skipped for balance-only operations');
        console.log('SDK will be initialized on-demand for transactions');
      }
      
      this.connected = true;
      return true;
    } catch (error) {
      console.error('Namada connection error:', error);
      return false;
    }
  }

  disconnect(): void {
    this.connected = false;
    this.address = '';
    this.chainId = '';
    this.sdkIntegration = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getAddress(): string {
    return this.address;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Get account balance using backend API instead of direct RPC
   */
  async getBalance(_rpcUrl?: string): Promise<string> {
    if (!this.connected) {
      console.log('Namada wallet not connected');
      return '0';
    }

    try {
      console.log('Fetching Namada balance from backend API...');
      console.log('Wallet address:', this.address);

      // Call backend API for Namada balance
      const response = await fetch(`http://localhost:3000/api/investors/getNamadaBalance/${this.address}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Namada backend API response:', result);
        
        if (result.success && result.data?.balance) {
          const balance = result.data.balance.amount;
          // Convert from namnam to NAM (1 NAM = 1,000,000 namnam)
          const displayBalance = (parseFloat(balance) / 1000000).toFixed(6);
          console.log('Namada balance found:', displayBalance, 'NAM');
          return displayBalance;
        } else {
          console.warn('No balance data in backend response');
          return '0';
        }
      } else {
        console.error('Backend API response not ok:', response.status);
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        return '0';
      }
    } catch (error) {
      console.error('Error fetching Namada balance from backend:', error);
      return '0';
    }
  }

  /**
   * Delegate (stake) tokens to a validator with transaction recording
   */
  async delegate(
    validatorAddress: string,
    amount: string,
    rpcUrl: string,
    memo: string = ''
  ): Promise<NamadaTxResult> {
    if (!this.connected || !window.namada) {
      throw new Error('Namada wallet not connected');
    }

    // Initialize SDK lazily if not already initialized
    if (!this.sdkIntegration) {
      try {
        console.log('Initializing Namada SDK for transaction...');
        this.sdkIntegration = new NamadaSDKIntegration(rpcUrl, this.chainId);
        await this.sdkIntegration.init();
        console.log('Namada SDK initialized for transaction');
      } catch (error: any) {
        console.error('Failed to initialize SDK:', error);
        
        // Provide a simple error message
        throw new Error('Namada SDK initialization failed. This could be due to network issues or missing dependencies. Please try again or contact support.');
      }
    }

    if (!this.sdkIntegration) {
      throw new Error('SDK not available for transaction building');
    }

    console.log('Namada Delegate params:', { validatorAddress, amount, memo });
    
    try {
      // Check balance before transaction
      const balanceBefore = await this.sdkIntegration.getBalance(this.address);
      console.log('Balance before transaction:', balanceBefore, 'namnam');
      
      // Convert amount from smallest denomination to NAM
      // The SDK might expect amounts in NAM, not namnam
      // 1 NAM = 1,000,000 namnam
      const amountInNam = (parseFloat(amount) / 1000000).toString();
      console.log('Converting amount:', amount, 'namnam to', amountInNam, 'NAM');
      
      // Build the bond transaction using the SDK
      const txs = await this.sdkIntegration.buildBondTx(
        this.address,
        validatorAddress,
        amountInNam, // Pass amount in NAM units
        this.publicKey,
        memo
      );
      
      console.log('Number of transactions to sign:', txs.length);
      if (txs.length > 1) {
        console.log('Multiple transactions detected - likely includes RevealPK');
      }
      
      console.log('Built transactions:', txs);
      
      // Sign the transactions
      const signedTxs = await this.sdkIntegration.signTxs(txs, this.address);
      console.log('Signed transactions:', signedTxs);
      
      // Broadcast the first signed transaction
      // If there are multiple (e.g., RevealPK + Bond), we need to broadcast them in order
      let finalResult = null;
      let revealPkSucceeded = false;
      
      for (let i = 0; i < signedTxs.length; i++) {
        const txType = i === 0 && txs.length > 1 ? 'RevealPK' : 'Bond';
        console.log(`Broadcasting ${txType} transaction ${i + 1} of ${signedTxs.length}...`);
        const result = await this.sdkIntegration.broadcastTx(signedTxs[i]);
        console.log(`${txType} transaction ${i + 1} result:`, result);
        
        // Check balance after each transaction
        const balanceAfter = await this.sdkIntegration.getBalance(this.address);
        console.log(`Balance after ${txType} transaction:`, balanceAfter, 'namnam');
        
        // Track if RevealPK succeeded
        if (i === 0 && txs.length > 1 && (!result.code || result.code === 0)) {
          revealPkSucceeded = true;
          console.log('RevealPK transaction succeeded - fees deducted');
        }
        
        // Check for failure - code 0 is success, anything else is failure
        // Also check if code is undefined (which might mean success in some cases)
        if (result.code && result.code !== 0) {
          console.error(`${txType} transaction failed with code:`, result.code, 'Log:', result.log);
          
          if (revealPkSucceeded) {
            console.warn('RevealPK succeeded but Bond failed - fees were already deducted for RevealPK');
          }
          
          throw new Error(`Transaction failed: ${result.log || 'Transaction was rejected'}`);
        }
        
        finalResult = result;
      }
      
      if (!finalResult) {
        throw new Error('No transaction result');
      }
      
      console.log('Final transaction result:', finalResult);
      
      return {
        hash: finalResult.hash || '',
        height: finalResult.height || 0,
        code: finalResult.code || 0,
        log: finalResult.log || 'Success'
      };
    } catch (error: any) {
      console.error('Namada delegation error:', error);
      throw error;
    }
  }

  /**
   * Get staking data (bonds, unbonds, etc.)
   */
  async getStakingData(rpcUrl?: string): Promise<any> {
    if (!this.connected) {
      console.log('Namada wallet not connected');
      return null;
    }

    // Initialize SDK if not already initialized
    if (!this.sdkIntegration && rpcUrl) {
      try {
        console.log('Initializing SDK for staking data fetch...');
        this.sdkIntegration = new NamadaSDKIntegration(rpcUrl, this.chainId);
        await this.sdkIntegration.init();
      } catch (error) {
        console.error('Failed to initialize SDK for staking data:', error);
        return null;
      }
    }

    if (!this.sdkIntegration) {
      console.log('SDK not available');
      return null;
    }

    try {
      const [positions, totalBonds] = await Promise.all([
        this.sdkIntegration.getStakingPositions(this.address),
        this.sdkIntegration.getTotalBonds(this.address)
      ]);
      
      console.log('Staking data fetched:', { positions, totalBonds });
      
      // Convert totalBonds from smallest denomination to NAM
      const totalBondsInNam = totalBonds ? (parseFloat(totalBonds) / 1000000).toFixed(2) : '0';
      
      return {
        positions,
        totalBonds: totalBondsInNam
      };
    } catch (error) {
      console.error('Error fetching staking data:', error);
      return null;
    }
  }
}

export default NamadaWalletManager;
