// Vercel Speed Insights - Vanilla JS Integration
// This file injects Vercel Speed Insights to track web vitals and performance metrics

// Initialize Speed Insights using the standard injection method
// The script automatically tracks Core Web Vitals and performance metrics
import { injectSpeedInsights } from '@vercel/speed-insights';

injectSpeedInsights({
  debug: false // Set to true to enable debug logging in development
});
