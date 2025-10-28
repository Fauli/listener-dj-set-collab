# Quick Role Reference

Use these prompts to invoke specific Claude roles:

## 🔨 Implementer
```
"As Implementer, build the [feature name]"
"Acting as Implementer, fix the bug in [file/component]"
"Implement this as the Implementer role"
```
**Best for:** Writing code, implementing features, bug fixes

---

## 🔍 Reviewer
```
"Review this code as the Reviewer"
"As Reviewer, check for security issues"
"Acting as Reviewer, provide feedback on this PR"
```
**Best for:** Code reviews, quality checks, finding bugs

---

## 🎨 UX Designer
```
"As UX Designer, how should we design the [component]?"
"Design the UI for [feature] as UX Designer"
"Acting as UX Designer, review this component's usability"
```
**Best for:** UI/UX decisions, component design, user flows

---

## 🎧 Product DJ
```
"As Product DJ, should we prioritize [feature A] or [feature B]?"
"Acting as Product DJ, is this feature aligned with DJ workflow?"
"Product DJ: Does this solve a real DJ problem?"
```
**Best for:** Feature prioritization, product decisions, scope

---

## 🔄 Multi-Role Workflow Example

```
User: "I want to add a BPM auto-detection feature"

Step 1 - Product DJ:
"As Product DJ, should we add BPM auto-detection to MVP?"

Step 2 - UX Designer (if approved):
"As UX Designer, how should we display auto-detected BPM?"

Step 3 - Implementer:
"As Implementer, build the BPM auto-detection feature"

Step 4 - Reviewer:
"Review this implementation as Reviewer"
```

---

## 🎯 Default Mode

If no role is specified, Claude balances all perspectives as a **generalist pair programmer**.

```
"Add a create room button"  ← Uses default mode
```

---

See [CLAUDE.md](../CLAUDE.md) for full collaboration guidelines.
