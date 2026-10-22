import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';

describe('Authentication & JWT Authorization Suite', () => {
    describe('POST /api/auth/login', () => {
        it('should return 400 when email or password is missing', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message');
            expect(res.body.message.toLowerCase()).toContain('required');
        });

        it('should return 400 when both credentials are empty', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message');
        });

        it('should return 401 when invalid credentials are provided', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent_user_99999@appointly.internal',
                    password: 'WrongPassword123!'
                });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('message');
            expect(res.body.message).toMatch(/invalid email or password/i);
        });
    });

    describe('GET /api/auth/me - Protected Route Security', () => {
        it('should return 401 when no token is provided', async () => {
            const res = await request(app).get('/api/auth/me');

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('message');
            expect(res.body.message).toMatch(/not authorized, no token/i);
        });

        it('should return 401 when Authorization header does not use Bearer format', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Basic dXNlcjpwYXNz');

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/not authorized, no token/i);
        });

        it('should return 401 when token signature is invalid', async () => {
            const bogusToken = jwt.sign({ id: 'fake-id' }, 'wrong-secret-key-12345');

            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${bogusToken}`);

            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/token failed/i);
        });
    });

    describe('POST /api/auth/register - Input Validation', () => {
        it('should return 400 when required registration fields are missing', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test Incomplete'
                    // missing email, password, role
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message');
        });
    });
});
