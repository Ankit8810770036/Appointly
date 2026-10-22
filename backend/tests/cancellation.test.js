import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import prisma from '../src/prisma.js';

describe('Appointment Cancellation Policy & Security Suite', () => {
    let clientToken;
    let providerToken;
    let clientUser;
    let providerUser;
    let testAppointment;

    beforeAll(async () => {
        // Find existing client and provider for testing
        clientUser = await prisma.user.findFirst({ where: { role: 'CLIENT' } });
        providerUser = await prisma.user.findFirst({ where: { role: 'PROVIDER' } });

        if (clientUser) {
            clientToken = jwt.sign({ id: clientUser.id, tokenType: 'access' }, process.env.JWT_SECRET);
        }
        if (providerUser) {
            providerToken = jwt.sign({ id: providerUser.id, tokenType: 'access' }, process.env.JWT_SECRET);
        }
    });

    it('PATCH /api/appointments/:id/status should reject unauthenticated requests with 401', async () => {
        const res = await request(app)
            .patch('/api/appointments/test-id/status')
            .send({ status: 'CANCELLED' });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/not authorized/i);
    });

    it('PATCH /api/appointments/:id/status should reject invalid status values with 400', async () => {
        const res = await request(app)
            .patch('/api/appointments/test-id/status')
            .set('Authorization', `Bearer ${clientToken}`)
            .send({ status: 'INVALID_STATUS' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/invalid status/i);
    });

    it('PATCH /api/appointments/:id/status should return 404 for non-existent appointment', async () => {
        const res = await request(app)
            .patch('/api/appointments/00000000-0000-0000-0000-000000000000/status')
            .set('Authorization', `Bearer ${clientToken}`)
            .send({ status: 'CANCELLED', reason: 'Emergency' });

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/appointment not found/i);
    });

    it('PATCH /api/appointments/:id/status should prevent clients from confirming or completing appointments (403)', async () => {
        // Find any appointment owned by this client
        const appt = await prisma.appointment.findFirst({
            where: { clientId: clientUser.id }
        });

        if (appt) {
            const res = await request(app)
                .patch(`/api/appointments/${appt.id}/status`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ status: 'CONFIRMED' });

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/only permitted to cancel/i);
        }
    });

    it('Policy Rule: Cannot cancel an already COMPLETED appointment', async () => {
        const completedAppt = await prisma.appointment.findFirst({
            where: { clientId: clientUser.id, status: 'COMPLETED' }
        });

        if (completedAppt) {
            const res = await request(app)
                .patch(`/api/appointments/${completedAppt.id}/status`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ status: 'CANCELLED', reason: 'Tried to cancel old session' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('code', 'APPOINTMENT_ALREADY_COMPLETED');
            expect(res.body.message).toMatch(/completed appointments cannot be cancelled/i);
        }
    });

    it('Policy Rule: Cancellation requires a valid reason from clients', async () => {
        // Create a mock future appointment for client
        const providerProfile = await prisma.providerProfile.findFirst({
            include: { services: true }
        });

        if (providerProfile && providerProfile.services.length > 0) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 5); // 5 days in future

            const testAppt = await prisma.appointment.create({
                data: {
                    clientId: clientUser.id,
                    providerId: providerProfile.id,
                    serviceId: providerProfile.services[0].id,
                    date: futureDate,
                    status: 'PENDING'
                }
            });

            try {
                // Attempt cancellation without reason
                const resNoReason = await request(app)
                    .patch(`/api/appointments/${testAppt.id}/status`)
                    .set('Authorization', `Bearer ${clientToken}`)
                    .send({ status: 'CANCELLED', reason: '' });

                expect(resNoReason.status).toBe(400);
                expect(resNoReason.body).toHaveProperty('code', 'CANCELLATION_REASON_REQUIRED');

                // Now cancel WITH reason - should succeed
                const resWithReason = await request(app)
                    .patch(`/api/appointments/${testAppt.id}/status`)
                    .set('Authorization', `Bearer ${clientToken}`)
                    .send({ status: 'CANCELLED', reason: 'Schedule conflict with college exams' });

                expect(resWithReason.status).toBe(200);
                expect(resWithReason.body.status).toBe('CANCELLED');
                expect(resWithReason.body.cancellationReason).toBe('Schedule conflict with college exams');
                expect(resWithReason.body.cancelledBy).toBe('CLIENT');
            } finally {
                // Clean up test appointment
                await prisma.appointment.delete({ where: { id: testAppt.id } }).catch(() => {});
            }
        }
    });

    it('Policy Rule: Enforce 2-hour grace period window (cannot cancel < 2 hours prior)', async () => {
        const providerProfile = await prisma.providerProfile.findFirst({
            include: { services: true }
        });

        if (providerProfile && providerProfile.services.length > 0) {
            // Set date 30 minutes in the future (within 2-hour blocked window)
            const soonDate = new Date(Date.now() + 30 * 60 * 1000);

            const urgentAppt = await prisma.appointment.create({
                data: {
                    clientId: clientUser.id,
                    providerId: providerProfile.id,
                    serviceId: providerProfile.services[0].id,
                    date: soonDate,
                    status: 'PENDING'
                }
            });

            try {
                const res = await request(app)
                    .patch(`/api/appointments/${urgentAppt.id}/status`)
                    .set('Authorization', `Bearer ${clientToken}`)
                    .send({ status: 'CANCELLED', reason: 'Last minute cancellation' });

                expect(res.status).toBe(400);
                expect(res.body).toHaveProperty('code', 'CANCELLATION_WINDOW_CLOSED');
                expect(res.body.message).toMatch(/less than 2 hours/i);
            } finally {
                await prisma.appointment.delete({ where: { id: urgentAppt.id } }).catch(() => {});
            }
        }
    });
});
