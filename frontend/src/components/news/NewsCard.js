import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  Box,
  Tooltip,
  Link as MuiLink,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';

/**
 * NewsCard component - Displays a single news article
 *
 * @param {Object} article - News article data
 * @param {number} article.id - Article ID
 * @param {number} article.datetime - UNIX timestamp
 * @param {string} article.headline - Article headline
 * @param {string} article.image - Image URL (optional)
 * @param {string} article.summary - Article summary
 * @param {string} article.url - Article URL
 * @param {string} article.source - News source (optional)
 */
const NewsCard = ({ article }) => {
  const { datetime, headline, image, summary, url, source } = article;

  // Convert UNIX timestamp to Date
  const articleDate = new Date(datetime * 1000);
  const relativeTime = formatDistanceToNow(articleDate, { addSuffix: true });
  const fullDateTime = articleDate.toLocaleString();

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      {/* Article Image */}
      {image && (
        <CardMedia
          component="img"
          height="180"
          image={image}
          alt={headline}
          sx={{
            objectFit: 'cover',
          }}
          loading="lazy"
        />
      )}

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Source and Time */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          {source && (
            <Chip
              label={source}
              size="small"
              sx={{
                fontSize: '0.75rem',
                height: '22px',
              }}
            />
          )}
          <Tooltip title={fullDateTime} arrow>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {relativeTime}
            </Typography>
          </Tooltip>
        </Box>

        {/* Headline */}
        <MuiLink
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          color="inherit"
          sx={{
            '&:focus': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: '2px',
            },
          }}
        >
          <Typography
            variant="h6"
            component="h3"
            sx={{
              fontWeight: 600,
              fontSize: '1.1rem',
              lineHeight: 1.3,
              mb: 1,
            }}
          >
            {headline}
          </Typography>
        </MuiLink>

        {/* Summary */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.5,
          }}
        >
          {summary}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default NewsCard;
