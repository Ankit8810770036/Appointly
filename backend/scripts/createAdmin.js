import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import readline from 'readline';

const prisma = new PrismaClient();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
    console.log('--- Appointly Admin Creation/Promotion Tool ---');

    const choice = await question('Do you want to (1) Create a new Admin or (2) Promote an existing user to Admin? (1/2): ');

    if (choice === '1') {
        const name = await question('Enter Name: ');
        const email = await question('Enter Email: ');
        const password = await question('Enter Password: ');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        try {
            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: 'ADMIN',
                    isEmailVerified: true
                }
            });
            console.log(`Success! Admin user ${user.name} (${user.email}) created.`);
        } catch (error) {
            console.error('Error creating admin:', error.message);
        }
    } else if (choice === '2') {
        const email = await question('Enter the email of the user to promote: ');
        try {
            const user = await prisma.user.update({
                where: { email },
                data: { role: 'ADMIN' }
            });
            console.log(`Success! User ${user.name} (${user.email}) has been promoted to ADMIN.`);
        } catch (error) {
            console.error('Error promoting user:', error.message);
        }
    } else {
        console.log('Invalid choice.');
    }

    await prisma.$disconnect();
    rl.close();
}

main();
