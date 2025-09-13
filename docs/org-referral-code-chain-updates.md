# Organization Referral Code Management - Chain Bonus Updates

## Changes Implemented

### 1. Dynamic Chain Loading
- **Replaced hardcoded chain list** with dynamic fetching from validators API
- **Integrated chain-registry package** to get additional chain information like pretty names
- **Added fallback mechanism** with default chains if API fails

### 2. Automatic Chain Population
- **Removed "Add Chain" button** - chains are now auto-populated
- **Show all enabled chains** from active validators with default 0% bonus
- **Initialize form with all enabled chains** when creating/editing referral codes

### 3. Enhanced Validation
- **Bonus percentage validation**: Enforced 0-100% range with input validation
- **Auto-correction**: Values below 0 become 0, values above 100 become 100
- **Real-time validation** in updateChainBonus function

### 4. Improved UI/UX
- **Better layout**: Simplified 3-column grid (Chain, Bonus %, Active toggle)
- **Read-only chain names**: Chains are displayed as read-only fields
- **Denomination display**: Shows denomination info below each chain
- **Loading states**: Shows loading indicator while fetching chains
- **Scrollable list**: Added max height with scroll for many chains

### 5. Chain Data Integration
- **Validator API integration**: Fetches chains from `/admin/validators` endpoint
- **Chain registry lookup**: Uses chain-registry for additional chain metadata
- **Common denominations**: Predefined mapping for known chains with fallback

## Key Features

### Form Behavior
- **Create Mode**: Shows all enabled chains with 0% bonus by default
- **Edit Mode**: Merges existing bonuses with all enabled chains
- **Validation**: Prevents invalid percentage values (outside 0-100 range)

### Chain Information
- **Dynamic Loading**: Chains loaded from active validators
- **Registry Integration**: Pretty names from chain-registry when available
- **Denomination Mapping**: Common Cosmos ecosystem denominations included

### User Experience
- **Simplified Interface**: No more manual chain adding/removing
- **Clear Feedback**: Loading states and error handling
- **Responsive Design**: Works on mobile and desktop

## Technical Implementation

### New Interfaces
```typescript
interface ValidatorRecord {
  _id: string;
  chainId: string;
  chainName: string;
  prettyName: string;
  validatorAddress: string;
  defaultReferralReward: number;
  isActive: boolean;
  // ... other fields
}

interface EnabledChain {
  chainId: string;
  chainName: string;
  prettyName: string;
  denom: string;
  decimals?: number;
  isEnabled: boolean;
}
```

### Key Functions
- `fetchEnabledChains()`: Loads chains from validators API
- `resetForm()`: Initializes form with all enabled chains at 0%
- `openEditModal()`: Merges existing bonuses with all enabled chains
- `updateChainBonus()`: Updates bonus with validation (0-100%)

### API Integration
- **Endpoint**: `GET /admin/validators?limit=1000&active=true`
- **Fallback**: Default chains if API fails
- **Error Handling**: Graceful degradation with predefined chains

## Benefits

1. **Automatic Updates**: New validator chains appear automatically
2. **Consistent Experience**: All enabled chains always visible
3. **Better Validation**: Enforced percentage limits
4. **Improved Performance**: Single API call vs manual chain management
5. **Future-Proof**: Scales with new chain additions

## Files Modified

1. `src/pages/admin/OrgReferralCodeManagement.tsx`
   - Added chain-registry integration
   - Implemented dynamic chain loading
   - Updated form initialization logic
   - Enhanced validation with 0-100% limits
   - Redesigned chain bonuses UI section
