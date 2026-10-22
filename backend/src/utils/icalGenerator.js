/**
 * RFC 5545 iCalendar standard (.ics) generator
 * Creates calendar event payloads compatible with Apple Calendar, Google Calendar, Outlook, and mobile OSes.
 */

const formatIcsDate = (date) => {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};

const escapeIcsText = (str) => {
    if (!str) return '';
    return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
};

/**
 * Generate .ics content string for an appointment
 * @param {Object} appointment
 * @returns {string} RFC 5545 compliant iCalendar string
 */
export const generateAppointmentIcs = (appointment) => {
    const startDate = new Date(appointment.date);
    const durationMinutes = appointment.service?.duration || 30;
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    const clientName = appointment.client?.name || 'Client';
    const clientEmail = appointment.client?.email || 'client@appointly.com';
    const providerName = appointment.provider?.user?.name || appointment.provider?.specialty || 'Specialist';
    const providerEmail = appointment.provider?.user?.email || 'specialist@appointly.com';
    const serviceName = appointment.service?.name || 'Specialist Consultation';
    const location = appointment.serviceAddress || appointment.provider?.location || 'Appointly Video / In-Person Consultation';

    const summary = `${serviceName} with ${providerName}`;
    const description = `Appointment booked on Appointly.\n\nSpecialist: ${providerName}\nClient: ${clientName}\nService: ${serviceName}\nDuration: ${durationMinutes} minutes\n${appointment.note ? `Note: ${appointment.note}\n` : ''}\nNeed help or want to reschedule? Visit: https://appointly.live/dashboard/client`;

    const uid = `appt-${appointment.id || Date.now()}@appointly.live`;
    const dtstamp = formatIcsDate(new Date());
    const dtstart = formatIcsDate(startDate);
    const dtend = formatIcsDate(endDate);

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Appointly Inc//Appointment Booking System//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:${escapeIcsText(summary)}`,
        `DESCRIPTION:${escapeIcsText(description)}`,
        `LOCATION:${escapeIcsText(location)}`,
        `ORGANIZER;CN="${escapeIcsText(providerName)}":mailto:${providerEmail}`,
        `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN="${escapeIcsText(clientName)}":mailto:${clientEmail}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT60M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Reminder: ${escapeIcsText(summary)} starts in 1 hour`,
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Reminder: ${escapeIcsText(summary)} starts in 15 minutes`,
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
};
