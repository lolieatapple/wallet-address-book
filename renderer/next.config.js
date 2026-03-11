module.exports = {
  output: 'export',
  distDir: '../app',
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Electron renderer has nodeIntegration enabled, so Node.js modules
      // are available via require() at runtime. Tell webpack to leave them
      // as commonjs requires instead of bundling or polyfilling them.
      config.target = 'electron-renderer';
    }
    return config;
  },
};
