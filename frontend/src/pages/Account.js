/**
 * Account Page - User Profile and Account Information
 *
 * User account management page displaying personal information (name, email, address)
 * and account metadata (account number, account type). Provides tabbed interface for
 * different information categories with loading/error states.
 *
 * Features:
 * - Tabbed Views:
 *   1. Personal Information: Name, username, email, DOB, address, country
 *   2. Account Information: Account number, account type
 * - Loading State: Skeleton placeholders while fetching data
 * - Error State: Alert with retry button on fetch failure
 * - Null Field Handling: Displays "N/A" for missing/null values
 *
 * Data Sources:
 * - /api/user/account: Fetches user profile via apiService.getUserAccount()
 *   • Returns UserAccountSchema from backend
 *   • Null fields valid (user may not have provided all info)
 *   • No authentication required (sandbox demo mode)
 *
 * State Management:
 * - currentTab: Active tab index (0=Personal, 1=Account)
 * - userData: User profile object from API response
 * - loading: Boolean for initial data fetch (skeleton state)
 * - error: Error message string for display in Alert component
 *
 * Data Formatting:
 * - Name: formatName() combines first_name and last_name, returns "N/A" if both null
 * - Date of Birth: formatDateOfBirth() parses ISO date string ("YYYY-MM-DD") to
 *   human-readable format ("December 1, 1998") using date-fns
 * - Address: formatAddress() builds multi-line array from address, city, state, zip_code,
 *   filtering out null/empty values, returns "N/A" if all parts missing
 * - Null Fields: All fields default to "N/A" if null/empty
 *
 * Loading State:
 * - Skeleton placeholders for:
 *   • Page header (2 text skeletons)
 *   • Tabs (rendered but non-interactive)
 *   • Content area (6 text skeletons in paper)
 * - Full container layout preserved during loading
 *
 * Error State:
 * - Alert component with severity="error" displays error message
 * - Retry button calls fetchUserAccount() to re-attempt fetch
 * - Error message from API (err.message) or fallback "Failed to load account data"
 *
 * Layout:
 * - Full width container (maxWidth="xl")
 * - Paper component (elevation=1) wraps tab content for visual separation
 * - Stack spacing={2} for consistent vertical rhythm in field list
 * - Responsive flex layout: column on mobile (xs), row on desktop (sm+)
 * - Label min width: 150px for consistent alignment
 *
 * Field Structure:
 * - Two-column layout: Label (left, secondary color) | Value (right, body text)
 * - Labels: subtitle2 variant, text.secondary color
 * - Values: body1 variant, default text color
 * - Mobile: Stacks vertically with reduced gap
 * - Desktop: Side-by-side with 2-unit gap
 *
 * Address Handling:
 * - Multi-line display: Each address part on separate line
 * - Filter logic: Only shows non-null parts
 * - Examples:
 *   • Full address: "123 Main St", "San Francisco", "CA", "94102" (4 lines)
 *   • Partial address: "San Francisco", "CA" (2 lines)
 *   • No address: "N/A" (single line)
 *
 * Date Formatting:
 * - Input: ISO 8601 date string ("YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SSZ")
 * - Output: "MMMM d, yyyy" (e.g., "December 1, 1998")
 * - Library: date-fns (parseISO, format)
 * - Error handling: Returns "N/A" on parse failure or null input
 *
 * Performance Considerations:
 * - Single API call on mount (useEffect with empty dependency array)
 * - No auto-refresh or polling (static data)
 * - Tab switching does not refetch data (same userData object)
 * - Manual retry available via error state button
 *
 * Navigation:
 * - Accessed via main app navigation (/account route)
 * - Read-only view (no edit functionality)
 *
 * Demo User Context:
 * - Backend returns first user (User.objects.first())
 * - No authentication/authorization (sandbox assumption)
 * - Same user across all sessions
 *
 * Related Components:
 * - apiService: Axios-based API client
 * - date-fns: Date formatting library
 *
 * Backend Integration:
 * - Endpoint: GET /api/user/account
 * - Schema: UserAccountSchema (see trading/schemas.py:UserAccountSchema)
 * - Error codes: 404 if no user found
 * - See trading/api.py:get_user_account for implementation
 *
 * Future Enhancements (Not Implemented):
 * - Edit mode for updating user information
 * - Profile picture upload
 * - Additional account settings (notifications, preferences)
 * - Password change functionality
 *
 * @component
 * @example
 * // Rendered by React Router at /account route
 * <Route path="/account" element={<Account />} />
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Stack,
  Skeleton,
  Alert,
  Button,
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import apiService from '../services/apiAxios';

const Account = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserAccount();
  }, []);

  const fetchUserAccount = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getUserAccount();
      setUserData(data);
    } catch (err) {
      setError(err.message || 'Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const formatDateOfBirth = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // Parse ISO date string and format as "December 1, 1998"
      const date = parseISO(dateString);
      return format(date, 'MMMM d, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const formatName = (firstName, lastName) => {
    if (!firstName && !lastName) return 'N/A';
    return `${firstName || ''} ${lastName || ''}`.trim();
  };

  const formatAddress = (address, city, state, zipCode) => {
    // Build multi-line address, filtering out null/empty values
    const parts = [address, city, state, zipCode].filter(part => part);
    if (parts.length === 0) return 'N/A';
    return parts;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, pb: 6 }}>
        <Box mb={4}>
          <Skeleton variant="text" width="200px" height={60} />
          <Skeleton variant="text" width="300px" />
        </Box>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Personal Information" />
          <Tab label="Account Information" />
        </Tabs>
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            {[...Array(6)].map((_, index) => (
              <Skeleton key={index} variant="text" height={40} />
            ))}
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, pb: 6 }}>
        <Box mb={4}>
          <Typography variant="h3" gutterBottom fontWeight={700}>
            Account
          </Typography>
        </Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchUserAccount}>
          Retry
        </Button>
      </Container>
    );
  }

  const addressParts = formatAddress(
    userData.address,
    userData.city,
    userData.state,
    userData.zip_code
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4, pb: 6 }}>
      {/* Account Header */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom fontWeight={700}>
          Account
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View your personal and account information.
        </Typography>
      </Box>

      {/* Tabs for Account Sections */}
      <Box>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Personal Information" />
          <Tab label="Account Information" />
        </Tabs>

        {/* Personal Information Tab */}
        {currentTab === 0 && (
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              {/* Name Field */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 2 },
                }}
              >
                <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: '150px' }}>
                  Name:
                </Typography>
                <Typography variant="body1">
                  {formatName(userData.first_name, userData.last_name)}
                </Typography>
              </Box>

              {/* Username Field */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 2 },
                }}
              >
                <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: '150px' }}>
                  Username:
                </Typography>
                <Typography variant="body1">{userData.username}</Typography>
              </Box>

              {/* Email Field */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 2 },
                }}
              >
                <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: '150px' }}>
                  Email:
                </Typography>
                <Typography variant="body1">{userData.email}</Typography>
              </Box>

              {/* Date of Birth Field */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 2 },
                }}
              >
                <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: '150px' }}>
                  Date of Birth:
                </Typography>
                <Typography variant="body1">
                  {formatDateOfBirth(userData.date_of_birth)}
                </Typography>
              </Box>

              {/* Address Field (Multi-line) */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 2 },
                }}
              >
                <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: '150px' }}>
                  Address:
                </Typography>
                <Box>
                  {Array.isArray(addressParts) ? (
                    addressParts.map((part, index) => (
                      <Typography key={index} variant="body1">
                        {part}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body1">{addressParts}</Typography>
                  )}
                </Box>
              </Box>

              {/* Country Field */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 2 },
                }}
              >
                <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: '150px' }}>
                  Country:
                </Typography>
                <Typography variant="body1">{userData.country || 'N/A'}</Typography>
              </Box>
            </Stack>
          </Paper>
        )}

        {/* Account Information Tab */}
        {currentTab === 1 && (
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              {/* Account Number Field */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 2 },
                }}
              >
                <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: '150px' }}>
                  Account No.:
                </Typography>
                <Typography variant="body1">{userData.account_number || 'N/A'}</Typography>
              </Box>

              {/* Account Type Field */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 2 },
                }}
              >
                <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: '150px' }}>
                  Account Type:
                </Typography>
                <Typography variant="body1">{userData.account_type || 'N/A'}</Typography>
              </Box>
            </Stack>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Account;
