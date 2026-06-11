(function () {
  if (typeof window !== 'undefined' && !window.JP_TAXI_API_BASE) {
    window.JP_TAXI_API_BASE = 'http://localhost:3000/api';
  }
})();
