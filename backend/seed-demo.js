import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs';

const prisma = new PrismaClient();

async function seed() {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password1234', salt);

    const clientData = [
        { name: 'John Doe', email: 'john@example.com', role: 'CLIENT', phone: '+91 90000 00001', location: 'Indiranagar, Bengaluru' },
        { name: 'Jane Smith', email: 'jane@example.com', role: 'CLIENT', phone: '+91 90000 00002', location: 'Whitefield, Bengaluru' },
        { name: 'Alice Brown', email: 'alice@example.com', role: 'CLIENT', phone: '+91 90000 00003', location: 'Koramangala, Bengaluru' },
        { name: 'Bob Wilson', email: 'bob@example.com', role: 'CLIENT', phone: '+91 90000 00004', location: 'HSR Layout, Bengaluru' },
        { name: 'Charlie Davis', email: 'charlie@example.com', role: 'CLIENT', phone: '+91 90000 00005', location: 'Jayanagar, Bengaluru' },
        { name: 'Sarah Connor', email: 'sarah.c@example.com', role: 'CLIENT', phone: '+91 90000 00006', location: 'Andheri, Mumbai' },
        { name: 'James Bond', email: 'bond@example.com', role: 'CLIENT', phone: '+91 90000 00007', location: 'South Mumbai' },
        { name: 'Peter Parker', email: 'peter@example.com', role: 'CLIENT', phone: '+91 90000 00008', location: 'Queens, New York' },
        { name: 'Bruce Wayne', email: 'bruce@example.com', role: 'CLIENT', phone: '+91 90000 00009', location: 'Gotham City' },
        { name: 'Tony Stark', email: 'tony@example.com', role: 'CLIENT', phone: '+91 90000 00010', location: 'Malibu, California' },
    ];

    const providerData = [
        { name: 'Dr. Ramesh', email: 'ramesh@gmail.com', role: 'PROVIDER', phone: '+91 88107 70036', location: 'Sector 62, Noida', specialty: 'Dentist', bio: 'Experienced dentist with over 10 years of practice in oral health.' },
        { name: 'Sarah Miller', email: 'sarah@example.com', role: 'PROVIDER', phone: '+91 80000 00007', location: 'Uptown, Mumbai', specialty: 'Yoga Instructor', bio: 'Certified yoga instructor specializing in Hatha and Vinyasa yoga.' },
        { name: 'Mike Ross', email: 'mike@example.com', role: 'PROVIDER', phone: '+91 80000 00008', location: 'Downtown, Delhi', specialty: 'Legal Consultant', bio: 'Business law expert providing consultation for startups and SMEs.' },
        { name: 'Emma Watson', email: 'emma@example.com', role: 'PROVIDER', phone: '+91 80000 00009', location: 'Education Hub, Pune', specialty: 'Education Specialist', bio: 'Academic advisor and career counselor with a passion for student success.' },
        { name: 'David Goggins', email: 'david@example.com', role: 'PROVIDER', phone: '+91 80000 00010', location: 'Fitness Park, Hyderabad', specialty: 'Fitness Trainer', bio: 'High-intensity interval training specialist focused on endurance and strength.' },
        { name: 'Dr. Aisha Khan', email: 'aisha@example.com', role: 'PROVIDER', phone: '+91 80000 00011', location: 'Road No 10, Hyderabad', specialty: 'Cardiologist', bio: 'Specialist in heart health and preventative cardiology.' },
        { name: 'Liam O\'Brien', email: 'liam@example.com', role: 'PROVIDER', phone: '+91 80000 00012', location: 'Dublin Area', specialty: 'Plumber', bio: 'Expert plumbing services for residential and commercial properties.' },
        { name: 'Sophia Chen', email: 'sophia@example.com', role: 'PROVIDER', phone: '+91 80000 00013', location: 'Tech Park, Singapore', specialty: 'Electrician', bio: 'Certified electrician for smart home setups and electrical safety.' },
        { name: 'Marcus Thorne', email: 'marcus@example.com', role: 'PROVIDER', phone: '+91 80000 00014', location: 'Central London', specialty: 'Barber', bio: 'Master barber specializing in classic cuts and beard grooming.' },
        { name: 'Elena Rodriguez', email: 'elena@example.com', role: 'PROVIDER', phone: '+91 80000 00015', location: 'Barcelona Center', specialty: 'Therapist', bio: 'Licensed therapist focusing on mental wellness and work-life balance.' },
    ];

    const siteReviews = [
        { name: 'Priya Sharma', rating: 5, comment: 'Finding and booking Dr. Ramesh took less than 2 minutes. Super smooth experience!' },
        { name: 'Arjun Verma', rating: 5, comment: 'I love that I can see real-time availability and cancel if needed. Game changer.' },
        { name: 'Neha Gupta', rating: 4, comment: 'Saved me so much time. The reminders are a great touch — never missed an appointment.' },
        { name: 'Rahul Singh', rating: 5, comment: 'The interface is so clean and easy to use. Highly recommended for busy people.' },
        { name: 'Ananya Iyer', rating: 5, comment: 'Finally a way to book my salon without calling and waiting on hold!' }
    ];

    console.log('Cleaning existing data...');
    await prisma.review.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.message.deleteMany();
    await prisma.service.deleteMany();
    await prisma.siteReview.deleteMany();
    await prisma.providerProfile.deleteMany();
    await prisma.user.deleteMany();

    console.log('Seeding clients...');
    for (const c of clientData) {
        await prisma.user.create({
            data: { ...c, password: hashedPassword }
        });
    }

    console.log('Seeding providers...');
    for (const p of providerData) {
        const { specialty, bio, ...userData } = p;
        await prisma.user.create({
            data: {
                ...userData,
                password: hashedPassword,
                providerProfile: {
                    create: {
                        specialty,
                        about: bio,
                        location: userData.location,
                        phone: userData.phone
                    }
                }
            }
        });
    }

    // Create demo services for providers
    const providers = await prisma.providerProfile.findMany({ include: { user: true } });
    for (const p of providers) {
        await prisma.service.create({
            data: {
                providerProfileId: p.id,
                name: `${p.specialty} Consultation`,
                duration: 30,
                price: p.user.name.includes('Dr.') ? 500 : 800
            }
        });
        await prisma.service.create({
            data: {
                providerProfileId: p.id,
                name: `Premium ${p.specialty} Session`,
                duration: 60,
                price: p.user.name.includes('Dr.') ? 1000 : 1500
            }
        });
    }

    console.log('Generating credentials file...');
    let content = 'Appointly Demo Credentials\n';
    content += '==========================\n\n';
    content += 'Common Password for all accounts: password1234\n\n';

    content += 'DEMO CLIENTS:\n';
    content += '--------------------------\n';
    clientData.forEach(c => {
        content += `Name: ${c.name}\nEmail: ${c.email}\nPhone: ${c.phone}\nLocation: ${c.location}\n\n`;
    });

    content += 'DEMO PROVIDERS:\n';
    content += '--------------------------\n';
    providerData.forEach(p => {
        content += `Name: ${p.name}\nEmail: ${p.email}\nSpecialty: ${p.specialty}\nLocation: ${p.location}\n\n`;
    });

    console.log('Seeding site reviews...');
    for (const r of siteReviews) {
        await prisma.siteReview.create({
            data: r
        });
    }

    fs.writeFileSync('demo_credentials.txt', content);
    console.log('Seed complete! Created demo_credentials.txt');

    await prisma.$disconnect();
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});