import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearData() {
    console.log('🚀 Starting database cleanup...');
    try {
        // Delete in order to respect foreign key constraints
        await prisma.review.deleteMany();
        console.log('✅ Reviews cleared');

        await prisma.appointment.deleteMany();
        console.log('✅ Appointments cleared');

        await prisma.favorite.deleteMany();
        console.log('✅ Favorites cleared');

        await prisma.notification.deleteMany();
        console.log('✅ Notifications cleared');

        await prisma.message.deleteMany();
        console.log('✅ Messages cleared');

        await prisma.service.deleteMany();
        console.log('✅ Services cleared');

        await prisma.siteReview.deleteMany();
        console.log('✅ Site reviews cleared');

        await prisma.providerProfile.deleteMany();
        console.log('✅ Provider profiles cleared');

        await prisma.user.deleteMany();
        console.log('✅ Users cleared');

        console.log('\n✨ Database is now completely empty and ready for production!');
    } catch (error) {
        console.error('❌ Error clearing database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearData();
