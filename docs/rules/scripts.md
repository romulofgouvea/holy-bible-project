---
trigger: always_on
---

# Script Rules

## Shared Scripts

Reusable scripts must be inside:

```txt
/scripts
```

### Examples

```txt
/scripts
  build-app.ts
  generate-icons.ts
  clean-cache.ts
```

---

## Local Scripts

Temporary or local-only scripts must be inside:

```txt
/scripts
```

---

## Git Ignore

```gitignore
/scripts
```

---

## Naming Rules

- Use kebab-case.
- Use descriptive names.

### Examples

```txt
reset-local-db.ts
local-api-test.ts
```