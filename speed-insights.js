// Vercel Speed Insights initialization
// This script injects Speed Insights tracking for performance monitoring
import { injectSpeedInsights } from '@vercel/speed-insights';

// Initialize Speed Insights
injectSpeedInsights({
  debug: false, // Set to true for development debugging
});
