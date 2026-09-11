import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function makeAdmin(email) {
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: 'ADMIN' }
        });
        console.log(`Success! User ${user.name} (${user.email}) is now an ADMIN.`);
    } catch (error) {
        console.error('Error making user admin:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

const email = process.argv[2];
if (!email) {
    console.log('Please provide an email address: node makeAdmin.js user@example.com');
    process.exit(1);
}

makeAdmin(email);
