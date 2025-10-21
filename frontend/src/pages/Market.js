import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import CryptocurrencyList from '../components/market/CryptocurrencyList';

const Market = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, pb: 6 }}>
      {/* Market Header */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom fontWeight={700}>
          Market
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse and trade available cryptocurrencies.
        </Typography>
      </Box>

      {/* Tabs for Market Views */}
      <Box>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="All" />
          <Tab label="Crypto" />
          <Tab label="Stablecoins" />
          <Tab label="Top Traded" />
          <Tab label="Top Movers" />
        </Tabs>

        {currentTab === 0 && <CryptocurrencyList category={null} sortBy={null} />}
        {currentTab === 1 && <CryptocurrencyList category="CRYPTO" sortBy={null} />}
        {currentTab === 2 && <CryptocurrencyList category="STABLECOIN" sortBy={null} />}
        {currentTab === 3 && <CryptocurrencyList category={null} sortBy="volume" />}
        {currentTab === 4 && <CryptocurrencyList category={null} sortBy="movers" />}
      </Box>
    </Container>
  );
};

export default Market;
