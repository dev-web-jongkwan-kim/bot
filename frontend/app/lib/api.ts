import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3031';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for backtest
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.data);
      return Promise.reject({
        message: error.response.data.message || 'Server error occurred',
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.request);
      return Promise.reject({
        message: 'Network error - please check your connection',
        status: 0,
      });
    } else {
      // Error setting up request
      console.error('Request Error:', error.message);
      return Promise.reject({
        message: error.message || 'An error occurred',
        status: -1,
      });
    }
  }
);

// API methods
export const dashboardApi = {
  getMetrics: () => api.get('/api/dashboard/metrics'),
  getEquityCurve: () => api.get('/api/dashboard/equity-curve'),
  getPositions: () => api.get('/api/positions/open'),
  closePosition: (id: number) => api.post(`/api/positions/${id}/close`),
  getAccountBalance: () => api.get('/api/account/balance'),
  getTicker: (symbol: string) => api.get(`/api/ticker/${symbol}`),
  getSystemStatus: () => api.get('/api/system/status'),
};

export const backtestApi = {
  run: (config: any) => api.post('/api/backtest/run', config),
  getResults: (id: string) => api.get(`/api/backtest/results/${id}`),
  downloadData: (symbol: string, interval: string, startDate: string, endDate: string) =>
    api.get(`/api/backtest/download/${symbol}/${interval}/${startDate}/${endDate}`),
  getSymbols: () => api.get('/api/binance/symbols'),
};

export const signalsApi = {
  getAll: () => api.get('/api/signals'),
  getBySymbol: (symbol: string) => api.get(`/api/signals?symbol=${symbol}`),
};

export const performanceApi = {
  getDailyStats: () => api.get('/api/stats/daily'),
  getPerformance: () => api.get('/api/performance'),
};

export const tradesApi = {
  getClosed: () => api.get('/api/trades/closed'),
  getSummary: () => api.get('/api/trades/summary'),
  getDailyStats: () => api.get('/api/trades/daily-stats'),
  getByDate: (date: string) => api.get(`/api/trades/by-date/${date}`),
};
