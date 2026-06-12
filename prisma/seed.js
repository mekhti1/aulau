const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const CryptoJS = require('crypto-js');

const prisma = new PrismaClient();

const HMAC_SECRET = process.env.QR_HMAC_SECRET || 'aulau-caspian-secret-2024';

function generateSignature(type, code) {
  const message = `${type}:${code}`;
  return CryptoJS.HmacSHA256(message, HMAC_SECRET).toString(CryptoJS.enc.Hex).slice(0, 16);
}

function generateQRPayload(type, code) {
  const signature = generateSignature(type, code);
  return `${type}:${code}:${signature}`;
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.transaction.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.net.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.hydrophone.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('123456', 10);

  // Create users
  const fisher = await prisma.user.create({
    data: {
      username: 'fisher1',
      passwordHash,
      name: 'Ерлан Каспиев',
      role: 'FISHER',
      quotaLimitKg: 500,
      quotaUsedKg: 127.5,
      trustScore: 4.7,
      certNumber: 'KZ-FISH-2024-001',
    },
  });

  const inspector = await prisma.user.create({
    data: {
      username: 'inspector1',
      passwordHash,
      name: 'Айдар Текенов',
      role: 'INSPECTOR',
      trustScore: 5.0,
      certNumber: 'KZ-INSP-2024-001',
    },
  });

  const buyer = await prisma.user.create({
    data: {
      username: 'buyer1',
      passwordHash,
      name: 'Алия Нурланова',
      role: 'BUYER',
      trustScore: 4.5,
    },
  });

  const admin = await prisma.user.create({
    data: {
      username: 'admin1',
      passwordHash,
      name: 'Бауржан Орынбасаров',
      role: 'ADMIN',
      trustScore: 5.0,
    },
  });

  console.log('✅ Users created');

  // Create nets
  const net1Code = 'NET-VALID01';
  const net2Code = 'NET-EXPRD02';

  const net1 = await prisma.net.create({
    data: {
      netCode: net1Code,
      ownerId: fisher.id,
      zone: 'Зона А — Северный Каспий',
      expiresAt: new Date('2025-12-31'),
      signature: generateQRPayload('NET', net1Code),
    },
  });

  const net2 = await prisma.net.create({
    data: {
      netCode: net2Code,
      ownerId: fisher.id,
      zone: 'Зона Б — Устье р. Урал',
      expiresAt: new Date('2024-01-01'),
      signature: generateQRPayload('NET', net2Code),
    },
  });

  console.log('✅ Nets created');

  // Create batches
  const batch1Code = 'BATCH-VRF001';
  const batch2Code = 'BATCH-PND002';
  const batch3Code = 'BATCH-FLG003';

  const batch1 = await prisma.batch.create({
    data: {
      batchCode: batch1Code,
      ownerId: fisher.id,
      species: 'Судак',
      weightKg: 45.5,
      caughtAt: new Date('2024-11-15T08:30:00Z'),
      lat: 46.8,
      lng: 51.6,
      status: 'VERIFIED',
      listed: true,
      sold: false,
      price: 113750,
      signature: generateQRPayload('BATCH', batch1Code),
      signedBy: 'Ерлан Каспиев',
      signedAt: new Date('2024-11-15T08:35:00Z'),
      certNumber: 'KZ-EDS-ABCD1234',
      netId: net1.id,
    },
  });

  const batch2 = await prisma.batch.create({
    data: {
      batchCode: batch2Code,
      ownerId: fisher.id,
      species: 'Осётр',
      weightKg: 32.0,
      caughtAt: new Date('2024-11-18T10:15:00Z'),
      lat: 46.9,
      lng: 51.7,
      status: 'PENDING',
      signature: generateQRPayload('BATCH', batch2Code),
      signedBy: 'Ерлан Каспиев',
      signedAt: new Date('2024-11-18T10:20:00Z'),
      certNumber: 'KZ-EDS-EFGH5678',
    },
  });

  const batch3 = await prisma.batch.create({
    data: {
      batchCode: batch3Code,
      ownerId: fisher.id,
      species: 'Белуга',
      weightKg: 50.0,
      caughtAt: new Date('2024-11-20T06:00:00Z'),
      lat: 45.0,
      lng: 50.5,
      status: 'FLAGGED',
      signature: generateQRPayload('BATCH', batch3Code),
      signedBy: 'Ерлан Каспиев',
      signedAt: new Date('2024-11-20T06:05:00Z'),
      certNumber: 'KZ-EDS-IJKL9012',
    },
  });

  console.log('✅ Batches created');

  // Create hydrophones
  const h1 = await prisma.hydrophone.create({
    data: {
      name: 'Гидрофон №1 — Урало-Каспийский канал',
      lat: 46.95,
      lng: 51.75,
      radiusKm: 25,
      status: 'active',
    },
  });

  const h2 = await prisma.hydrophone.create({
    data: {
      name: 'Гидрофон №2 — Кигач',
      lat: 46.92,
      lng: 48.32,
      radiusKm: 20,
      status: 'active',
    },
  });

  const h3 = await prisma.hydrophone.create({
    data: {
      name: 'Гидрофон №3 — Сев. Каспий контроль',
      lat: 45.95,
      lng: 50.90,
      radiusKm: 30,
      status: 'active',
    },
  });

  const h4 = await prisma.hydrophone.create({
    data: {
      name: 'Гидрофон №4 — Мангышлак берег',
      lat: 43.65,
      lng: 51.20,
      radiusKm: 20,
      status: 'active',
    },
  });

  console.log('✅ Hydrophones created');

  // Create incidents
  await prisma.incident.create({
    data: {
      incidentCode: 'INC-DEMO001',
      hydrophoneId: h1.id,
      label: 'Скоростной катер',
      confidence: 92.3,
      threatLevel: 'HIGH',
      status: 'OPEN',
      lat: 46.97,
      lng: 51.78,
    },
  });

  await prisma.incident.create({
    data: {
      incidentCode: 'INC-DEMO002',
      hydrophoneId: h3.id,
      label: 'Обычное судно',
      confidence: 78.1,
      threatLevel: 'MEDIUM',
      status: 'CONFIRMED',
      lat: 45.98,
      lng: 50.85,
    },
  });

  console.log('✅ Incidents created');

  // Forged QR example - this will fail verification because the signature is wrong
  console.log('\n📌 Forged QR example (for demo):');
  console.log('   BATCH:BATCH-FORGED:abcdef1234567890');
  console.log('   This QR will show "Недействительный QR-код"\n');

  console.log('🎉 Seed completed successfully!');
  console.log('\nDemo accounts:');
  console.log('  fisher1   / 123456  (Рыбак)');
  console.log('  inspector1 / 123456  (Инспектор)');
  console.log('  buyer1    / 123456  (Покупатель)');
  console.log('  admin1    / 123456  (Администратор)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
