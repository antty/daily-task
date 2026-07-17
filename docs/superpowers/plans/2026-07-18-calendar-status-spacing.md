# Calendar Status Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate the selected-date badge from task status icons so `✓`, `✕`, and task markers never crowd the selected date.

**Architecture:** Keep the existing calendar HTML and task-state logic unchanged. Add a CSS positioning layer to the existing `.day` container, anchor `.calendar-status` to the lower-right region, and preserve the selected date badge in the upper-left region.

**Tech Stack:** Static HTML, CSS, JavaScript, Node.js built-in test runner.

## Global Constraints

- Do not change task status calculation or Supabase data behavior.
- Do not change calendar cell height or introduce horizontal overflow.
- Preserve existing `aria-label` attributes and status semantics.
- Use the current lavender visual tokens and 4/8px spacing rhythm.

---

### Task 1: Separate Calendar Date and Status Layout

**Files:**
- Modify: `tests/ui-structure.test.js`
- Modify: `extras-3.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: Existing `.compact-home .day`, `.calendar-status`, and `.day.selected b` markup produced by `renderCalendar()`.
- Produces: Stable upper-left selected date badge and lower-right status marker with no business-logic changes.

- [ ] **Step 1: Write the failing layout regression test**

Add this assertion to the existing selected-calendar test in `tests/ui-structure.test.js`:

```js
assert.match(css, /\.compact-home \.day \.calendar-status\s*\{[^}]*position:\s*absolute[^}]*right:\s*7px[^}]*bottom:\s*7px[^}]*margin:\s*0/);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node --test --test-name-pattern='selected task calendar' tests/ui-structure.test.js
```

Expected: FAIL because `.calendar-status` is still positioned in normal flow with `margin-top`.

- [ ] **Step 3: Implement independent status positioning**

Append the following focused override in `extras-3.css` after the selected-date rules:

```css
.compact-home .day .calendar-status {
  position: absolute;
  right: 7px;
  bottom: 7px;
  margin: 0;
}

.compact-home .day .calendar-status.has-task,
.compact-home .day .calendar-status.idle {
  right: 8px;
  bottom: 8px;
  margin: 0;
}

@media (max-width: 600px) {
  .compact-home .day.selected b {
    min-width: 20px;
    height: 20px;
    top: 5px;
    left: 5px;
    padding: 0 4px;
    border-radius: 6px;
    font-size: 11px;
  }

  .compact-home .day .calendar-status {
    width: 15px;
    height: 15px;
    right: 4px;
    bottom: 4px;
    font-size: 9px;
  }
}
```

This keeps all state markers away from the upper-left date badge without changing cell dimensions.

- [ ] **Step 4: Update the static asset cache version**

Replace the current shared version in all stylesheet and script URLs in `index.html` with:

```text
20260718-calendar-status-gap
```

Update the three matching version expectations in `tests/ui-structure.test.js` to the same value.

- [ ] **Step 5: Run focused and full verification**

Run:

```bash
node --test --test-name-pattern='selected task calendar|cache version' tests/ui-structure.test.js
node --check src/app.js
node --test
git diff --check
```

Expected: focused tests pass, all tests pass with zero failures, JavaScript syntax check exits 0, and diff check prints no errors.

- [ ] **Step 6: Verify responsive rendering**

Serve the project locally and inspect the task calendar at desktop and phone widths. Confirm selected cells with `✓`, `✕`, the light-green task dash, and idle dash retain at least 8px visual separation from the date badge and do not overflow.

- [ ] **Step 7: Commit the implementation**

```bash
git add extras-3.css index.html tests/ui-structure.test.js
git commit -m "fix: separate calendar status from selected date"
```
