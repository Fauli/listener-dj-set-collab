# .vibe — AI Collaboration Configuration

This folder contains role definitions and configuration for Claude Code collaboration.

## 📁 Structure

```
.vibe/
├── README.md           # This file
└── roles/              # Role definitions for Claude
    ├── implementer.md      # Code implementation role
    ├── reviewer.md         # Code review role
    ├── ux-designer.md      # UX/UI design role
    └── product-dj.md       # Product & DJ workflow role
```

## 🎭 Roles

Each role defines a specific perspective and set of responsibilities for Claude Code:

### Implementer
**Focus:** Writing clean, tested production code
**Use when:** Building features, fixing bugs, implementing logic
**Mindset:** Pragmatic engineer focused on shipping working code

### Reviewer
**Focus:** Code quality, security, and maintainability
**Use when:** Reviewing code changes, ensuring best practices
**Mindset:** Critical but constructive reviewer

### UX Designer
**Focus:** User experience and interface design
**Use when:** Designing components, making UX decisions
**Mindset:** User-centered designer balancing aesthetics and usability

### Product DJ
**Focus:** DJ workflow and product strategy
**Use when:** Prioritizing features, making scope decisions
**Mindset:** DJ who understands the creative process and product needs

## 🎯 How to Use

Reference roles in your conversations with Claude:

```
"As Implementer, create the room creation endpoint"
"Review this code as the Reviewer role"
"As UX Designer, how should we display energy levels?"
"Acting as Product DJ, should we prioritize this feature?"
```

Claude will adopt the specified role's perspective, responsibilities, and communication style.

## 📖 See Also

- [CLAUDE.md](../CLAUDE.md) - Full Claude collaboration guide
- [PLAN.md](../docs/PLAN.md) - Product roadmap and features
- [TODO.md](../TODO.md) - Development task tracker

---

**Note:** This folder is specific to Claude Code collaboration and can be safely ignored by other tools.
