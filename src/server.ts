import 'dotenv/config';
import dns from 'node:dns';
import net from 'node:net';
import app from './app';
import config from './config';
import { prisma } from './lib/prisma';
import { seedAdmin } from './utils/seed';
import { redisClient } from './lib/redis';
import { transporter } from './lib/nodemailer';

// The Neon DB host resolves to both IPv4 and IPv6 addresses, but IPv6 isn't
// actually routable here. Node's Happy Eyeballs (autoSelectFamily) dual-stack
// connection logic fails outright when it mixes in those unreachable IPv6
// candidates, even though a plain IPv4 connection succeeds instantly - so
// force IPv4-first resolution and disable Happy Eyeballs to avoid it.
dns.setDefaultResultOrder('ipv4first');
net.setDefaultAutoSelectFamily(false);

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
