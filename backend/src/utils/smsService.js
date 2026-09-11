/**
 * SMS Service for sending OTPs and notifications via Fast2SMS
 * Falls back to console logging if no API key is provided for development.
 */
class SMSService {
    constructor() {
        this.apiKey = process.env.FAST2SMS_API_KEY;
        this.baseUrl = 'https://www.fast2sms.com/dev/bulkV2';

        if (!this.apiKey) {
            console.warn('Fast2SMS API KEY not found. SMS service will run in MOCK mode (console only).');
        }
    }

    /**
     * Send an OTP to a phone number
     * @param {string} to - Destination phone number
     * @param {string} otp - The 6-digit code
     * @returns {Promise<any>}
     */
    async sendOTP(to, otp) {
        const message = `Your Appointly verification code is: ${otp}. Valid for 2 minutes.`;

        if (!this.apiKey) {
            console.log('-------------------------------------------');
            console.log(`[MOCK SMS] To: ${to}`);
            console.log(`[MOCK SMS] Message: ${message}`);
            console.log('-------------------------------------------');
            return { mock: true, success: true };
        }

        try {
            // Normalize to 10-digit Indian mobile number for Fast2SMS
            const digitsOnly = to.replace(/\D/g, '');
            const cleanPhone = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;

            // Fast2SMS Quick SMS API (Fastest way for OTPs)
            const response = await fetch(`${this.baseUrl}?route=q&message=${encodeURIComponent(message)}&flash=0&numbers=${cleanPhone}`, {
                method: 'GET',
                headers: {
                    'authorization': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!data.return) {
                throw new Error(data.message || 'Fast2SMS request failed');
            }

            console.log(`OTP sent to ${to} via Fast2SMS: ${data.request_id}`);
            return data;
        } catch (error) {
            console.error('Failed to send Fast2SMS SMS:', error.message);
            throw error;
        }
    }

    /**
     * Send a custom notification SMS
     * @param {string} to - Destination phone number
     * @param {string} text - Message body
     */
    async sendNotification(to, text) {
        if (!this.apiKey) {
            console.log(`[MOCK SMS NOTIF] To: ${to} | Text: ${text}`);
            return;
        }

        try {
            await fetch(`${this.baseUrl}?route=q&message=${encodeURIComponent(text)}&flash=0&numbers=${to}`, {
                method: 'GET',
                headers: {
                    'authorization': this.apiKey
                }
            });
        } catch (error) {
            console.error('Failed to send SMS notification:', error.message);
        }
    }
}

const smsService = new SMSService();
export default smsService;
