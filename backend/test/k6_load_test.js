import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:4000';
const USERNAME = __ENV.USERNAME || 'laura@correo.com';   // 👈 pon tu user real
const PASSWORD = __ENV.PASSWORD || 'laura123';           // 👈 pon tu pass real
const ENDPOINTS = (__ENV.ENDPOINTS || '/api/tickets,/api/tickets/paged')
  .split(',')
  .map(e => e.trim());

export const options = {
  vus: Number(__ENV.VUS) || 10,
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'], // <1% de fallos aceptable
    http_req_duration: [
      'p(50)<1000',
      'p(90)<1200',
      'p(95)<1500',
      'p(99)<2000',
    ],
  },
};

// Guarda métricas personalizadas por endpoint
const trends = {};
ENDPOINTS.forEach(ep => {
  trends[ep] = new Trend(`duration_${ep.replace(/[^\w]/g, '_')}`);
});

// Variable global para token
let token = null;

// 1) Setup: hacemos login solo una vez antes de las pruebas
export function setup() {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: USERNAME,
    password: PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login status 200': r => r.status === 200,
    'token present': r => r.json('token') !== undefined,
  });

  token = loginRes.json('token');
  return { token }; // lo pasamos al default
}

// 2) Test principal
export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` };

  ENDPOINTS.forEach((ep) => {
    const res = http.get(`${BASE_URL}${ep}`, { headers });

    check(res, {
      [`${ep} status 200`]: r => r.status === 200,
    });

    trends[ep].add(res.timings.duration);
  });

  sleep(1);
}
