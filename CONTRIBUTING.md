# Contributing to Listener

Thank you for your interest in contributing to Listener! This guide will help you get started.

## Development Setup

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/yourname/listener.git
   cd listener
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your local database credentials
   ```

3. **Set up the database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Start development servers**
   ```bash
   npm run dev
   # Or separately:
   npm run dev:server  # Backend on :3000
   npm run dev:client  # Frontend on :5173
   ```

## Project Structure

Please familiarize yourself with the folder structure:

```
listener/
├── src/
│   ├── server/          # Backend (Express + Socket.io)
│   ├── client/          # Frontend (React)
│   └── shared/          # Shared types & constants
├── tests/               # Test files
├── docs/                # Documentation
└── prisma/              # Database schema
```

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Prefer explicit types over `any`
- Use shared types from `src/shared/types/`

### Code Style
- Run `npm run lint` before committing
- Run `npm run format` to auto-format code
- Use ES6+ syntax (async/await, arrow functions, etc.)

### Naming Conventions
- **Files**: camelCase for utilities, PascalCase for components
- **Functions**: camelCase with descriptive verbs
- **Components**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase

### Socket Events
Follow the naming pattern defined in `src/shared/constants/`:
- `room:*` — Room/session operations
- `playlist:*` — Playlist/track operations

## Making Changes

### 1. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes
- Keep changes focused and atomic
- Write tests for new functionality
- Update documentation if needed

### 3. Test Your Changes
```bash
npm run type-check    # TypeScript validation
npm run lint          # Linting
npm test              # Run tests
npm run format:check  # Check formatting
```

### 4. Commit Your Changes
```bash
git add .
git commit -m "feat: add track reordering functionality"
```

Use conventional commit messages:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `style:` — Code style changes (formatting, etc.)
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

### 5. Submit a Pull Request
- Push your branch to GitHub
- Open a PR with a clear description
- Link any related issues
- Ensure CI checks pass

## Testing Guidelines

### Unit Tests
- Test business logic in isolation
- Mock external dependencies
- Use descriptive test names

Example:
```typescript
describe('playlistService.addTrack', () => {
  it('should add track to playlist at correct position', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Integration Tests
- Test API endpoints
- Test WebSocket event flows
- Use test database

## Working with Claude Code

If you're using Claude Code as an AI assistant:
1. Reference `CLAUDE.md` for collaboration guidelines
2. Ask Claude to follow the MVP scope in `docs/PLAN.md`
3. Request small, incremental changes
4. Always review AI-generated code before committing

## Questions or Issues?

- Check `docs/PLAN.md` for feature scope
- Check `CLAUDE.md` for development principles
- Open a GitHub issue for bugs or feature requests
- Be respectful and constructive

---

**Happy coding! 🎧**
