# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** 习惯养成
**Generated:** 2026-07-17 23:36:54
**Category:** Parenting & Baby Tracker
**Design Dials:** Variance 5/10 (Balanced / Modern) | Motion 3/10 (Subtle) | Density 6/10 (Standard)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#6D55A6` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#8A72BA` | `--color-secondary` |
| Accent/Success | `#347A58` | `--color-accent` |
| Background | `#F7F4FB` | `--color-background` |
| Foreground | `#292330` | `--color-foreground` |
| Muted | `#F2EDF8` | `--color-muted` |
| Muted Foreground | `#746A7D` | `--color-muted-foreground` |
| Border | `#E7DEED` | `--color-border` |
| Warning | `#A96121` | `--color-warning` |
| Destructive | `#B33E4D` | `--color-destructive` |
| Ring | `#8A72BA` | `--color-ring` |

**Color Notes:** Calm lavender brand + habit green. Status meaning always includes text, icon, or shape.

### Typography

- **Heading Font:** System rounded sans-serif
- **Body Font:** System sans-serif
- **Mood:** calm, friendly, warm, focused
- **Font Stack:** `ui-rounded, "SF Pro Rounded", "PingFang SC", system-ui, sans-serif`

No remote font import. Use local system fonts to avoid rendering delays and layout shift.

### Spacing Variables

*Density: 6/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 10px 30px rgba(43,22,48,0.06)` | Cards, buttons |
| `--shadow-lg` | `0 18px 48px rgba(33,22,47,0.14)` | Floating panels |
| `--shadow-xl` | `0 30px 90px rgba(27,18,35,0.30)` | Modals |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #6D55A6;
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  transition: background-color 200ms ease, box-shadow 200ms ease, opacity 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  box-shadow: 0 8px 20px rgba(109,85,166,0.22);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #6D55A6;
  border: 1px solid #E7DEED;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  transition: background-color 200ms ease, border-color 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #FFFFFF;
  border: 1px solid #E7DEED;
  border-radius: 22px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: border-color 200ms ease, box-shadow 200ms ease;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  border-color: #D8CBE3;
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #8A72BA;
  outline: 2px solid transparent;
  box-shadow: 0 0 0 3px rgba(138,114,186,0.24);
}
```

### Modals

```css
.modal-overlay {
  background: rgba(35, 28, 42, 0.52);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 24px;
  padding: 0;
  box-shadow: var(--shadow-xl);
  max-width: 600px;
  width: calc(100% - 32px);
}
```

---

## Style Guidelines

**Style:** Calm Lavender Family Productivity

**Keywords:** lavender, warm white, calm, family, focused, rounded, accessible, restrained depth

**Best For:** Family habit tracking, children education, household routines, screen-time management

**Key Effects:** One soft card shadow; restrained lavender focus ring; 150–240ms state transitions; strong modal scrim; tabular timer figures; no decorative floating animation.

### Page Pattern

**Pattern Name:** Calendar + Daily Focus Workspace

- **Primary Goal:** Show today’s state and next action without navigation overhead.
- **CTA Placement:** One primary action per page or modal; management actions remain secondary.
- **Section Order:** Profile and motivation, calendar state, selected-day tasks; iPad uses title, quota summary, calendar, records.

---

## Motion

**Content Transition** (Subtle) — Trigger: modal or selected-day change | Duration: 150–240ms | Easing: `ease-out`

```js
.panel-enter { animation: panel-enter 200ms ease-out; }
@keyframes panel-enter { from { opacity: 0; transform: translateY(6px); } }
```

**Framework notes:** Use native CSS only; respect `prefers-reduced-motion`.

- ✅ Animate opacity and transform only
- ❌ Do not animate width, height, top, or left
- ⚡ Never block navigation or input while animation runs

---

## Anti-Patterns (Do NOT Use)

- ❌ Inconsistent styling
- ❌ Poor contrast ratios
- ❌ Heavy gradients, random shadow depths, or decorative motion
- ❌ Full-screen mobile dialogs for short forms

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
