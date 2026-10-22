import twilio from 'twilio';

/**
 * Twilio & WhatsApp Notification Service
 * Supports standard Twilio SMS, WhatsApp Sandbox, and production WhatsApp Business API.
 * Automatically runs in graceful simulation/mock mode if TWILIO credentials are not provided.
 */
class TwilioService {
    constructor() {
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.fromPhone = process.env.TWILIO_PHONE_NUMBER;
        this.whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Default Twilio Sandbox Number
        this.client = null;

        if (this.accountSid && this.authToken) {
            try {
                this.client = twilio(this.accountSid, this.authToken);
                console.log('[TwilioService] Twilio client initialized for SMS & WhatsApp.');
            } catch (err) {
                console.warn('[TwilioService] Failed to initialize Twilio client:', err.message);
            }
        } else {
            console.log('[TwilioService] Twilio credentials not found. Service will log SMS & WhatsApp in development mode.');
        }
    }

    /**
     * Format international phone number (+91 / E.164)
     */
    formatPhoneNumber(phone, defaultCountryCode = '+91') {
        if (!phone) return null;
        let clean = phone.replace(/[^0-9+]/g, '');
        if (!clean.startsWith('+')) {
            // If standard 10-digit Indian mobile number
            if (clean.length === 10) {
                clean = `${defaultCountryCode}${clean}`;
            } else {
                clean = `+${clean}`;
            }
        }
        return clean;
    }

    /**
     * Send SMS via Twilio
     */
    async sendSMS({ to, message }) {
        const formattedTo = this.formatPhoneNumber(to);
        if (!formattedTo) return { success: false, reason: 'Invalid phone number' };

        if (!this.client || !this.fromPhone) {
            console.log('\n================== [MOCK TWILIO SMS] ==================');
            console.log(`📱 To: ${formattedTo}`);
            console.log(`💬 Message: ${message}`);
            console.log('========================================================\n');
            return { success: true, mock: true };
        }

        try {
            const res = await this.client.messages.create({
                body: message,
                from: this.fromPhone,
                to: formattedTo
            });
            console.log(`[Twilio SMS] Dispatched to ${formattedTo}, SID: ${res.sid}`);
            return { success: true, sid: res.sid };
        } catch (error) {
            console.error('[Twilio SMS Error]:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send WhatsApp message via Twilio
     */
    async sendWhatsApp({ to, message }) {
        const formattedTo = this.formatPhoneNumber(to);
        if (!formattedTo) return { success: false, reason: 'Invalid phone number' };

        const whatsappTo = `whatsapp:${formattedTo}`;
        const whatsappFrom = this.whatsappFrom.startsWith('whatsapp:') ? this.whatsappFrom : `whatsapp:${this.whatsappFrom}`;

        if (!this.client) {
            console.log('\n================ [MOCK TWILIO WHATSAPP] ===============');
            console.log(`🟢 To: ${whatsappTo}`);
            console.log(`💬 Message:\n${message}`);
            console.log('========================================================\n');
            return { success: true, mock: true };
        }

        try {
            const res = await this.client.messages.create({
                body: message,
                from: whatsappFrom,
                to: whatsappTo
            });
            console.log(`[Twilio WhatsApp] Dispatched to ${whatsappTo}, SID: ${res.sid}`);
            return { success: true, sid: res.sid };
        } catch (error) {
            console.error('[Twilio WhatsApp Error]:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send 1-Hour Automated Reminder to Client and Provider via WhatsApp & SMS
     */
    async send1HourAppointmentReminder(appointment) {
        try {
            const clientName = appointment.client?.name || 'Valued Client';
            const providerName = appointment.provider?.user?.name || appointment.provider?.specialty || 'Specialist';
            const serviceName = appointment.service?.name || 'Appointment Consultation';
            const dateObj = new Date(appointment.date);
            const pad = (n) => String(n).padStart(2, '0');
            const h = dateObj.getUTCHours();
            const m = pad(dateObj.getUTCMinutes());
            const period = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 === 0 ? 12 : h % 12;
            const timeStr = `${h12}:${m} ${period}`;
            const yyyy = dateObj.getUTCFullYear();
            const mm = pad(dateObj.getUTCMonth() + 1);
            const dd = pad(dateObj.getUTCDate());
            const dateStr = `${yyyy}-${mm}-${dd}`;
            const address = appointment.serviceAddress || appointment.provider?.location || 'Appointly Virtual Clinic';

            // 1. Client WhatsApp & SMS reminder message
            const clientMsg = `⏰ *Upcoming Appointment in 1 Hour!*\n\nHello *${clientName}*,\nThis is a friendly reminder that your appointment is starting soon:\n\n🩺 *Service:* ${serviceName}\n👨‍⚕️ *Specialist:* Dr. ${providerName}\n📅 *Time:* Today (${dateStr}) at *${timeStr}*\n📍 *Location:* ${address}\n\n👉 View details or navigate: https://appointly.live/dashboard/client\n\nThank you for choosing *Appointly*!`;

            // 2. Provider WhatsApp & SMS reminder message
            const providerMsg = `⏰ *Patient Appointment in 1 Hour!*\n\nHello *Dr. ${providerName}*,\nYou have an upcoming consultation scheduled:\n\n👤 *Client:* ${clientName}\n🩺 *Service:* ${serviceName}\n📅 *Time:* Today at *${timeStr}*\n📍 *Address:* ${address}\n${appointment.note ? `📝 *Patient Note:* "${appointment.note}"\n` : ''}\n👉 View consultation details: https://appointly.live/dashboard/provider`;

            const clientPhone = appointment.client?.phone;
            const providerPhone = appointment.provider?.phone || appointment.provider?.user?.phone;

            // Send to client
            if (clientPhone) {
                await this.sendWhatsApp({ to: clientPhone, message: clientMsg });
                await this.sendSMS({ to: clientPhone, message: `Reminder: Your Appointly appointment for ${serviceName} with Dr. ${providerName} is at ${timeStr}.` });
            }

            // Send to provider
            if (providerPhone) {
                await this.sendWhatsApp({ to: providerPhone, message: providerMsg });
                await this.sendSMS({ to: providerPhone, message: `Reminder: You have an Appointly appointment with ${clientName} for ${serviceName} at ${timeStr}.` });
            }

            return { success: true };
        } catch (err) {
            console.error('[send1HourAppointmentReminder Error]:', err);
            return { success: false, error: err.message };
        }
    }
}

const twilioService = new TwilioService();
export default twilioService;
