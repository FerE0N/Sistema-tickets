import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend } from 'k6/metrics';

// Config por variables de entorno
const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:4000';
const USERNAME = __ENV.USERNAME || 'admin@demo.com';
const PASSWORD = __ENV.PASSWORD || 'Demo1234!';
const ENDPOINTS = (__ENV.ENDPOINTS || '/api/tickets,/api/tickets/paged')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);

// Recomendado: asegurar que el resumen incluya p95 y p99
// En Windows CMD:  set K6_SUMMARY_TREND_STATS=avg,min,med,max,p(90),p(95),p(99)
// En PowerShell:   $env:K6_SUMMARY_TREND_STATS='avg,min,med,max,p(90),p(95),p(99)'

export const options = {
  vus: Number(__ENV.VUS) || 10,
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: [
      'p(50)<1000',
      'p(90)<1200',
      'p(95)<1500',
      'p(99)<2000',
    ],
  },
};

// métricas por endpoint
const trends = {};
ENDPOINTS.forEach(ep => {
  trends[ep] = new Trend(`duration_${ep.replace(/[^\w]/g, '_')}`);
});

export function setup() {
  const payload = JSON.stringify({ email: USERNAME, password: PASSWORD });
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login 200': r => r.status === 200,
    'token presente': r => r.json('token') !== undefined,
  });

  const token = loginRes.json('token');
  return { token };
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` };

  ENDPOINTS.forEach((ep) => {
    const res = http.get(`${BASE_URL}${ep}`, { headers });

    check(res, {
      [`${ep} 2xx/3xx`]: r => r.status >= 200 && r.status < 400,
    });

    trends[ep].add(res.timings.duration);
  });

  sleep(1);
}
