// The renderer runs with contextIsolation and no nodeIntegration, so it is
// a plain web build — main-process access goes through window.walletApi
// (see main/preload.js).
module.exports = {
  output: 'export',
  distDir: '../app',
  images: {
    unoptimized: true,
  },
};
