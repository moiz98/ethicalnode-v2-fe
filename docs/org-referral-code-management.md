# Organization Referral Code Management - Frontend Implementation

## Overview
This document describes the new Organization Referral Code Management page implemented for the admin dashboard.

## Features Implemented

### 📊 **Dashboard View**
- **Comprehensive Table**: Display all organization referral codes with pagination
- **Search & Filter**: Search by code/organization name, filter by active/inactive status
- **Real-time Stats**: Usage statistics, expiration dates, and limits
- **Responsive Design**: Works on desktop and mobile devices

### ➕ **Create/Edit Functionality**
- **Add New Codes**: Create custom referral codes for partner organizations
- **Chain-Specific Bonuses**: Configure different bonus percentages for multiple blockchain networks
- **Flexible Limits**: Set expiration dates and maximum usage limits
- **Validation**: Form validation with error handling

### 👁️ **Detailed View**
- **Complete Information**: View all details about a referral code
- **Usage Analytics**: Total uses, last used date, and user information  
- **Chain Bonus Breakdown**: Detailed view of bonuses for each blockchain
- **Meta Information**: Creation/update timestamps and admin details

### 🔧 **Management Actions**
- **Toggle Status**: Activate/deactivate referral codes instantly
- **Edit Codes**: Update organization details, bonuses, and limits
- **Delete Codes**: Permanently remove codes with confirmation
- **Copy to Clipboard**: Easy copying of referral codes

## API Integration

The page integrates with the following API endpoints based on the provided documentation:

- `GET /api/admin/org-referral-codes` - List all codes with pagination and filters
- `POST /api/admin/org-referral-codes` - Create new referral code
- `PUT /api/admin/org-referral-codes/:id` - Update existing code
- `DELETE /api/admin/org-referral-codes/:id` - Delete code
- `PATCH /api/admin/org-referral-codes/:id/toggle-status` - Toggle active status

## Available Blockchain Networks

The interface supports the following blockchain networks for bonus configuration:

1. **Cosmos Hub** (`cosmoshub-4`) - Token: `uatom`
2. **Osmosis** (`osmosis-1`) - Token: `uosmo`  
3. **Akash Network** (`akashnet-2`) - Token: `uakt`
4. **Juno** (`juno-1`) - Token: `ujuno`
5. **Secret Network** (`secret-4`) - Token: `uscrt`

## Usage Instructions

### 🔐 **Access**
Navigate to `/admin/org-referral-codes` in the admin dashboard. The page requires:
- Admin authentication with JWT token
- `manage_org_referral_codes` permission (as per API documentation)

### 📝 **Creating a New Code**
1. Click "Add New Code" button
2. Enter unique referral code (3-20 characters, A-Z0-9_-)
3. Specify organization name
4. Add optional description
5. Configure chain bonuses (optional):
   - Select blockchain network
   - Set bonus percentage (0-100%)
   - Specify token denomination
6. Set limits (optional):
   - Expiration date
   - Maximum usage count

### ✏️ **Editing Existing Codes**
1. Click the edit icon for any code
2. Modify organization details, description, or limits
3. Update chain bonus configurations
4. Save changes

### 📊 **Viewing Details**
1. Click the eye icon to view comprehensive details
2. See usage statistics and analytics
3. View all configured chain bonuses
4. Check meta information (created by, dates, etc.)

### 🗑️ **Deleting Codes**
1. Click the delete icon
2. Confirm deletion in the modal
3. Codes with usage history show warning before deletion

## Technical Implementation

### 🏗️ **Architecture**
- **React + TypeScript**: Type-safe component development
- **Framer Motion**: Smooth animations and transitions
- **Responsive Design**: Tailwind CSS with dark mode support
- **State Management**: React hooks for local state
- **API Client**: Centralized `adminApiClient` with automatic token handling

### 🔒 **Security Features**
- **JWT Token Validation**: Automatic token refresh on expiration
- **Permission Checks**: Admin permissions validated by API
- **Input Validation**: Client-side form validation before API calls
- **Secure Copy**: Clipboard API for secure text copying

### 🎨 **UI/UX Features**
- **Dark Mode Support**: Automatic theme switching
- **Loading States**: Skeleton loading and progress indicators
- **Toast Notifications**: Success/error feedback for user actions
- **Copy to Clipboard**: Easy copying of referral codes and addresses
- **Pagination**: Efficient handling of large datasets
- **Search & Filter**: Real-time search with status filtering

## File Structure

```
src/pages/admin/OrgReferralCodeManagement.tsx  # Main component
src/App.tsx                                    # Route definition
src/layouts/AdminDashboardLayout.tsx          # Navigation item
```

## Testing

The page can be tested with mock data or by connecting to the backend API. All CRUD operations are implemented and ready for integration.

### Mock Data Example
```json
{
  "_id": "66e1234567890abcdef12345",
  "referralCode": "SAHAL2025",
  "organizationName": "Sahal Organization",
  "description": "Custom referral for Sahal partners",
  "chainBonuses": [
    {
      "chainId": "cosmoshub-4",
      "chainName": "Cosmos Hub",
      "bonusPercentage": 15,
      "denom": "uatom",
      "isActive": true
    }
  ],
  "usageStats": {
    "totalUses": 25,
    "lastUsedAt": "2025-09-12T15:30:00.000Z",
    "lastUsedBy": "cosmos1abc123..."
  },
  "isActive": true,
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "maxUses": 1000,
  "createdBy": "cosmos1admin123...",
  "createdAt": "2025-09-12T10:00:00.000Z",
  "updatedAt": "2025-09-12T10:00:00.000Z"
}
```

## Next Steps

1. **Backend Integration**: Connect to the actual API endpoints
2. **Testing**: Comprehensive testing with real data
3. **Performance Optimization**: Implement caching for frequently accessed data
4. **Additional Features**: Bulk operations, export functionality, advanced analytics

## Support

For any issues or questions about the Organization Referral Code Management page, please refer to the API documentation or contact the development team.
