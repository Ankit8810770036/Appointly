import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearData() {
    console.log('🗑️  Clearing all data from database...');

    try {
        // Order matters due to foreign key constraints
        await prisma.review.deleteMany();
        await prisma.appointment.deleteMany();
        await prisma.favorite.deleteMany();
        await prisma.notification.deleteMany();
        await prisma.message.deleteMany();
        await prisma.service.deleteMany();
        await prisma.siteReview.deleteMany();
        await prisma.providerProfile.deleteMany();
        await prisma.user.deleteMany();

        console.log('✅ All data cleared successfully!');
    } catch (error) {
        console.error('❌ Error clearing data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearData();
