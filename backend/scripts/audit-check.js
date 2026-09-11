import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    try {
        const userCount = await prisma.user.count();
        const providerCount = await prisma.user.count({ where: { role: 'PROVIDER' } });
        const clientCount = await prisma.user.count({ where: { role: 'CLIENT' } });
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        const reviewCount = await prisma.siteReview.count();

        console.log('--- DATABASE STATUS ---');
        console.log(`Total Users: ${userCount}`);
        console.log(`Providers: ${providerCount}`);
        console.log(`Clients: ${clientCount}`);
        console.log(`Admins: ${adminCount}`);
        console.log(`Site Reviews: ${reviewCount}`);
        console.log('-----------------------');
    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
