/**
 * 1-Click Multi-Calendar Export Utility
 * Generates direct web-sync links and downloads RFC 5545 .ics files for:
 * - Google Calendar
 * - Apple Calendar / iCal (.ics)
 * - Microsoft Outlook Web & Outlook Desktop
 * - Microsoft Office 365
 * - Yahoo Calendar
 */

const pad = (n) => String(n).padStart(2, '0');

/**
 * Format date to ISO UTC format for calendar URLs (YYYYMMDDTHHmmssZ)
 */
export const formatCalendarDateUtc = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};

/**
 * Build Direct Google Calendar Sync URL
 */
export const buildGoogleCalendarUrl = ({ title, details, location, startDate, durationMinutes = 30 }) => {
    const start = new Date(startDate);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const dates = `${formatCalendarDateUtc(start)}/${formatCalendarDateUtc(end)}`;

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        dates: dates,
        details: details || 'Booked with Appointly Appointment Platform (https://appointly.live)',
        location: location || 'Appointly Virtual / In-Person Consultation'
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Build Direct Microsoft Outlook Web Sync URL
 */
export const buildOutlookLiveUrl = ({ title, details, location, startDate, durationMinutes = 30 }) => {
    const start = new Date(startDate);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: title,
        startdt: start.toISOString(),
        enddt: end.toISOString(),
        body: details || 'Booked via Appointly',
        location: location || ''
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

/**
 * Build Direct Microsoft Office 365 Sync URL
 */
export const buildOffice365Url = ({ title, details, location, startDate, durationMinutes = 30 }) => {
    const start = new Date(startDate);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: title,
        startdt: start.toISOString(),
        enddt: end.toISOString(),
        body: details || 'Booked via Appointly',
        location: location || ''
    });

    return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
};

/**
 * Build Direct Yahoo Calendar Sync URL
 */
export const buildYahooCalendarUrl = ({ title, details, location, startDate, durationMinutes = 30 }) => {
    const start = new Date(startDate);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const params = new URLSearchParams({
        v: '60',
        title: title,
        st: formatCalendarDateUtc(start),
        et: formatCalendarDateUtc(end),
        desc: details || 'Booked with Appointly',
        in_loc: location || ''
    });

    return `https://calendar.yahoo.com/?${params.toString()}`;
};

/**
 * Generate and trigger direct download of .ics file (Apple Calendar / Outlook / iCal)
 */
export const downloadIcsCalendarFile = ({ title, details, location, startDate, durationMinutes = 30, filename = 'appointly-booking.ics' }) => {
    const start = new Date(startDate);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const dtstamp = formatCalendarDateUtc(new Date());
    const dtstart = formatCalendarDateUtc(start);
    const dtend = formatCalendarDateUtc(end);

    const escapeText = (str) => (str || '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');

    const icsString = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Appointly Inc//Appointment Booking Platform//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:appt-${Date.now()}@appointly.live`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:${escapeText(title)}`,
        `DESCRIPTION:${escapeText(details)}`,
        `LOCATION:${escapeText(location)}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT1H',
        'ACTION:DISPLAY',
        `DESCRIPTION:Reminder: ${escapeText(title)} in 1 hour`,
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Reminder: ${escapeText(title)} in 15 minutes`,
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(link.href), 100);
};
