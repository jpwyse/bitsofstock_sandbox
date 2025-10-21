import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Alert,
  Button,
  Paper,
  InputAdornment,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import { useCryptoNews } from '../../hooks/useCryptoNews';
import NewsCard from './NewsCard';
import NewsCardSkeleton from './NewsCardSkeleton';

/**
 * CryptoNewsList component - Displays a grid of crypto news articles
 *
 * @param {Function} onRefetchReady - Callback to pass refetch function to parent
 */
const CryptoNewsList = ({ onRefetchReady }) => {
  const { articles, loading, error, refetch } = useCryptoNews(20);
  const [searchFilter, setSearchFilter] = useState('');

  // Pass refetch function to parent component
  useEffect(() => {
    if (onRefetchReady) {
      onRefetchReady(refetch);
    }
  }, [refetch, onRefetchReady]);

  // Filter articles based on search query
  const filteredArticles = articles.filter((article) => {
    if (!searchFilter) return true;
    const searchLower = searchFilter.toLowerCase();
    return (
      article.headline.toLowerCase().includes(searchLower) ||
      article.summary.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Box>
      {/* Search Filter Toolbar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="Search headlines..."
          variant="outlined"
          size="small"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          sx={{
            maxWidth: 400,
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Error State */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={refetch}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[...Array(6)].map((_, index) => (
            <Box key={index}>
              <NewsCardSkeleton />
            </Box>
          ))}
        </Box>
      )}

      {/* Empty State */}
      {!loading && !error && filteredArticles.length === 0 && (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            backgroundColor: 'background.default',
          }}
        >
          <NewspaperIcon
            sx={{
              fontSize: 64,
              color: 'text.secondary',
              mb: 2,
            }}
          />
          <Typography variant="h6" gutterBottom color="text.secondary">
            {searchFilter ? 'No articles found' : 'No news available'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchFilter
              ? 'Try adjusting your search filter'
              : 'Check back later for crypto news updates'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={refetch}
          >
            Refresh
          </Button>
        </Paper>
      )}

      {/* News Cards List - Full Width */}
      {!loading && !error && filteredArticles.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mr: 0 }}>
          {filteredArticles.map((article) => (
            <Box key={article.id}>
              <NewsCard article={article} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default CryptoNewsList;
