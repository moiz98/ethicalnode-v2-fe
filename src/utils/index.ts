import { chains as cosmosChains } from 'chain-registry';
import { calculateAPR } from './aprCalculator';

/**
 * Get staking denomination for a specific chain
 */
function getStakingDenom(chainId: string): string {
  const denomMap: Record<string, string> = {
    'cosmoshub-4': 'uatom',
    'osmosis-1': 'uosmo',
    'juno-1': 'ujuno',
    'secret-4': 'uscrt',
  };
  return denomMap[chainId] || 'uatom';
}

/**
 * Fetches chain and validator data, calculates APR, commission, and voting power.
 * @param validatorAddress - Cosmos validator address (valoper)
 * @param chainId - Chain ID (e.g., 'cosmoshub-4')
 * @returns Formatted chain and validator info
 */
export async function getValidatorSummary(validatorAddress: string, chainId: string) {
  // Find chain data from registry
  const chain = cosmosChains.find(c => c.chainId === chainId);
  if (!chain) throw new Error('Chain not found');

  const stakingDenom = getStakingDenom(chainId);
  const restEndpoint = chain.apis?.rest?.[0]?.address;
  if (!restEndpoint) throw new Error('No REST endpoint for chain');

  // Fetch validator info
  const validatorData = await fetch(`${restEndpoint}/cosmos/staking/v1beta1/validators/${validatorAddress}`)
    .then(r => r.json());
  const validatorName = validatorData?.validator?.description?.moniker || '';
  const commission = (parseFloat(validatorData?.validator?.commission?.commission_rates?.rate) * 100).toFixed(2) + '%';

  // Voting power calculation
  const bondedTokens = parseInt(validatorData?.validator?.tokens);
  const poolData = await fetch(`${restEndpoint}/cosmos/staking/v1beta1/pool`).then(r => r.json());
  const totalBonded = parseInt(poolData?.pool?.bonded_tokens);
  const votingPower = totalBonded > 0 ? ((bondedTokens / totalBonded) * 100).toFixed(4) + '%' : '0%';

  // APR calculation
  const aprResult = await calculateAPR(restEndpoint, validatorAddress, stakingDenom);
  const APR = aprResult ? aprResult.apr.toFixed(2) + '%' : 'N/A';

  // Format result
  return {
    chain_name: chain.chainName,
    chain_type: chain.chainType || 'cosmos',
    chain_id: chain.chainId,
    website: chain.website,
    pretty_name: chain.prettyName,
    bech32_prefix: chain.bech32Prefix,
    symbol: chain.staking?.stakingTokens?.[0]?.denom?.toUpperCase() || 'ATOM',
    validatorAddress,
    validatorName,
    APR,
    votingPower,
    commission,
  };
}
