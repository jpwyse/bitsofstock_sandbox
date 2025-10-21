import { Box, Typography } from '@mui/material';
import logo from '../assets/BoSLogo.png';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#E8E6F7',
        color: 'text.primary',
        py: 2,
        px: 2,
        textAlign: 'center',
        borderTop: '1px solid #D0CCE8',
        mt: 'auto',
      }}
    >
      {/* Logo and Title */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Box
          component="img"
          src={logo}
          alt="Bits of Stock Logo"
          sx={{
            height: 28,
            mb: 0.5,
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'monospace',
            fontWeight: 600,
            fontSize: '0.65rem',
            letterSpacing: '.05rem',
            color: 'text.primary',
          }}
        >
          Bits of Stock
        </Typography>
      </Box>

      {/* Copyright */}
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: '0.75rem',
        }}
      >
        © {currentYear} Bits of Stock
      </Typography>
    </Box>
  );
};

export default Footer;
