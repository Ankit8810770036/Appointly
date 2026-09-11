import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listUsers() {
    try {
        const users = await prisma.user.findMany({
            select: { name: true, email: true, role: true }
        });
        console.log('Registered Users:');
        users.forEach(u => console.log(`- ${u.name} (${u.email}) [${u.role}]`));
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

listUsers();
