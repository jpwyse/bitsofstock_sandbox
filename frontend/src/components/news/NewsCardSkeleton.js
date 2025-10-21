import {
  Card,
  CardContent,
  Box,
  Skeleton,
} from '@mui/material';

/**
 * NewsCardSkeleton component - Loading placeholder for NewsCard
 */
const NewsCardSkeleton = () => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Image Skeleton */}
      <Skeleton variant="rectangular" height={180} />

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Source and Time Skeleton */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Skeleton variant="rounded" width={80} height={22} />
          <Skeleton variant="text" width={60} height={20} />
        </Box>

        {/* Headline Skeleton */}
        <Box>
          <Skeleton variant="text" width="100%" height={28} />
          <Skeleton variant="text" width="90%" height={28} />
        </Box>

        {/* Summary Skeleton */}
        <Box>
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="95%" />
          <Skeleton variant="text" width="85%" />
        </Box>
      </CardContent>
    </Card>
  );
};

export default NewsCardSkeleton;
