---
trigger: always_on
---

# Styling Rules

## Mandatory useResponsive Usage

- All spacing, sizing, typography, dimensions, and radius values must use `useResponsive`.
- Never hardcode style values.

---

## Forbidden Patterns

### Never Use

```typescript
padding: 12
marginTop: 8
fontSize: 16
borderRadius: 10
width: 300
height: 200
```

### Never Use Direct Constants Inside Styles

```typescript
padding: SPACING.md
fontSize: FONT_SIZES.body
```

### Never Create Empty Styles

```typescript
copyBtnText: {}
container: {}
title: {}
```

---

## Required Pattern

```typescript
const responsive = useResponsive();

padding: ms(DESIGN.spacing.md)
marginTop: ms(DESIGN.spacing.lg)
fontSize: ms(DESIGN.fontSize.body)
borderRadius: ms(DESIGN.borderRadius.md)
```

---

## Design System Rules

- `useResponsive` must internally use centralized design tokens.
- All responsive values must come from the design system.

### Allowed Tokens

- spacing
- fontSize
- borderRadius
- iconSize
- width
- height
- breakpoints

---

## Styling Best Practices

- Avoid inline styles whenever possible.
- Reuse styles and responsive tokens.
- Avoid duplicated style logic.
- Maintain visual consistency across the app.
- Avoid empty style logic.