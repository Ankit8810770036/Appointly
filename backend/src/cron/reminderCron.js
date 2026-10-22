import cron from 'node-cron';
import prisma from '../prisma.js';
import { sendEmailJSReminder } from '../utils/emailService.js';
import { createNotification } from '../utils/notificationHelper.js';
import twilioService from '../utils/twilioService.js';

// Cache to prevent duplicate 1-hour reminders during the same hour window
const sentOneHourReminders = new Set();

/**
 * Periodically purge stale entries from sent reminders cache
 */
setInterval(() => {
    if (sentOneHourReminders.size > 5000) {
        sentOneHourReminders.clear();
    }
}, 3600000); // Purge every hour

// Schedule task to run every day at 08:00 AM server time & 1-Hour check every 5 minutes
const scheduleReminders = () => {
    // 1. Daily 24-Hour Reminder Check (0 8 * * * -> 8:00 AM daily)
    cron.schedule('0 8 * * *', async () => {
        console.log('[CRON] Running daily appointment reminder check at', new Date().toISOString());
        try {
            // Calculate "tomorrow" boundaries
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

            // Find all confirmed appointments scheduled for tomorrow
            const appointments = await prisma.appointment.findMany({
                where: {
                    status: 'CONFIRMED',
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
                try {
                    const pad = (n) => String(n).padStart(2, '0');
                    const h = appt.date.getUTCHours();
                    const m = pad(appt.date.getUTCMinutes());
                    const period = h >= 12 ? 'PM' : 'AM';
                    const h12 = h % 12 === 0 ? 12 : h % 12;
                    const timeStr = `${h12}:${m} ${period}`;
                    const dateStr = `${appt.date.getUTCFullYear()}-${pad(appt.date.getUTCMonth() + 1)}-${pad(appt.date.getUTCDate())}`;

                    // Send reminder payload to both client and provider using EmailJS (non-blocking)
                    try {
                        await sendEmailJSReminder(
                            appt.client.name,               // client_name
                            appt.provider?.user?.name || 'Specialist', // provider_name
                            appt.client.email,              // client_email
                            appt.provider?.user?.email,       // provider_email
                            dateStr,                        // appointment_date
                            timeStr                         // appointment_time
                        );
                    } catch (emailErr) {
                        console.warn(`[CRON] EmailJS reminder failed for appointment ${appt.id}:`, emailErr.message);
                    }

                    // Real-time & Persistent Notifications
                    const notifBase = {
                        type: 'APPOINTMENT_REMINDER_24H',
                        title: 'Upcoming Appointment Tomorrow',
                        message: `Reminder: You have an appointment for ${appt.service?.name || 'Service'} tomorrow at ${timeStr}.`,
                    };

                    // Notify Client
                    await createNotification({
                        ...notifBase,
                        userId: appt.clientId,
                        link: '/dashboard/client'
                    });

                    // Notify Provider
                    if (appt.provider?.userId) {
                        await createNotification({
                            ...notifBase,
                            userId: appt.provider.userId,
                            link: '/dashboard/provider'
                        });
                    }
                } catch (itemErr) {
                    console.error(`[CRON] Error processing 24h reminder for appointment ${appt.id}:`, itemErr);
                }
            }
        } catch (error) {
            console.error('[CRON] Error during daily scheduled reminder job:', error);
        }
    });

    // 2. Automated 1-Hour Reminder Cron (Runs every 5 minutes: */5 * * * *)
    cron.schedule('*/5 * * * *', async () => {
        try {
            const now = new Date();
            // Look for appointments happening between 50 minutes and 70 minutes from now
            const windowStart = new Date(now.getTime() + 50 * 60 * 1000);
            const windowEnd = new Date(now.getTime() + 70 * 60 * 1000);

            const upcomingAppointments = await prisma.appointment.findMany({
                where: {
                    status: { in: ['CONFIRMED', 'PENDING'] },
                    date: {
                        gte: windowStart,
                        lte: windowEnd
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

            if (upcomingAppointments.length > 0) {
                console.log(`[CRON 1-Hour] Found ${upcomingAppointments.length} upcoming appointment(s) starting in ~1 hour.`);
            }

            for (const appt of upcomingAppointments) {
                // Prevent duplicate reminder dispatch
                if (sentOneHourReminders.has(appt.id)) continue;

                try {
                    const pad = (n) => String(n).padStart(2, '0');
                    const h = appt.date.getUTCHours();
                    const m = pad(appt.date.getUTCMinutes());
                    const period = h >= 12 ? 'PM' : 'AM';
                    const h12 = h % 12 === 0 ? 12 : h % 12;
                    const timeStr = `${h12}:${m} ${period}`;
                    const specialistName = appt.provider?.user?.name || 'Specialist';
                    const clientName = appt.client?.name || 'Client';

                    // 1. Dispatch WhatsApp and SMS 1-Hour reminders (non-blocking)
                    try {
                        await twilioService.send1HourAppointmentReminder(appt);
                    } catch (smsErr) {
                        console.warn(`[CRON 1-Hour] SMS/WhatsApp delivery note for ${appt.id}:`, smsErr.message);
                    }

                    // 2. Real-time In-App Notifications
                    await createNotification({
                        userId: appt.clientId,
                        type: 'APPOINTMENT_REMINDER_1H',
                        title: '⏰ Appointment in 1 Hour!',
                        message: `Your consultation for ${appt.service?.name || 'Service'} with ${specialistName} starts at ${timeStr}.`,
                        link: '/dashboard/client'
                    });

                    if (appt.provider?.userId) {
                        await createNotification({
                            userId: appt.provider.userId,
                            type: 'APPOINTMENT_REMINDER_1H',
                            title: '⏰ Client Appointment in 1 Hour!',
                            message: `Upcoming session with ${clientName} for ${appt.service?.name || 'Service'} starts at ${timeStr}.`,
                            link: '/dashboard/provider'
                        });
                    }

                    sentOneHourReminders.add(appt.id);
                    console.log(`[CRON 1-Hour] Successfully sent reminders for appointment ${appt.id}`);
                } catch (itemErr) {
                    console.error(`[CRON 1-Hour] Error processing reminder for appointment ${appt.id}:`, itemErr);
                }
            }
        } catch (cronErr) {
            console.error('[CRON 1-Hour Error]:', cronErr);
        }
    });

    console.log('[CRON] Daily (24h) & High-Frequency (1h WhatsApp/SMS) appointment reminder jobs initialized.');
};

export default scheduleReminders;

