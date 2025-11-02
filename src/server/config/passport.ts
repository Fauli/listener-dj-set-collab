/**
 * Passport.js configuration for OAuth2 authentication
 * Supports Google OAuth 2.0 and GitHub OAuth 2.0 strategies
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { prisma } from '../db/client.js';

/**
 * Configure Google OAuth 2.0 strategy
 */
export function configurePassport() {
  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Extract user info from Google profile
            const email = profile.emails?.[0]?.value;
            const name = profile.displayName;
            const avatarUrl = profile.photos?.[0]?.value;
            const providerId = profile.id;

            if (!email) {
              return done(new Error('No email found in Google profile'), undefined);
            }

            // Find or create user
            let user = await prisma.user.findFirst({
              where: {
                provider: 'google',
                providerId: providerId,
              },
            });

            if (!user) {
              // Check if user with this email already exists
              const existingUser = await prisma.user.findUnique({
                where: { email },
              });

              if (existingUser) {
                // Link Google account to existing user
                user = await prisma.user.update({
                  where: { id: existingUser.id },
                  data: {
                    provider: 'google',
                    providerId: providerId,
                    avatarUrl: avatarUrl || existingUser.avatarUrl,
                  },
                });
              } else {
                // Create new user
                user = await prisma.user.create({
                  data: {
                    email,
                    name,
                    avatarUrl,
                    provider: 'google',
                    providerId,
                    role: 'listener', // Default role, can be upgraded later
                  },
                });
              }
            } else {
              // Update existing user's profile (in case name or avatar changed)
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  name,
                  avatarUrl: avatarUrl || user.avatarUrl,
                },
              });
            }

            return done(null, user);
          } catch (error) {
            return done(error as Error, undefined);
          }
        }
      )
    );
  } else {
    console.warn('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
  }

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',
          scope: ['user:email'], // Request email access
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            // Extract user info from GitHub profile
            const email = profile.emails?.[0]?.value;
            const name = profile.displayName || profile.username;
            const avatarUrl = profile.photos?.[0]?.value;
            const providerId = profile.id;

            if (!email) {
              return done(new Error('No email found in GitHub profile'), undefined);
            }

            // Find or create user
            let user = await prisma.user.findFirst({
              where: {
                provider: 'github',
                providerId: providerId,
              },
            });

            if (!user) {
              // Check if user with this email already exists
              const existingUser = await prisma.user.findUnique({
                where: { email },
              });

              if (existingUser) {
                // Link GitHub account to existing user
                user = await prisma.user.update({
                  where: { id: existingUser.id },
                  data: {
                    provider: 'github',
                    providerId: providerId,
                    avatarUrl: avatarUrl || existingUser.avatarUrl,
                  },
                });
              } else {
                // Create new user
                user = await prisma.user.create({
                  data: {
                    email,
                    name,
                    avatarUrl,
                    provider: 'github',
                    providerId,
                    role: 'listener', // Default role, can be upgraded later
                  },
                });
              }
            } else {
              // Update existing user's profile (in case name or avatar changed)
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  name,
                  avatarUrl: avatarUrl || user.avatarUrl,
                },
              });
            }

            return done(null, user);
          } catch (error) {
            return done(error as Error, undefined);
          }
        }
      )
    );
  } else {
    console.warn('⚠️  GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env');
  }
}
