import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    console.log('🚀 Seeding 5 demo records...');

    // 1. Clients
    const clients = [
        { name: 'Rahul Sharma', email: 'rahul@client.com' },
        { name: 'Priya Patel', email: 'priya@client.com' },
        { name: 'Amit Singh', email: 'amit@client.com' },
        { name: 'Sonal Verma', email: 'sonal@client.com' },
        { name: 'Vikram Rao', email: 'vikram@client.com' },
    ];

    for (const c of clients) {
        await prisma.user.create({
            data: {
                ...c,
                password: hashedPassword,
                role: 'CLIENT',
                phone: '+91 98765 43210',
                location: 'Bengaluru, India'
            }
        });
    }
    console.log('✅ 5 Clients created');

    // 2. Providers
    const providers = [
        { name: 'Dr. Ankit Singh', email: 'ankit@provider.com', specialty: 'Dentist', about: 'Experienced dental surgeon with a focus on painless treatments.' },
        { name: 'Deepika Padukone', email: 'deepika@provider.com', specialty: 'Yoga Instructor', about: 'Professional wellness coach helping you find balance and peace.' },
        { name: 'Sunil Gavaskar', email: 'sunil@provider.com', specialty: 'Legal Consultant', about: 'Corporate law specialist with 20 years of experience.' },
        { name: 'Kiran Mazumdar', email: 'kiran@provider.com', specialty: 'Education Consultant', about: 'Helping students achieve their dreams in global universities.' },
        { name: 'Arjun Kapur', email: 'arjun@provider.com', specialty: 'Plumber', about: 'Expert plumbing solutions for modern homes and offices.' },
    ];

    for (const p of providers) {
        const { specialty, about, ...userData } = p;
        await prisma.user.create({
            data: {
                ...userData,
                password: hashedPassword,
                role: 'PROVIDER',
                phone: '+91 88107 70036',
                location: 'Delhi NCR, India',
                providerProfile: {
                    create: {
                        specialty,
                        about,
                        location: 'Delhi NCR, India',
                        phone: '+91 88107 70036',
                        services: {
                            create: [
                                { name: `Standard ${specialty} Session`, duration: 30, price: 500 },
                                { name: `Premium ${specialty} Consultation`, duration: 60, price: 1200 }
                            ]
                        }
                    }
                }
            }
        });
    }
    console.log('✅ 5 Providers with profiles and services created');

    // 3. Site Reviews
    const siteReviews = [
        { name: 'Aakash', rating: 5, comment: 'Best booking app I have used!' },
        { name: 'Megha', rating: 5, comment: 'Very easy to find specialists.' },
        { name: 'Rohan', rating: 4, comment: 'Great experience, simple UI.' },
        { name: 'Ishita', rating: 5, comment: 'The messaging feature is so helpful!' },
        { name: 'Kabir', rating: 5, comment: 'Highly recommended platform.' }
    ];

    for (const sr of siteReviews) {
        await prisma.siteReview.create({ data: sr });
    }
    console.log('✅ 5 Site reviews created');

    console.log('\n✨ Seeding complete! Credentials: [email]@client.com or [email]@provider.com / password: password123');
    await prisma.$disconnect();
}

seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
