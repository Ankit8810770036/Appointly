import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    console.log('🚀 Seeding 5 diverse demo records...');

    // 1. Clients
    const clients = [
        { name: 'Rahul Sharma', email: 'rahul@client.com', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001', country: 'India', location: 'Nariman Point, Mumbai', lat: 18.9218, lng: 72.8258 },
        { name: 'Priya Patel', email: 'priya@client.com', city: 'Ahmedabad', state: 'Gujarat', zipCode: '380001', country: 'India', location: 'Navrangpura, Ahmedabad', lat: 23.0225, lng: 72.5714 },
        { name: 'Amit Singh', email: 'amit@client.com', city: 'Lucknow', state: 'Uttar Pradesh', zipCode: '226001', country: 'India', location: 'Gomti Nagar, Lucknow', lat: 26.8467, lng: 80.9462 },
        { name: 'Sonal Verma', email: 'sonal@client.com', city: 'Jaipur', state: 'Rajasthan', zipCode: '302001', country: 'India', location: 'Malviya Nagar, Jaipur', lat: 26.9124, lng: 75.7873 },
        { name: 'Vikram Rao', email: 'vikram@client.com', city: 'Hyderabad', state: 'Telangana', zipCode: '500001', country: 'India', location: 'Banjara Hills, Hyderabad', lat: 17.3850, lng: 78.4867 },
    ];

    for (const c of clients) {
        const { lat, lng, ...rest } = c;
        await prisma.user.upsert({
            where: { email: c.email },
            update: {
                name: c.name,
                city: c.city,
                state: c.state,
                zipCode: c.zipCode,
                country: c.country,
                location: c.location,
                latitude: lat,
                longitude: lng
            },
            create: {
                ...rest,
                password: hashedPassword,
                role: 'CLIENT',
                phone: '+91 98765 43210',
                streetAddress: `Street ${Math.floor(Math.random() * 100 + 1)}`,
                latitude: lat,
                longitude: lng
            }
        });
    }
    console.log('✅ 5 Diverse Clients created');

    // 2. Providers
    const providers = [
        { name: 'Dr. Rahul Mehta', email: 'mehta@provider.com', specialty: 'Dentist', about: 'Experienced dental surgeon with a focus on painless treatments.', city: 'Delhi', state: 'Delhi', zipCode: '110001', country: 'India', location: 'Connaught Place, Delhi', lat: 28.6304, lng: 77.2177 },
        { name: 'Deepika Padukone',     email: 'deepika@provider.com', specialty: 'Yoga Instructor', about: 'Professional wellness coach helping you find balance and peace.', city: 'Mumbai', state: 'Maharashtra', zipCode: '400050', country: 'India', location: 'Bandra, Mumbai', lat: 19.0596, lng: 72.8295 },
        { name: 'Sunil Gavaskar', email: 'sunil@provider.com', specialty: 'Legal Consultant', about: 'Corporate law specialist with 20 years of experience.', city: 'Pune', state: 'Maharashtra', zipCode: '411001', country: 'India', location: 'Koregaon Park, Pune', lat: 18.5362, lng: 73.8930 },
        { name: 'Kiran Mazumdar', email: 'kiran@provider.com', specialty: 'Education Consultant', about: 'Helping students achieve their dreams in global universities.', city: 'Bengaluru', state: 'Karnataka', zipCode: '560001', country: 'India', location: 'Indiranagar, Bengaluru', lat: 12.9784, lng: 77.6408 },
        { name: 'Arjun Kapur', email: 'arjun@provider.com', specialty: 'Plumber', about: 'Expert plumbing solutions for modern homes and offices.', city: 'Chandigarh', state: 'Chandigarh', zipCode: '160001', country: 'India', location: 'Sector 17, Chandigarh', lat: 30.7333, lng: 76.7794 },
    ];

    for (const p of providers) {
        const { specialty, about, lat, lng, ...userData } = p;
        await prisma.user.upsert({
            where: { email: userData.email },
            update: {
                name: userData.name,
                city: userData.city,
                state: userData.state,
                zipCode: userData.zipCode,
                location: userData.location,
                latitude: lat,
                longitude: lng
            },
            create: {
                ...userData,
                password: hashedPassword,
                role: 'PROVIDER',
                phone: '+91 88107 70036',
                streetAddress: `Shop ${Math.floor(Math.random() * 50 + 1)}, Main Road`,
                latitude: lat,
                longitude: lng,
                providerProfile: {
                    create: {
                        specialty,
                        about,
                        location: userData.location,
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
    console.log('✅ 5 Diverse Providers with profiles and services created');

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

    // 4. Admin User
    await prisma.user.upsert({
        where: { email: 'ankitkrsingh210@gmail.com' },
        update: {},
        create: {
            name: 'Ankit Kumar Singh',
            email: 'ankitkrsingh210@gmail.com',
            password: hashedPassword,
            role: 'ADMIN',
            isEmailVerified: true
        }
    });
    console.log('✅ Admin user created');

    console.log('\n✨ Seeding complete! Credentials: [email]@client.com or [email]@provider.com / password: password123');
    console.log('Admin: ankitkrsingh210@gmail.com / password: password123');
    await prisma.$disconnect();
}

seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
