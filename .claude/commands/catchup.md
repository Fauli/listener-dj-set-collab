---
description: Quick context recovery by reading recent git changes
---

# Context Catchup

You're helping me continue work on the Listener DJ app after a session break or `/clear`.

## Quick Context Recovery

1. **Read recent changes:**
   - Run `git status` to see modified/staged files
   - Run `git diff` to see unstaged changes
   - Run `git log -5 --oneline` to see recent commits

2. **Review project state:**
   - Check `TODO.md` for current phase and pending tasks
   - Note any "🎯 Next Action" or "Current Focus" sections

3. **Identify work-in-progress:**
   - Look for files with uncommitted changes
   - Check for any new test failures or lint errors

4. **Summarize for me:**
   - Briefly describe what was recently worked on
   - List any obvious incomplete work or TODOs
   - Ask if I want to continue where we left off

## Goal

Get up to speed quickly without reading the entire codebase. Focus on **what changed** since the last commit, not the whole project structure.
