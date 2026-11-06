---
trigger: always_on
---

# Validation Rules

## Before Every Commit

Verify:

- no hardcoded styles exist
- all responsive values use `useResponsive`
- no unused imports exist
- no unused components exist
- no debug logs remain
- formatting is correct
- lint passes
- TypeScript compilation passes

---

## Required Commands

### Format Files

```bash
npm run format
```

---

### Lint Validation

```bash
npm run lint
```

---

### TypeScript Validation

```bash
tsc
```

---

### Git Validation

```bash
git status
```