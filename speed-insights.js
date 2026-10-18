// Vercel Speed Insights Initialization
// Standalone initialization script for vanilla JavaScript projects

(function() {
  'use strict';
  
  // Initialize the queue for Speed Insights
  function initQueue() {
    if (window.si) return;
    window.si = function() {
      window.siq = window.siq || [];
      window.siq.push(arguments);
    };
  }

  // Inject the Speed Insights script
  function injectSpeedInsights() {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;

    // Initialize the queue
    initQueue();

    // Check if script is already loaded
    var scriptSrc = '/_vercel/speed-insights/script.js';
    if (document.head.querySelector('script[src*="' + scriptSrc + '"]')) {
      return;
    }

    // Create and configure the script element
    var script = document.createElement('script');
    script.src = scriptSrc;
    script.defer = true;
    
    // Add dataset attributes for configuration
    script.dataset.sdkn = '@vercel/speed-insights/vanilla';
    script.dataset.sdkv = '2.0.0';

    // Error handler
    script.onerror = function() {
      console.log('[Vercel Speed Insights] Failed to load script from ' + scriptSrc + '. Please check if any content blockers are enabled and try again.');
    };

    // Append script to head
    document.head.appendChild(script);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSpeedInsights);
  } else {
    injectSpeedInsights();
  }
})();
