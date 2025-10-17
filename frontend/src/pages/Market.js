import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import CryptocurrencyList from '../components/CryptocurrencyList';

const Market = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Market Header */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom fontWeight={700}>
          Market
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse and trade available cryptocurrencies
        </Typography>
      </Box>

      {/* Tabs for Market Views */}
      <Box>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Crypto" />
          <Tab label="Equities" />
          <Tab label="Watch List" />
          <Tab label="All" />
        </Tabs>

        {currentTab === 0 && <CryptocurrencyList />}
        {currentTab === 1 && <Box>Equities content coming soon</Box>}
        {currentTab === 2 && <Box>Watch List content coming soon</Box>}
        {currentTab === 3 && <Box>All content coming soon</Box>}
      </Box>
    </Container>
  );
};

export default Market;
