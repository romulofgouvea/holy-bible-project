---
trigger: always_on
---

# Naming Rules

## Components

- Use PascalCase.
- File name must match component name.

### Examples

```txt
UserProfile.tsx
BibleVerseCard.tsx
```

---

## Hooks

- Must start with `use`.
- Use camelCase.

### Examples

```txt
useResponsive.ts
useAuth.ts
```

---

## Screens

- Must end with `Screen`.

### Examples

```txt
HomeScreen.tsx
SettingsScreen.tsx
```

---

## Services

- Must end with `Service`.

### Examples

```txt
AuthService.ts
ApiService.ts
```

---

## Stores

- Must end with `Store`.

### Examples

```txt
AuthStore.ts
SettingsStore.ts
```

---

## Contexts

- Must end with `Context`.

### Examples

```txt
ThemeContext.tsx
AuthContext.tsx
```

---

## Variables

- Use camelCase.
- Names must be descriptive.

---

## Boolean Variables

- Must start with:
  - is
  - has
  - can
  - should

---

## Constants

- Use UPPER_SNAKE_CASE only for global constants.