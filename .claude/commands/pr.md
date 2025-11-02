---
description: Prepare and create a pull request with proper formatting
---

# Pull Request Preparation

Help me create a well-formatted pull request for the current branch.

## Pre-Flight Checklist

1. **Verify tests pass:**
   - Run `npm run test:all` to ensure all tests pass
   - If tests fail, DO NOT proceed with PR creation
   - Ask if I want to fix tests first

2. **Check code quality:**
   - Run `npm run type-check` for TypeScript errors
   - Run `npm run lint` for linting issues
   - Suggest fixes if there are issues

3. **Review changes:**
   - Run `git status` and `git diff` to see uncommitted changes
   - If there are uncommitted changes, ask if I want to commit them first
   - Run `git log origin/main..HEAD --oneline` to see commits in this branch

## PR Description Template

Generate a PR description based on the commits:

```markdown
## Summary
[Concise 1-2 sentence description of what this PR does]

## Changes
- [Bullet point list of key changes from commit messages]
- [Focus on WHAT changed, not HOW]

## Test Plan
- [ ] Unit tests pass (`npm test`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Manual testing: [describe what was tested]

## Related
- Closes #[issue number if applicable]
- Related to [TODO.md section]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Next Steps

After generating the description:
1. Show me the generated PR description
2. Ask if I want to create the PR now or make edits
3. If ready, use `gh pr create` with the description

## Important

- NEVER create a PR with failing tests
- ALWAYS ensure the branch is pushed to remote first
- ASK before running any git push or pr create commands
