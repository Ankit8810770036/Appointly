import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('API Health & System Endpoints', () => {
    it('GET /api/health should return 200 and health status', async () => {
        const res = await request(app).get('/api/health');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('message', 'Appointly API is running');
        expect(res.body).toHaveProperty('timestamp');
        expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
    });

    it('GET /api/unknown-route should return 404 with standard error format', async () => {
        const res = await request(app).get('/api/unknown-endpoint-route-check');

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toContain('not found');
    });

    it('Should include security headers configured by Helmet', async () => {
        const res = await request(app).get('/api/health');

        // Helmet headers
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-dns-prefetch-control']).toBe('off');
        expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
});
