---
trigger: always_on
---

# Architecture Rules

## Core Principles

- Follow SOLID principles.
- Prefer composition over duplication.
- Keep business logic separated from UI.
- Keep services isolated.
- Avoid tightly coupled modules.
- Keep folder structure scalable.

---

## Component Rules

- Components must have a single responsibility.
- Avoid massive components.
- Extract reusable logic into hooks.
- Extract reusable UI into shared components.

---

## Service Rules

- Services must contain only business logic.
- Avoid UI logic inside services.
- Keep API calls isolated.

---

## State Management Rules

- Keep state minimal.
- Avoid duplicated state.
- Use global state only when necessary.
- Keep local state local whenever possible.

---

## Forbidden Practices

- Massive components
- Duplicate business logic
- UI logic inside services
- Circular dependencies

- Never comments