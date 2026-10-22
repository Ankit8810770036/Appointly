import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://127.0.0.1:5000/api';

async function runFlowCheck() {
    console.log('====================================================');
    console.log('🚀 RUNNING APPOINTLY END-TO-END FLOW AUDIT');
    console.log('====================================================\n');

    const results = {
        part1: [],
        part2: [],
        part3: []
    };

    // Helper fetch wrapper
    async function api(path, options = {}) {
        const url = `${BASE_URL}${path}`;
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });
        const contentType = res.headers.get('content-type') || '';
        let data;
        if (contentType.includes('application/json')) {
            data = await res.json();
        } else {
            data = await res.text();
        }
        return { status: res.status, ok: res.ok, data, headers: res.headers };
    }

    // ─────────────────────────────────────────────────────────────
    // PART 1: Profile Creation & Validation Checks
    // ─────────────────────────────────────────────────────────────
    console.log('--- PART 1: VALIDATION & AUTHENTICATION CHECKS ---');

    // 1.1 Empty register check
    const emptySignup = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({})
    });
    const emptyOk = emptySignup.status === 400 && emptySignup.data?.message === 'Email is required';
    results.part1.push({
        test: 'Empty Signup Validation (Missing Email)',
        passed: emptyOk,
        detail: `Status ${emptySignup.status} - Message: "${emptySignup.data?.message}"`
    });
    console.log(`[${emptyOk ? 'PASS' : 'FAIL'}] 1.1 Empty Signup:`, emptySignup.data?.message);

    // 1.2 Provider Registration without required bio / specialty (< 50 chars bio)
    const invalidProvider = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            name: 'Short Bio Doctor',
            email: 'shortbio_doctor_test@appointly.in',
            password: 'ValidPassword123!',
            role: 'PROVIDER',
            phone: '+91 99999 88888',
            location: 'Mumbai',
            specialty: 'Cardiologist',
            bio: 'Too short'
        })
    });
    const bioOk = invalidProvider.status === 400 && invalidProvider.data?.message?.includes('bio min 50 chars');
    results.part1.push({
        test: 'Provider Profile Validation (Bio min 50 chars)',
        passed: bioOk,
        detail: `Status ${invalidProvider.status} - Message: "${invalidProvider.data?.message}"`
    });
    console.log(`[${bioOk ? 'PASS' : 'FAIL'}] 1.2 Provider Bio Check:`, invalidProvider.data?.message);

    // 1.3 Unverified Email/Phone registration block
    const unverifiedSignup = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            name: 'Unverified Test',
            email: 'unverified_flow_check@appointly.in',
            password: 'StrongPassword123!',
            role: 'CLIENT'
        })
    });
    const otpGateOk = unverifiedSignup.status === 400 && unverifiedSignup.data?.message?.includes('verified before registration');
    results.part1.push({
        test: 'Security OTP Gate (Unverified Email Block)',
        passed: otpGateOk,
        detail: `Status ${unverifiedSignup.status} - Message: "${unverifiedSignup.data?.message}"`
    });
    console.log(`[${otpGateOk ? 'PASS' : 'FAIL'}] 1.3 Unverified Email Gate:`, unverifiedSignup.data?.message);

    // 1.4 Role Switch Mismatch on Login
    const roleMismatchLogin = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: 'rahul@client.com',
            password: 'password123',
            role: 'PROVIDER' // Client trying to login via Provider tab
        })
    });
    const roleMismatchOk = roleMismatchLogin.status === 401 && roleMismatchLogin.data?.message?.includes('switch tabs');
    results.part1.push({
        test: 'Role-Based Tab Mismatch Guard on Login',
        passed: roleMismatchOk,
        detail: `Status ${roleMismatchLogin.status} - Message: "${roleMismatchLogin.data?.message}"`
    });
    console.log(`[${roleMismatchOk ? 'PASS' : 'FAIL'}] 1.4 Role Tab Mismatch:`, roleMismatchLogin.data?.message);

    // 1.5 Client Login check (Rahul Sharma - Mumbai)
    const clientLogin = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: 'rahul@client.com',
            password: 'password123',
            role: 'CLIENT'
        })
    });
    const clientLoginOk = clientLogin.ok && clientLogin.data?.token;
    const clientToken = clientLogin.data?.token;
    const clientUserId = clientLogin.data?.id;
    const clientUserName = clientLogin.data?.name;
    results.part1.push({
        test: 'Client Authentication (rahul@client.com)',
        passed: Boolean(clientLoginOk),
        detail: clientLoginOk ? `Logged in as ${clientUserName} (${clientLogin.data?.role})` : clientLogin.data?.message
    });
    console.log(`[${clientLoginOk ? 'PASS' : 'FAIL'}] 1.5 Client Login:`, clientLoginOk ? clientUserName : clientLogin.data?.message);

    // 1.6 Provider Login check (Deepika Padukone - Mumbai)
    const providerLogin = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: 'deepika@provider.com',
            password: 'password123',
            role: 'PROVIDER'
        })
    });
    const providerLoginOk = providerLogin.ok && providerLogin.data?.token;
    const providerToken = providerLogin.data?.token;
    const providerUserId = providerLogin.data?.id;
    const providerUserName = providerLogin.data?.name;
    results.part1.push({
        test: 'Provider Authentication (deepika@provider.com)',
        passed: Boolean(providerLoginOk),
        detail: providerLoginOk ? `Logged in as ${providerUserName} (${providerLogin.data?.role})` : providerLogin.data?.message
    });
    console.log(`[${providerLoginOk ? 'PASS' : 'FAIL'}] 1.6 Provider Login:`, providerLoginOk ? providerUserName : providerLogin.data?.message);

    // ─────────────────────────────────────────────────────────────
    // PART 2: Map Discovery & Booking Flow (Slot Hold & 50km Limit)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- PART 2: MAP DISCOVERY, 50KM RESTRICTION & BOOKING FLOW ---');

    // 2.1 Provider Search & Profile in Mumbai
    const providerProfile = await prisma.providerProfile.findFirst({
        where: { user: { email: 'deepika@provider.com' } },
        include: { services: true, user: true }
    });
    const provFoundOk = Boolean(providerProfile && providerProfile.services.length > 0);
    results.part2.push({
        test: 'Provider Discovery on Map',
        passed: provFoundOk,
        detail: provFoundOk ? `Found ${providerProfile.user.name} - Services: ${providerProfile.services.map(s => s.name).join(', ')}` : 'Provider profile not found'
    });
    console.log(`[${provFoundOk ? 'PASS' : 'FAIL'}] 2.1 Provider Discovery:`, providerProfile?.user?.name, 'Services:', providerProfile?.services?.length);

    const testService = providerProfile.services[0];
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 4);
    appointmentDate.setHours(15, 0, 0, 0); // 3:00 PM
    const dateStr = appointmentDate.toISOString().split('T')[0];
    const timeStr = '15:00';

    // 2.2 Test 5-Minute Slot Hold Acquisition
    const holdRes = await api('/appointments/hold-slot', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
            providerId: providerProfile.id,
            date: dateStr,
            time: timeStr
        })
    });
    const holdOk = holdRes.ok && (holdRes.data?.success || holdRes.data?.remainingSeconds);
    results.part2.push({
        test: '5-Minute Slot Hold Countdown Lock API',
        passed: Boolean(holdOk),
        detail: `Hold Status: ${holdRes.status} - Remaining: ${holdRes.data?.remainingSeconds}s`
    });
    console.log(`[${holdOk ? 'PASS' : 'FAIL'}] 2.2 Slot Hold:`, holdRes.data?.message || `Held with ${holdRes.data?.remainingSeconds}s`);

    // 2.3 Test Double Slot Hold Conflict Guard (Priya Patel in Ahmedabad)
    const priyaLogin = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'priya@client.com', password: 'password123', role: 'CLIENT' })
    });
    const priyaToken = priyaLogin.data?.token;
    const conflictHold = await api('/appointments/hold-slot', {
        method: 'POST',
        headers: { Authorization: `Bearer ${priyaToken}` },
        body: JSON.stringify({
            providerId: providerProfile.id,
            date: dateStr,
            time: timeStr
        })
    });
    const conflictPrevented = conflictHold.status === 409;
    results.part2.push({
        test: 'Concurrent Slot Lock Conflict Guard (HTTP 409)',
        passed: conflictPrevented,
        detail: `Status ${conflictHold.status} - Message: "${conflictHold.data?.message}"`
    });
    console.log(`[${conflictPrevented ? 'PASS' : 'FAIL'}] 2.3 Slot Conflict Guard:`, conflictHold.data?.message);

    // 2.4 Strict 50 km Hard Limit Violation Rejection (> 50 km away)
    // Delhi coordinates: 28.6304, 77.2177 (Mumbai is ~1150 km away)
    const farBooking = await api('/appointments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
            providerId: providerProfile.id,
            serviceId: testService.id,
            date: appointmentDate.toISOString(),
            note: 'Testing >50km rejection',
            streetAddress: 'Connaught Place',
            city: 'New Delhi',
            state: 'Delhi',
            latitude: 28.6304,
            longitude: 77.2177
        })
    });
    const farRejected = farBooking.status === 400 && farBooking.data?.message?.includes('50 km');
    results.part2.push({
        test: 'Strict 50 km Radius Distance Limit Enforcement',
        passed: farRejected,
        detail: `Status ${farBooking.status} - Response: "${farBooking.data?.message}"`
    });
    console.log(`[${farRejected ? 'PASS' : 'FAIL'}] 2.4 Strict 50km Limit Enforced:`, farBooking.data?.message);

    // 2.5 Successful Booking Within 50 km (Mumbai: Nariman Point to Bandra ~15 km)
    await prisma.appointment.deleteMany({
        where: {
            providerId: providerProfile.id,
            date: appointmentDate
        }
    });

    const validBooking = await api('/appointments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
            providerId: providerProfile.id,
            serviceId: testService.id,
            date: appointmentDate.toISOString(),
            note: 'Confirmed E2E Flow Appointment',
            streetAddress: '14 Marine Drive',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400020',
            latitude: 18.9438,
            longitude: 72.8234
        })
    });
    const bookingCreatedOk = validBooking.status === 201 && validBooking.data?.id;
    const createdAppt = validBooking.data;
    results.part2.push({
        test: 'Confirmed Appointment Booking Within 50 km',
        passed: Boolean(bookingCreatedOk),
        detail: bookingCreatedOk ? `Appointment ID: ${createdAppt.id} - Status: ${createdAppt.status}` : validBooking.data?.message
    });
    console.log(`[${bookingCreatedOk ? 'PASS' : 'FAIL'}] 2.5 Appointment Created:`, bookingCreatedOk ? `ID: ${createdAppt.id}` : validBooking.data?.message);

    // ─────────────────────────────────────────────────────────────
    // PART 3: Feedback, Chat & Extra Features Check
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- PART 3: FEEDBACK, REAL-TIME CHAT & CALENDAR EXPORT ---');

    // 3.1 Real-Time Chat: Client sends message to Provider
    const sendMsg = await api('/messages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
            receiverId: providerUserId,
            content: 'Hello Deepika! I have booked a session and look forward to meeting you.'
        })
    });
    const msgOk = sendMsg.status === 201 && sendMsg.data?.id;
    results.part3.push({
        test: 'Direct Chat Messaging (Client -> Provider)',
        passed: Boolean(msgOk),
        detail: msgOk ? `Message ID: ${sendMsg.data.id} - Content: "${sendMsg.data.content}"` : sendMsg.data?.message
    });
    console.log(`[${msgOk ? 'PASS' : 'FAIL'}] 3.1 Send Message:`, msgOk ? sendMsg.data.content : sendMsg.data?.message);

    // 3.2 Chat History & Conversation Thread Retrieval
    const threadRes = await api(`/messages/with/${providerUserId}`, {
        headers: { Authorization: `Bearer ${clientToken}` }
    });
    const threadOk = threadRes.ok && Array.isArray(threadRes.data) && threadRes.data.length > 0;
    results.part3.push({
        test: 'Chat Conversation History Retrieval',
        passed: threadOk,
        detail: threadOk ? `Found ${threadRes.data.length} messages in conversation` : 'Failed to retrieve conversation'
    });
    console.log(`[${threadOk ? 'PASS' : 'FAIL'}] 3.2 Chat History:`, threadRes.data?.length, 'messages retrieved');

    // 3.3 Provider Marks Conversation as Read
    const markReadRes = await api(`/messages/read/${clientUserId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${providerToken}` }
    });
    const markReadOk = markReadRes.ok;
    results.part3.push({
        test: 'Provider Read Receipts Synchronization',
        passed: markReadOk,
        detail: `Status ${markReadRes.status}`
    });
    console.log(`[${markReadOk ? 'PASS' : 'FAIL'}] 3.3 Read Receipt:`, markReadRes.status);

    // 3.4 Client Platform Feedback Submission
    const feedbackRes = await api('/site-reviews', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
            name: clientUserName,
            role: 'Client / Patient',
            rating: 5,
            comment: 'Flawless experience! The 5-minute slot hold and map navigation make finding specialists effortless.'
        })
    });
    const feedbackOk = feedbackRes.status === 201 && feedbackRes.data?.id;
    results.part3.push({
        test: 'Client Platform Feedback & Review Submission',
        passed: Boolean(feedbackOk),
        detail: feedbackOk ? `Feedback ID: ${feedbackRes.data.id} - Rating: ${feedbackRes.data.rating} Stars` : feedbackRes.data?.message
    });
    console.log(`[${feedbackOk ? 'PASS' : 'FAIL'}] 3.4 Platform Feedback:`, feedbackOk ? `Rated ${feedbackRes.data.rating} Stars` : feedbackRes.data?.message);

    // 3.5 Calendar Export: RFC 5545 iCalendar (.ics) Generation
    if (createdAppt?.id) {
        const icsRes = await api(`/appointments/${createdAppt.id}/ics`);
        const isIcsMime = icsRes.headers.get('content-type')?.includes('text/calendar');
        const icsContent = typeof icsRes.data === 'string' ? icsRes.data : '';
        const hasVCalendar = icsContent.includes('BEGIN:VCALENDAR') && icsContent.includes('END:VCALENDAR');
        const calendarOk = isIcsMime && hasVCalendar;
        results.part3.push({
            test: 'Universal Calendar Export (.ics / Google / Apple / Outlook)',
            passed: calendarOk,
            detail: calendarOk ? `Valid RFC 5545 iCalendar stream with Content-Type text/calendar` : `MIME: ${icsRes.headers.get('content-type')}`
        });
        console.log(`[${calendarOk ? 'PASS' : 'FAIL'}] 3.5 Calendar Export:`, calendarOk ? 'Valid .ics stream generated' : 'Failed');
    }

    // 3.6 Client Dashboard Appointments Sync
    const myAppts = await api('/appointments', {
        headers: { Authorization: `Bearer ${clientToken}` }
    });
    const syncOk = myAppts.ok && Array.isArray(myAppts.data) && myAppts.data.some(a => a.id === createdAppt?.id);
    results.part3.push({
        test: 'Client Dashboard Appointment Sync & Persistence',
        passed: syncOk,
        detail: syncOk ? `Found appointment ${createdAppt?.id} in client's appointments` : 'Appointment not found in list'
    });
    console.log(`[${syncOk ? 'PASS' : 'FAIL'}] 3.6 Dashboard Appointments:`, syncOk ? 'Appointment correctly synchronized' : 'Failed');

    // ─────────────────────────────────────────────────────────────
    // SUMMARY REPORT
    // ─────────────────────────────────────────────────────────────
    console.log('\n====================================================');
    console.log('📊 AUDIT SUMMARY REPORT');
    console.log('====================================================');
    let totalTests = 0;
    let totalPassed = 0;

    for (const [part, list] of Object.entries(results)) {
        console.log(`\n${part.toUpperCase()}:`);
        list.forEach(t => {
            totalTests++;
            if (t.passed) totalPassed++;
            console.log(`  [${t.passed ? '✅ PASS' : '❌ FAIL'}] ${t.test}: ${t.detail}`);
        });
    }

    console.log(`\n====================================================`);
    console.log(`TOTAL RESULT: ${totalPassed} / ${totalTests} TESTS PASSED (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
    console.log('====================================================\n');

    await prisma.$disconnect();
}

runFlowCheck().catch(err => {
    console.error('Fatal Flow Check Error:', err);
    process.exit(1);
});
