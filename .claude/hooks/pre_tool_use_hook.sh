#!/bin/bash
# Pre-commit hook for Claude Code
# Prevents git commits unless tests have passed
#
# Based on best practices from https://blog.sshh.io/p/how-i-use-every-claude-code-feature

# Check if this is a git commit command
if [[ "$TOOL_NAME" == "Bash" ]] && [[ "$COMMAND" =~ git[[:space:]]+commit ]]; then
  # Check if the test pass file exists
  if [ ! -f /tmp/listener-tests-passed ]; then
    echo ""
    echo "❌ COMMIT BLOCKED: Tests must pass before committing"
    echo ""
    echo "Please run one of these commands first:"
    echo "  npm run test:all       # Run all tests (unit + E2E)"
    echo "  npm run test           # Run unit tests only"
    echo "  npm run test:e2e       # Run E2E tests only"
    echo ""
    echo "After tests pass, the commit will be allowed."
    echo ""
    exit 1
  fi

  # Tests passed! Allow the commit and remove the one-time pass file
  echo "✅ Tests passed - proceeding with commit"
  rm /tmp/listener-tests-passed
fi

# Allow all other commands
exit 0
