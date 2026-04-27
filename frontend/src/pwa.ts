const isProduction = import.meta.env.PROD;

if (isProduction && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The app shell still works if service worker registration is unavailable.
    });
  });
}
