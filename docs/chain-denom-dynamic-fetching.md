# Updated Chain Denomination Fetching

## Changes Made

### 1. Import Update
- **Before**: `import { chains as cosmosChains, assets as cosmosAssetLists } from 'chain-registry'`
- **After**: `import { chains as cosmosChains, assetLists } from 'chain-registry'`

### 2. Asset List Lookup
Updated the `fetchEnabledChains` function to use the same pattern as the Networks component:

```typescript
// Find asset info from assetLists using chainName (similar to Networks component)
const assetList = assetLists.find(asset => asset.chainName === validator.chainName);

// Get the base denomination from asset list - use the first (native) asset
let denom = 'unknown';
let decimals = 6;

if (assetList?.assets && assetList.assets.length > 0) {
  const nativeAsset = assetList.assets[0]; // First asset is typically the native token
  denom = nativeAsset.base;
  
  // Find the display denomination unit to get decimals
  const displayUnit = nativeAsset.denomUnits?.find(unit => unit.denom === nativeAsset.display);
  decimals = displayUnit?.exponent || 6;
}
```

### 3. Key Improvements
- **Dynamic denomination fetching**: No more hardcoded `chainDenoms` mapping
- **Consistent with Networks component**: Uses the same `assetLists.find()` pattern
- **Native asset selection**: Uses the first asset (typically native token) from the asset list
- **Proper decimal handling**: Gets exponent from the display denomination unit
- **Fallback mechanism**: Defaults to 'unknown' denom and 6 decimals if not found

### 4. How It Works
1. **Validator lookup**: Gets chainName from validator record
2. **Asset list match**: Finds corresponding asset list using `chainName`
3. **Native asset**: Takes first asset from the list (native token)
4. **Base denomination**: Uses `nativeAsset.base` for the denomination
5. **Decimals**: Gets exponent from display unit or defaults to 6

### 5. Benefits
- **Automatic updates**: New chains get proper denominations automatically
- **Accurate data**: Uses official chain-registry asset information
- **Consistent approach**: Matches the pattern used in Networks component
- **No maintenance**: No need to maintain hardcoded denomination mappings

## Example Output
For Cosmos Hub (`chainName: "cosmoshub"`):
- **Asset List**: Found in chain-registry
- **Native Asset**: First asset in the list
- **Base Denom**: `"uatom"`
- **Decimals**: `6` (from display unit exponent)

The implementation now dynamically fetches denominations from the official chain-registry package, ensuring accuracy and consistency across the application.
