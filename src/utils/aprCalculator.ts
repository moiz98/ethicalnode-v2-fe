/**
 * Utility functions for calculating APR (Annual Percentage Rate) for Cosmos SDK chains
 * 
 * This module provides consistent APR calculation across all Cosmos-based chains
 * by fetching real-time blockchain data and applying the enhanced formula:
 * 
 * APR = (inflation * (1 - community_tax) / bonded_ratio) * (1 - validator_commission)
 * 
 * The calculation accounts for:
 * - Chain inflation rate from mint module
 * - Total supply and bonded tokens for accurate bonded ratio
 * - Community pool tax from distribution parameters
 * - Validator-specific commission rate
 */

export interface APRCalculationResult {
  apr: number;
  inflation: number;
  bondedRatio: number;
  communityTax: number;
  validatorCommission: number;
  totalSupply: number;
  bondedTokens: number;
  isEstimated: boolean;
  error?: string;
}

export interface ChainParameters {
  inflation: number;
  bondedRatio: number;
  communityTax: number;
  validatorCommission: number;
  totalSupply?: number;
  bondedTokens?: number;
}

/**
 * Calculate APR for a Cosmos SDK chain using enhanced real-time blockchain data
 * This function implements the formula from your shell script:
 * APR = (inflation * (1 - community_tax) / bonded_ratio) * (1 - validator_commission)
 * 
 * @param restEndpoint - REST API endpoint for the chain
 * @param validatorAddress - Validator operator address (e.g., cosmosvaloper1...)
 * @param stakingDenom - Staking denomination (default: 'uatom' for Cosmos Hub)
 * @param maxAPR - Maximum APR to cap the result (default: 50%)
 * @param fallbackParams - Fallback parameters if API calls fail
 * @returns Promise<APRCalculationResult>
 */
export async function calculateValidatorAPR(
  restEndpoint: string,
  validatorAddress: string,
  stakingDenom: string = 'uatom',
  maxAPR: number = 50,
  fallbackParams?: Partial<ChainParameters>
): Promise<APRCalculationResult> {
  const defaultParams: ChainParameters = {
    inflation: fallbackParams?.inflation ?? 0.10, // Default 10% inflation
    bondedRatio: fallbackParams?.bondedRatio ?? 0.67, // Default 67% bonded ratio
    communityTax: fallbackParams?.communityTax ?? 0.02, // Default 2% community tax
    validatorCommission: fallbackParams?.validatorCommission ?? 0.05, // Default 5% validator commission
    totalSupply: fallbackParams?.totalSupply ?? 0,
    bondedTokens: fallbackParams?.bondedTokens ?? 0,
  };

  const result: APRCalculationResult = {
    apr: 0,
    inflation: defaultParams.inflation,
    bondedRatio: defaultParams.bondedRatio,
    communityTax: defaultParams.communityTax,
    validatorCommission: defaultParams.validatorCommission,
    totalSupply: defaultParams.totalSupply ?? 0,
    bondedTokens: defaultParams.bondedTokens ?? 0,
    isEstimated: false,
  };

  try {
    // Fetch all required data in parallel for better performance
    const [inflationResponse, poolResponse, distributionResponse, supplyResponse, validatorResponse] = await Promise.allSettled([
      fetch(`${restEndpoint}/cosmos/mint/v1beta1/inflation`, {
        signal: AbortSignal.timeout(5000)
      }),
      fetch(`${restEndpoint}/cosmos/staking/v1beta1/pool`, {
        signal: AbortSignal.timeout(5000)
      }),
      fetch(`${restEndpoint}/cosmos/distribution/v1beta1/params`, {
        signal: AbortSignal.timeout(5000)
      }),
      fetch(`${restEndpoint}/cosmos/bank/v1beta1/supply/by_denom?denom=${stakingDenom}`, {
        signal: AbortSignal.timeout(5000)
      }),
      fetch(`${restEndpoint}/cosmos/staking/v1beta1/validators/${validatorAddress}`, {
        signal: AbortSignal.timeout(5000)
      })
    ]);

    // Process inflation data
    if (inflationResponse.status === 'fulfilled' && inflationResponse.value.ok) {
      try {
        const inflationData = await inflationResponse.value.json();
        const fetchedInflation = parseFloat(inflationData.inflation);
        if (!isNaN(fetchedInflation) && fetchedInflation > 0) {
          result.inflation = fetchedInflation;
        }
      } catch (error) {
        console.warn('Failed to parse inflation data:', error);
      }
    }

    // Process staking pool data (bonded tokens)
    if (poolResponse.status === 'fulfilled' && poolResponse.value.ok) {
      try {
        const poolData = await poolResponse.value.json();
        const bondedTokens = parseInt(poolData.pool.bonded_tokens);
        
        if (!isNaN(bondedTokens) && bondedTokens > 0) {
          result.bondedTokens = bondedTokens;
        }
      } catch (error) {
        console.warn('Failed to parse staking pool data:', error);
      }
    }

    // Process distribution parameters
    if (distributionResponse.status === 'fulfilled' && distributionResponse.value.ok) {
      try {
        const distributionData = await distributionResponse.value.json();
        const fetchedCommunityTax = parseFloat(distributionData.params.community_tax);
        if (!isNaN(fetchedCommunityTax) && fetchedCommunityTax >= 0) {
          result.communityTax = fetchedCommunityTax;
        }
      } catch (error) {
        console.warn('Failed to parse distribution parameters:', error);
      }
    }

    // Process total supply data
    if (supplyResponse.status === 'fulfilled' && supplyResponse.value.ok) {
      try {
        const supplyData = await supplyResponse.value.json();
        const totalSupply = parseInt(supplyData.amount.amount);
        if (!isNaN(totalSupply) && totalSupply > 0) {
          result.totalSupply = totalSupply;
        }
      } catch (error) {
        console.warn('Failed to parse supply data:', error);
      }
    }

    // Process validator commission data
    if (validatorResponse.status === 'fulfilled' && validatorResponse.value.ok) {
      try {
        const validatorData = await validatorResponse.value.json();
        const commission = parseFloat(validatorData.validator.commission.commission_rates.rate);
        if (!isNaN(commission) && commission >= 0) {
          result.validatorCommission = commission;
        }
      } catch (error) {
        console.warn('Failed to parse validator commission data:', error);
      }
    }

    // Calculate bonded ratio using total supply and bonded tokens
    if (result.totalSupply > 0 && result.bondedTokens > 0) {
      result.bondedRatio = result.bondedTokens / result.totalSupply;
    }

    // Calculate APR using the enhanced formula:
    // APR = (inflation * (1 - community_tax) / bonded_ratio) * (1 - validator_commission)
    const netInflation = result.inflation * (1 - result.communityTax);
    const grossAPR = netInflation / result.bondedRatio;
    const netAPR = grossAPR * (1 - result.validatorCommission);
    
    // Apply maximum APR cap and convert to percentage
    result.apr = Math.min(netAPR * 100, maxAPR);
    
    // Check if we had to use any fallback values
    result.isEstimated = (
      result.inflation === defaultParams.inflation ||
      result.bondedRatio === defaultParams.bondedRatio ||
      result.communityTax === defaultParams.communityTax ||
      result.validatorCommission === defaultParams.validatorCommission ||
      result.totalSupply === defaultParams.totalSupply ||
      result.bondedTokens === defaultParams.bondedTokens
    );

    console.log(`Enhanced APR Calculation [${validatorAddress}]: inflation=${(result.inflation * 100).toFixed(2)}%, bondedRatio=${(result.bondedRatio * 100).toFixed(2)}%, communityTax=${(result.communityTax * 100).toFixed(2)}%, validatorCommission=${(result.validatorCommission * 100).toFixed(2)}%, APR=${result.apr.toFixed(3)}%${result.isEstimated ? ' (estimated)' : ''}`);

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    result.isEstimated = true;
    
    // Fallback to default calculation
    const netInflation = result.inflation * (1 - result.communityTax);
    const grossAPR = netInflation / result.bondedRatio;
    const netAPR = grossAPR * (1 - result.validatorCommission);
    result.apr = Math.min(netAPR * 100, maxAPR);
    
    console.warn(`APR calculation failed for ${validatorAddress}, using defaults:`, error);
  }

  return result;
}

/**
 * Backward compatibility function - calculates APR without validator commission
 * This maintains the original functionality for general chain APR calculations
 * 
 * @param restEndpoint - REST API endpoint for the chain
 * @param stakingDenom - Staking denomination (default: 'uatom')
 * @param maxAPR - Maximum APR to cap the result (default: 25%)
 * @param fallbackParams - Fallback parameters if API calls fail
 * @returns Promise<APRCalculationResult>
 */
export async function calculateCosmosAPR(
  restEndpoint: string,
  stakingDenom: string = 'uatom',
  maxAPR: number = 25,
  fallbackParams?: Partial<ChainParameters>
): Promise<APRCalculationResult> {
  // Use a dummy validator address to get general chain APR (without validator commission)
  // We'll set validator commission to 0 for general chain calculations
  const params = {
    ...fallbackParams,
    validatorCommission: 0 // No validator commission for general chain APR
  };
  
  return calculateValidatorAPR(restEndpoint, '', stakingDenom, maxAPR, params);
}

/**
 * Calculate APR for multiple chains in parallel
 * 
 * @param endpoints - Array of REST endpoints
 * @param stakingDenoms - Array of staking denominations (optional, defaults to 'uatom')
 * @param maxAPR - Maximum APR to cap results
 * @returns Promise<APRCalculationResult[]>
 */
export async function calculateMultiChainAPR(
  endpoints: string[],
  stakingDenoms?: string[],
  maxAPR: number = 25
): Promise<APRCalculationResult[]> {
  const calculations = endpoints.map((endpoint, index) => {
    const denom = stakingDenoms?.[index] || 'uatom';
    return calculateCosmosAPR(endpoint, denom, maxAPR);
  });
  
  return Promise.all(calculations);
}

/**
 * Get a simple APR value for quick calculations
 * Returns just the APR number, using defaults if calculation fails
 * 
 * @param restEndpoint - REST API endpoint for the chain
 * @param stakingDenom - Staking denomination (default: 'uatom')
 * @returns Promise<number> - APR as percentage (e.g., 14.5 for 14.5%)
 */
export async function getSimpleAPR(restEndpoint: string, stakingDenom: string = 'uatom'): Promise<number> {
  try {
    const result = await calculateCosmosAPR(restEndpoint, stakingDenom);
    return result.apr;
  } catch (error) {
    console.warn(`Failed to calculate APR for ${restEndpoint}, using default:`, error);
    return 12; // Default 12% APR
  }
}

/**
 * Validate if an endpoint supports Cosmos SDK APIs
 * 
 * @param restEndpoint - REST API endpoint to validate
 * @returns Promise<boolean>
 */
export async function validateCosmosEndpoint(restEndpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${restEndpoint}/cosmos/staking/v1beta1/params`, {
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Chain-specific APR calculation presets
 * These can be used for chains with known characteristics
 */
export const CHAIN_PRESETS: Record<string, Partial<ChainParameters>> = {
  // Cosmos Hub
  'cosmoshub-4': {
    inflation: 0.10,
    bondedRatio: 0.67,
    communityTax: 0.02,
    validatorCommission: 0.05,
  },
  
  // Osmosis
  'osmosis-1': {
    inflation: 0.25,
    bondedRatio: 0.60,
    communityTax: 0.00,
    validatorCommission: 0.05,
  },
  
  // Juno
  'juno-1': {
    inflation: 0.10,
    bondedRatio: 0.65,
    communityTax: 0.02,
    validatorCommission: 0.05,
  },
  
  // Secret Network
  'secret-4': {
    inflation: 0.15,
    bondedRatio: 0.55,
    communityTax: 0.02,
    validatorCommission: 0.05,
  },
  
  // Default fallback for unknown chains
  'default': {
    inflation: 0.10,
    bondedRatio: 0.67,
    communityTax: 0.02,
    validatorCommission: 0.05,
  },
};

/**
 * Get APR using chain-specific presets as fallback
 * 
 * @param restEndpoint - REST API endpoint
 * @param chainId - Chain identifier for preset lookup
 * @param stakingDenom - Staking denomination (default: 'uatom')
 * @returns Promise<APRCalculationResult>
 */
export async function calculateAPRWithPresets(
  restEndpoint: string,
  chainId: string,
  stakingDenom: string = 'uatom'
): Promise<APRCalculationResult> {
  const preset = CHAIN_PRESETS[chainId] || CHAIN_PRESETS['default'];
  return calculateCosmosAPR(restEndpoint, stakingDenom, 25, preset);
}

/**
 * Get staking denomination for a specific chain
 * 
 * @param chainId - Chain identifier
 * @returns string - Staking denomination
 */
export function getStakingDenom(chainId: string): string {
  const denomMap: Record<string, string> = {
    'cosmoshub-4': 'uatom',
    'osmosis-1': 'uosmo',
    'juno-1': 'ujuno',
    'secret-4': 'uscrt',
    'akashnet-2': 'uakt',
    'stride-1': 'ustrd',
    'kaiyo-1': 'ukuji',
    'carbon-1': 'swth',
  };
  
  return denomMap[chainId] || 'uatom'; // Default to uatom
}
