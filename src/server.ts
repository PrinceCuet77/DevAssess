import 'dotenv/config';
import app from './app';
import config from './config';
import { prisma } from './lib/prisma';
import { seedAdmin } from './utils/seed';
import { redisClient } from './lib/redis';
import { transporter } from './lib/nodemailer';

const PORT = config.port;

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to the database successfully.');

    await seedAdmin();

    await redisClient.connect();
    console.log('Redis Connected Successfully.');

    await transporter.verify();
    console.log('Nodemailer Connected Successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting the server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
