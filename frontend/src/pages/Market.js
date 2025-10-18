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
          <Tab label="All" />
          <Tab label="Watch List" />
          <Tab label="Crypto" />
          <Tab label="Stablecoins" />
          <Tab label="Top Traded" />
          <Tab label="Top Movers" />
        </Tabs>

        {currentTab === 0 && <CryptocurrencyList category={null} />}
        {currentTab === 1 && <Box>Watch List content coming soon</Box>}
        {currentTab === 2 && <CryptocurrencyList category="CRYPTO" />}
        {currentTab === 3 && <CryptocurrencyList category="STABLECOIN" />}
        {currentTab === 4 && <Box>Top Traded content coming soon</Box>}
        {currentTab === 5 && <Box>Top Movers content coming soon</Box>}
      </Box>
    </Container>
  );
};

export default Market;
