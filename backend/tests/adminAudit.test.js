import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import prisma from '../src/prisma.js';

describe('Admin Governance & Audit Log Suite', () => {
    let adminToken;
    let clientToken;
    let adminUser;
    let clientUser;

    beforeAll(async () => {
        adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        clientUser = await prisma.user.findFirst({ where: { role: 'CLIENT' } });

        if (adminUser) {
            adminToken = jwt.sign({ id: adminUser.id, tokenType: 'access' }, process.env.JWT_SECRET);
        }
        if (clientUser) {
            clientToken = jwt.sign({ id: clientUser.id, tokenType: 'access' }, process.env.JWT_SECRET);
        }
    });

    describe('Admin Authorization Guardrails', () => {
        it('GET /api/admin/audit-logs should reject unauthenticated requests with 401', async () => {
            const res = await request(app).get('/api/admin/audit-logs');

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/not authorized/i);
        });

        it('GET /api/admin/audit-logs should reject non-admin (CLIENT) users with 403', async () => {
            const res = await request(app)
                .get('/api/admin/audit-logs')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/admin only/i);
        });

        it('GET /api/admin/stats should reject non-admin users with 403', async () => {
            const res = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${clientToken}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/admin only/i);
        });
    });

    describe('GET /api/admin/audit-logs - Pagination & Structure', () => {
        it('should allow authorized admins and return paginated audit logs', async () => {
            const res = await request(app)
                .get('/api/admin/audit-logs?page=1&limit=5')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('logs');
            expect(Array.isArray(res.body.logs)).toBe(true);
            expect(res.body).toHaveProperty('pagination');
            expect(res.body.pagination).toHaveProperty('total');
            expect(res.body.pagination).toHaveProperty('page', 1);
            expect(res.body.pagination).toHaveProperty('limit', 5);
            expect(res.body.pagination).toHaveProperty('totalPages');
        });

        it('audit logs should contain immutable audit metadata (admin, action, timestamp)', async () => {
            const res = await request(app)
                .get('/api/admin/audit-logs?limit=1')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            if (res.body.logs.length > 0) {
                const log = res.body.logs[0];
                expect(log).toHaveProperty('id');
                expect(log).toHaveProperty('action');
                expect(log).toHaveProperty('createdAt');
                expect(log).toHaveProperty('admin');
                expect(log.admin).toHaveProperty('email');
            }
        });
    });

    describe('Admin Platform Statistics', () => {
        it('GET /api/admin/stats should return aggregate platform statistics', async () => {
            const res = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('users');
            expect(res.body).toHaveProperty('appointments');
            expect(res.body).toHaveProperty('providers');
            expect(res.body).toHaveProperty('clients');
            expect(res.body).toHaveProperty('totalReviews');
        });
    });
});
