import emailjs from '@emailjs/nodejs';
import dotenv from 'dotenv';

dotenv.config();

// Helper to send using the "Generic" EmailJS template
const sendGenericEmailJS = async ({ to_name, to_email, subject, html_message }) => {
    try {
        if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_GENERIC_TEMPLATE_ID || !process.env.EMAILJS_PUBLIC_KEY || !process.env.EMAILJS_PRIVATE_KEY) {
            console.warn(`[EmailJS] Missing credentials for GENERIC template. Cannot send email "${subject}" to ${to_email}`);
            return;
        }

        const templateParams = {
            to_name,
            to_email,
            subject,
            message: html_message, // Triple braces {{{message}}} should be used in the EmailJS dashboard
        };

        const response = await emailjs.send(
            process.env.EMAILJS_SERVICE_ID,
            process.env.EMAILJS_GENERIC_TEMPLATE_ID,
            templateParams,
            {
                publicKey: process.env.EMAILJS_PUBLIC_KEY,
                privateKey: process.env.EMAILJS_PRIVATE_KEY,
            }
        );

        console.log(`[EmailJS] Sent "${subject}" to ${to_email} successfully!`, response.status);
        return response;
    } catch (error) {
        console.error(`[EmailJS] Failed to send "${subject}":`, error);
    }
};

// --- Template Helpers ---

export const sendWelcomeEmail = async (user) => {
    const subject = 'Welcome to Appointly!';
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #4f46e5;">Welcome to Appointly, ${user.name}!</h1>
            <p>We're thrilled to have you join our platform. Whether you're here to book appointments or offer your services, we're here to make it easy.</p>
            <p>Your account has been successfully created as a <strong>${user.role.toLowerCase()}</strong>.</p>
            <div style="margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Get Started</a>
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't create this account, please ignore this email.</p>
        </div>
    `;
    return sendGenericEmailJS({ to_name: user.name, to_email: user.email, subject, html_message: html });
};

export const sendBookingRequestEmail = async (appointment) => {
    const subject = 'New Booking Request - Appointly';
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4f46e5;">New Appointment Request</h2>
            <p>Hi ${appointment.provider.user.name},</p>
            <p>You have received a new booking request for <strong>${appointment.service.name}</strong>.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Client:</strong> ${appointment.client.name}</p>
                <p><strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${new Date(appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <p>Please log in to your dashboard to confirm or decline this request.</p>
            <div style="margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/provider" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Request</a>
            </div>
        </div>
    `;
    return sendGenericEmailJS({ to_name: appointment.provider.user.name, to_email: appointment.provider.user.email, subject, html_message: html });
};

export const sendBookingStatusEmail = async (appointment) => {
    const status = appointment.status.toLowerCase();
    const subject = `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)} - Appointly`;
    const isPositive = status === 'confirmed' || status === 'completed';

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: ${isPositive ? '#10b981' : '#ef4444'};">Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
            <p>Hi ${appointment.client.name},</p>
            <p>Your appointment with <strong>${appointment.provider.user.name}</strong> for <strong>${appointment.service.name}</strong> has been <strong>${status}</strong>.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Service:</strong> ${appointment.service.name}</p>
                <p><strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${new Date(appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div style="margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/client" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
            </div>
        </div>
    `;
    return sendGenericEmailJS({ to_name: appointment.client.name, to_email: appointment.client.email, subject, html_message: html });
};

export const sendServiceCompletionEmail = async (appointment) => {
    const subject = 'Thank You for using Appointly!';
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: center;">
            <div style="font-size: 50px; margin-bottom: 20px;">✨</div>
            <h2 style="color: #4f46e5;">Service Completed!</h2>
            <p>Hi ${appointment.client.name},</p>
            <p>We hope you had a great experience with <strong>${appointment.provider.user.name}</strong> for your <strong>${appointment.service.name}</strong> session today.</p>
            <p>Your feedback helps our professionals grow and helps other clients make better choices.</p>
            <div style="margin: 35px 0; background: #f3f4f6; padding: 25px; border-radius: 12px;">
                <h3 style="margin-top: 0; color: #1f2937;">How was your session?</h3>
                <p style="color: #4b5563; margin-bottom: 25px;">It only takes a minute to share your thoughts.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/provider/${appointment.provider.id}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Leave a Review</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Thank you for choosing Appointly!</p>
        </div>
    `;
    return sendGenericEmailJS({ to_name: appointment.client.name, to_email: appointment.client.email, subject, html_message: html });
};

export const sendPasswordResetEmail = async (user, otp) => {
    const subject = 'Your Password Reset OTP - Appointly';
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: center;">
            <h2 style="color: #4f46e5;">Password Reset Request</h2>
            <p>Hi ${user.name},</p>
            <p>You requested to reset your password. Use the code below to set a new one. This code will expire in <strong>2 minutes</strong>.</p>
            <div style="margin: 30px 0; background: #f3f4f6; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">
                ${otp}
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
    `;
    return sendGenericEmailJS({ to_name: user.name, to_email: user.email, subject, html_message: html });
};

export const sendVerificationEmail = async (user, otp) => {
    const subject = 'Verify your email - Appointly';
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: center;">
            <h2 style="color: #4f46e5;">Email Verification</h2>
            <p>Hi ${user.name},</p>
            <p>Please use the code below to verify your email address. This code will expire in <strong>2 minutes</strong>.</p>
            <div style="margin: 30px 0; background: #f3f4f6; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">
                ${otp}
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
    `;
    return sendGenericEmailJS({ to_name: user.name, to_email: user.email, subject, html_message: html });
};

// --- EmailJS Reminders (Daily Cron) ---

export const sendEmailJSReminder = async (clientName, providerName, clientEmail, providerEmail, date, time) => {
    try {
        if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_TEMPLATE_ID || !process.env.EMAILJS_PUBLIC_KEY || !process.env.EMAILJS_PRIVATE_KEY) {
            console.warn('[EmailJS] Credentials missing. Skipping daily reminder email.');
            return;
        }

        const templateParams = {
            client_name: clientName,
            provider_name: providerName,
            client_email: clientEmail,
            provider_email: providerEmail,
            appointment_date: date,
            appointment_time: time,
        };

        const response = await emailjs.send(
            process.env.EMAILJS_SERVICE_ID,
            process.env.EMAILJS_TEMPLATE_ID,
            templateParams,
            {
                publicKey: process.env.EMAILJS_PUBLIC_KEY,
                privateKey: process.env.EMAILJS_PRIVATE_KEY,
            }
        );
        console.log('[EmailJS] Reminder sent successfully!', response.status);
        return response;
    } catch (error) {
        console.error('[EmailJS] Reminder failed:', error);
    }
};
