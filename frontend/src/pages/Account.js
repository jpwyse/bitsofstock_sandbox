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
import apiService from '../services/api';

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
