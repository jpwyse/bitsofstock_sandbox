import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import theme from './theme/theme';
import { PortfolioProvider } from './context/PortfolioContext';
import ResponsiveAppBar from './components/AppBar';
import Footer from './components/Footer';
import Portfolio from './pages/Portfolio';
import Market from './pages/Market';
import News from './pages/News';
import Account from './pages/Account';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PortfolioProvider>
        <Router>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100vh',
            }}
          >
            <ResponsiveAppBar />
            <Box sx={{ flex: 1 }}>
              <Routes>
                <Route path="/" element={<Portfolio />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/market" element={<Market />} />
                <Route path="/news" element={<News />} />
                <Route path="/account" element={<Account />} />
              </Routes>
            </Box>
            <Footer />
          </Box>
        </Router>
      </PortfolioProvider>
    </ThemeProvider>
  );
}

export default App;
