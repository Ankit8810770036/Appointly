import cron from 'node-cron';
import prisma from '../prisma.js';
import { sendEmailJSReminder } from '../utils/emailService.js';
import { createNotification } from '../utils/notificationHelper.js';

// Schedule task to run every day at 08:00 AM server time
const scheduleReminders = () => {
    // 0 8 * * * means everyday at 8:00 AM
    cron.schedule('0 8 * * *', async () => {
        console.log('[CRON] Running appointment reminder check at', new Date().toISOString());
        try {
            // Calculate "tomorrow" boundaries
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

            // Find all UPCOMING appointments scheduled for tomorrow
            const appointments = await prisma.appointment.findMany({
                where: {
                    status: 'UPCOMING',
                    date: {
                        gte: tomorrow,
                        lt: dayAfterTomorrow
                    }
                },
                include: {
                    client: true,
                    provider: {
                        include: {
                            user: true
                        }
                    },
                    service: true
                }
            });

            console.log(`[CRON] Found ${appointments.length} appointments for tomorrow.`);

            for (const appt of appointments) {
                const dateStr = appt.date.toLocaleDateString();
                const timeStr = appt.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                // Send reminder payload to both client and provider using EmailJS
                await sendEmailJSReminder(
                    appt.client.name,               // client_name
                    appt.provider.user.name,        // provider_name
                    appt.client.email,              // client_email
                    appt.provider.user.email,       // provider_email
                    dateStr,                        // appointment_date
                    timeStr                         // appointment_time
                );

                // Real-time & Persistent Notifications
                const notifBase = {
                    type: 'APPOINTMENT_REMINDER',
                    title: 'Upcoming Appointment Reminder',
                    message: `Reminder: You have an appointment for ${appt.service.name} tomorrow at ${timeStr}.`,
                };

                // Notify Client
                await createNotification({
                    ...notifBase,
                    userId: appt.clientId,
                    link: '/dashboard/client'
                });

                // Notify Provider
                await createNotification({
                    ...notifBase,
                    userId: appt.provider.userId,
                    link: '/dashboard/provider'
                });
            }
        } catch (error) {
            console.error('[CRON] Error during scheduled reminder job:', error);
        }
    });
    console.log('[CRON] Daily appointment reminder job scheduled.');
};

export default scheduleReminders;
