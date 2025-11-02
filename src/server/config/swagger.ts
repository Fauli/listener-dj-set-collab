/**
 * Swagger/OpenAPI Configuration
 * Generates interactive API documentation
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Listener API',
      version: '0.1.0',
      description: 'Collaborative real-time DJ playlist tool - REST API Documentation',
      contact: {
        name: 'Listener Team',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'http://localhost:5173',
        description: 'Frontend development server',
      },
    ],
    tags: [
      {
        name: 'Rooms',
        description: 'Room management endpoints (create, read, delete)',
      },
      {
        name: 'Tracks',
        description: 'Playlist track management (CRUD, reorder)',
      },
      {
        name: 'Uploads',
        description: 'File upload and audio streaming endpoints',
      },
      {
        name: 'Health',
        description: 'System health check',
      },
    ],
    components: {
      schemas: {
        Room: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique room identifier',
            },
            name: {
              type: 'string',
              description: 'Room name',
              example: 'Friday Night Mix',
            },
            ownerId: {
              type: 'string',
              format: 'uuid',
              description: 'User ID of room owner',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Room creation timestamp',
            },
          },
        },
        Track: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique track identifier',
            },
            title: {
              type: 'string',
              description: 'Track title',
              example: 'Summer Vibes',
            },
            artist: {
              type: 'string',
              description: 'Artist name',
              example: 'DJ Example',
            },
            bpm: {
              type: 'number',
              nullable: true,
              description: 'Beats per minute',
              example: 128,
            },
            key: {
              type: 'string',
              nullable: true,
              description: 'Musical key (Camelot notation)',
              example: '8A',
            },
            energy: {
              type: 'integer',
              nullable: true,
              description: 'Energy level (1-10)',
              example: 7,
            },
            genre: {
              type: 'string',
              nullable: true,
              description: 'Music genre',
              example: 'House',
            },
            year: {
              type: 'integer',
              nullable: true,
              description: 'Release year',
              example: 2023,
            },
            duration: {
              type: 'number',
              nullable: true,
              description: 'Track duration in seconds',
              example: 245.5,
            },
            audioUrl: {
              type: 'string',
              nullable: true,
              description: 'URL to audio file',
              example: '/api/upload/track-id/audio',
            },
            waveformUrl: {
              type: 'string',
              nullable: true,
              description: 'URL to waveform data',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Track creation timestamp',
            },
          },
        },
        SetEntry: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique set entry identifier',
            },
            roomId: {
              type: 'string',
              format: 'uuid',
              description: 'Room ID this entry belongs to',
            },
            trackId: {
              type: 'string',
              format: 'uuid',
              description: 'Track ID',
            },
            position: {
              type: 'integer',
              description: 'Position in playlist (0-indexed)',
              example: 0,
            },
            note: {
              type: 'string',
              nullable: true,
              description: 'DJ notes for this track',
              example: 'Drop after vocal intro',
            },
            cuePoints: {
              type: 'object',
              nullable: true,
              description: 'Cue points in seconds',
              properties: {
                start: { type: 'number', nullable: true },
                end: { type: 'number', nullable: true },
                A: { type: 'number', nullable: true },
                B: { type: 'number', nullable: true },
              },
            },
            track: {
              $ref: '#/components/schemas/Track',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
  },
  apis: ['./src/server/routes/*.ts', './src/server/index.ts'], // Path to API route files
};

export const swaggerSpec = swaggerJsdoc(options);
