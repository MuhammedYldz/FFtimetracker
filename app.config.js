// Extends app.json. The web base path is injected from EXPO_BASE_URL so the
// GitHub Pages build (served from /FFtimetracker/) resolves assets correctly,
// while local builds stay at the root.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL || '',
  },
});
