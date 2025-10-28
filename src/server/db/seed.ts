/**
 * Database seed script
 * Run with: npm run db:seed
 */

import { prisma } from './client.js';

async function main() {
  // eslint-disable-next-line no-console
  console.log('Seeding database...');

  // Create sample users with deterministic UUIDs
  // These UUIDs are hardcoded in the frontend until we implement auth in Phase 2.3
  const dj1 = await prisma.user.create({
    data: {
      id: 'f1aaa777-5fd9-4eac-88a5-02c46db731fa', // DJ Alpha - used in RoomCreate.tsx
      name: 'DJ Alpha',
      role: 'dj1',
    },
  });

  await prisma.user.create({
    data: {
      id: 'e2bbb888-6fe0-5fbd-9d96-13d57ec842fb', // DJ Beta
      name: 'DJ Beta',
      role: 'dj2',
    },
  });

  // Create sample room
  const room = await prisma.room.create({
    data: {
      name: 'Friday Night Mix',
      ownerId: dj1.id,
    },
  });

  // Create sample tracks
  const track1 = await prisma.track.create({
    data: {
      title: 'Midnight Drive',
      artist: 'The Synthwave Project',
      bpm: 128,
      key: 'Am',
      energy: 7,
    },
  });

  const track2 = await prisma.track.create({
    data: {
      title: 'Bassline Dreams',
      artist: 'Deep House Collective',
      bpm: 124,
      key: 'Dm',
      energy: 6,
    },
  });

  // Add tracks to room playlist
  await prisma.setEntry.createMany({
    data: [
      {
        roomId: room.id,
        trackId: track1.id,
        position: 0,
        note: 'Opening track - build energy slowly',
      },
      {
        roomId: room.id,
        trackId: track2.id,
        position: 1,
        note: 'Smooth transition on the bass drop',
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log('✓ Database seeded successfully');
  // eslint-disable-next-line no-console
  console.log(`  - Created room: ${room.name} (ID: ${room.id})`);
  // eslint-disable-next-line no-console
  console.log(`  - Created ${2} DJs`);
  // eslint-disable-next-line no-console
  console.log(`  - Created ${2} tracks`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
