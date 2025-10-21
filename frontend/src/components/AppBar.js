import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Container,
  Avatar,
  Button,
  Tooltip,
  Divider,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import logo from '../assets/BoSLogo.png';
import TradeModalAllCryptos from './TradeModalAllCryptos';
import TransferModal from './TransferModal';

const pages = ['Portfolio', 'Market', 'News', 'Trade'];

// Define the page routes mapping
const pageRoutes = {
  'Portfolio': '/portfolio',
  'Market': '/market',
  'News': '/news',
  'Trade': '#', // Modal action, not a page
  'Transfer': '#' // Modal action, not a page
};

function ResponsiveAppBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Helper function to determine if a page is active
  const isPageActive = (page) => {
    const route = pageRoutes[page];

    // Special case: Portfolio is active on both root path and /portfolio
    if (page === 'Portfolio') {
      return location.pathname === '/' || location.pathname === '/portfolio';
    }

    // Trade button is never active (it's a modal action, not a page)
    if (page === 'Trade') {
      return false;
    }

    // Transfer button is never active (it's a modal action, not a page)
    if (page === 'Transfer') {
      return false;
    }

    // For other pages, match the route
    return location.pathname === route;
  };

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleAccountClick = () => {
    navigate('/account');
  };

  const handlePageClick = (page) => {
    const route = pageRoutes[page];
    console.log(`Navigate to: ${page} (${route})`);

    // Navigate for Portfolio, Market, and News pages
    if (page === 'Portfolio' || page === 'Market' || page === 'News') {
      navigate(route);
    }

    // Open Trade modal
    if (page === 'Trade') {
      setTradeModalOpen(true);
    }

    // Open Transfer modal
    if (page === 'Transfer') {
      setTransferModalOpen(true);
    }

    handleCloseNavMenu();
  };

  return (
    <AppBar position="sticky" sx={{ borderRadius: 0, m: 0, p: 0 }}>
      <Container maxWidth="false" sx={{ borderRadius: 0 }}>
        <Toolbar>
          {/* Desktop Logo */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              alignItems: 'center',
              mr: 2,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/portfolio')}
          >
            <Box
              component="img"
              src={logo}
              alt="Bits of Stock Logo"
              sx={{
                height: 40,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 600,
                fontSize: '0.7rem',
                letterSpacing: '.05rem',
                color: 'inherit',
                textDecoration: 'none',
                mt: 0.5,
              }}
            >
              Bits of Stock
            </Typography>
          </Box>

          {/* Mobile Menu Icon */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: 'block', md: 'none' },
              }}
            >
              {pages.map((page) => (
                <MenuItem
                  key={page}
                  onClick={() => handlePageClick(page)}
                  aria-current={isPageActive(page) ? 'page' : undefined}
                  sx={{
                    backgroundColor: isPageActive(page)
                      ? 'rgba(91, 79, 219, 0.12)'
                      : 'transparent',
                    color: isPageActive(page) ? 'primary.main' : 'text.primary',
                    fontWeight: isPageActive(page) ? 600 : 400,
                    borderLeft: '4px solid',
                    borderLeftColor: isPageActive(page) ? 'primary.main' : 'transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: isPageActive(page)
                        ? 'rgba(91, 79, 219, 0.18)'
                        : 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                >
                  <Typography textAlign="center">{page}</Typography>
                </MenuItem>
              ))}
              <MenuItem
                key="Transfer"
                onClick={() => handlePageClick('Transfer')}
                aria-current={isPageActive('Transfer') ? 'page' : undefined}
                sx={{
                  backgroundColor: isPageActive('Transfer')
                    ? 'rgba(91, 79, 219, 0.12)'
                    : 'transparent',
                  color: isPageActive('Transfer') ? 'primary.main' : 'text.primary',
                  fontWeight: isPageActive('Transfer') ? 600 : 400,
                  borderLeft: '4px solid',
                  borderLeftColor: isPageActive('Transfer') ? 'primary.main' : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: isPageActive('Transfer')
                      ? 'rgba(91, 79, 219, 0.18)'
                      : 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <Typography textAlign="center">Transfer</Typography>
              </MenuItem>
            </Menu>
          </Box>

          {/* Mobile Logo */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              flexDirection: 'column',
              alignItems: 'center',
              flexGrow: 1,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/portfolio')}
          >
            <Box
              component="img"
              src={logo}
              alt="Bits of Stock Logo"
              sx={{
                height: 35,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 600,
                fontSize: '0.65rem',
                letterSpacing: '.05rem',
                color: 'inherit',
                textDecoration: 'none',
                mt: 0.5,
              }}
            >
              Bits of Stock
            </Typography>
          </Box>

          {/* Desktop Navigation Links */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {pages.map((page) => (
              <Button
                key={page}
                onClick={() => handlePageClick(page)}
                aria-current={isPageActive(page) ? 'page' : undefined}
                sx={{
                  my: 2,
                  mx: 0.5,
                  px: 2.5,
                  py: 1.2,
                  color: 'white',
                  display: 'block',
                  position: 'relative',
                  fontSize: '1rem',
                  opacity: isPageActive(page) ? 1 : 0.7,
                  fontWeight: isPageActive(page) ? 600 : 400,
                  borderBottom: '3px solid',
                  borderColor: isPageActive(page) ? 'primary.main' : 'transparent',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    opacity: 1,
                    borderColor: isPageActive(page) ? 'primary.main' : 'rgba(255, 255, 255, 0.3)',
                  },
                }}
              >
                {page}
              </Button>
            ))}
          </Box>

          {/* Transfer Button (Desktop) */}
          <Box sx={{ flexGrow: 0, display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
            <Button
              onClick={() => handlePageClick('Transfer')}
              aria-current={isPageActive('Transfer') ? 'page' : undefined}
              startIcon={<CompareArrowsIcon />}
              sx={{
                my: 2,
                mx: 0.5,
                px: 2.5,
                py: 1.2,
                color: 'white',
                display: 'flex',
                position: 'relative',
                fontSize: '1rem',
                opacity: isPageActive('Transfer') ? 1 : 0.7,
                fontWeight: isPageActive('Transfer') ? 600 : 400,
                borderBottom: '3px solid',
                borderColor: isPageActive('Transfer') ? 'primary.main' : 'transparent',
                transition: 'all 0.3s ease',
                '&:hover': {
                  opacity: 1,
                  borderColor: isPageActive('Transfer') ? 'primary.main' : 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              Transfer
            </Button>

            {/* Vertical Divider */}
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                mr: 3,
                my: 2,
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}
            />
          </Box>

          {/* User Account Button */}
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Account">
              <IconButton onClick={handleAccountClick} sx={{ p: 0 }}>
                <Avatar alt="User Avatar" src="/static/images/avatar/2.jpg" />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </Container>

      {/* Trade Modal */}
      <TradeModalAllCryptos
        open={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
      />

      {/* Transfer Modal */}
      <TransferModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
      />
    </AppBar>
  );
}

export default ResponsiveAppBar;
