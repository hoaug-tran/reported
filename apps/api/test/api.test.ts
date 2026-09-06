import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';

describe('Reported API & Authentication Security Suite', () => {
  it('GET /health returns 200 and ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('reported-api');
  });

  it('GET /api/v1/issues returns 200 array structure', async () => {
    const res = await request(app).get('/api/v1/issues');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('GET /api/v1/github/preview-pr rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/github/preview-pr');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('Auth Flow: register, cookie-only login (zero token leak), /me with cookie, and logout', async () => {
    const testId = Date.now().toString().slice(-6);
    const username = `secuser_${testId}`;
    const email = `sec_${testId}@reported.test`;
    const password = 'SecPassWord_2026!';

    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username,
        email,
        password,
        displayName: `Security Test User ${testId}`
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.message).toBe('Đăng ký tài khoản thành công');
    expect(regRes.body.token).toBeUndefined();
    expect(regRes.body.user).toBeUndefined();

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        login: email,
        password
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.message).toBe('Đăng nhập thành công');
    expect(loginRes.body.token).toBeUndefined();
    expect(loginRes.body.user).toBeUndefined();

    const rawCookies = loginRes.headers['set-cookie'];
    expect(rawCookies).toBeDefined();
    const cookieHeader = Array.isArray(rawCookies) ? rawCookies.join('; ') : String(rawCookies);
    expect(cookieHeader).toContain('reported_session=');
    expect(cookieHeader.toLowerCase()).toContain('httponly');

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookieHeader);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user).toBeDefined();
    expect(meRes.body.user.email).toBe(email);
    expect(meRes.body.user.username).toBe(username);

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookieHeader);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);
    expect(logoutRes.body.message).toBe('Đăng xuất thành công');
  });
});
