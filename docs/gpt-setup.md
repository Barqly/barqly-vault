Absolutely—let’s lock this down so keyboard users get a clean, predictable flow.

# Tab order & focus spec (Setup → success state)

Addressed to: **@sr-frontend-engineer**

## Goal

Match keyboard focus order to **visual reading order** while avoiding custom `tabIndex` > 0. Use DOM order first; use `tabIndex="-1"` only for programmatic focus.

## Desired focus order (success card)

1. **Auto‑focus** the primary action: **“Encrypt Your Vault”** (blue button)
2. **Copy** button (“Copy public key”)
3. **Create Another Key**

Rationale: The next step for most users is to proceed to encryption; copy is secondary; creating another key is tertiary.

## Implementation

### 1) DOM structure (preferred)

Order the actionable elements in the DOM to match the visual order:

```html
<section aria-labelledby="key-success-title">
  <!-- … success title, description, public key field … -->

  <div class="actions">
    <!-- 1. primary -->
    <button id="go-encrypt" class="btn btn-primary">
      <span class="icon-shield"></span> Encrypt Your Vault
    </button>

    <!-- 2. secondary -->
    <button id="copy-pubkey" class="btn btn-ghost">
      <span class="icon-copy"></span> Copy
    </button>

    <!-- 3. tertiary -->
    <button id="create-another" class="btn btn-ghost">
      <span class="icon-rotate"></span> Create Another Key
    </button>
  </div>
</section>
```

If you must keep a different visual layout (left/ right alignment), keep this DOM order and use CSS to place buttons. Don’t change focus order with CSS.

### 2) Programmatic focus (on mount)

```ts
// on success screen mount
const primary = document.getElementById('go-encrypt') as HTMLButtonElement;
primary?.focus();   // primary receives initial focus
```

If you need to make a non-tabbable element focusable temporarily, use `tabIndex="-1"` and call `.focus()`; never use positive tabIndex.

### 3) Keyboard behavior

* **Enter/Space** on buttons triggers click handlers.
* Prevent form submission when focus is on **Copy**; it should only copy.
* Pressing **Esc** should close any open tooltip/toast (not the card).

### 4) Accessible names & announcements

* Copy button: `aria-label="Copy public key"` (text “Copy” is okay, label makes it explicit).
* After copying, announce via live region:

```html
<div id="a11y-live" aria-live="polite" class="sr-only"></div>
```

```ts
navigator.clipboard.writeText(pubKey).then(() => {
  document.getElementById('a11y-live')!.textContent = 'Public key copied to clipboard.';
});
```

### 5) Focus styles (consistent)

Use the app focus token (example shown):

```css
:focus-visible {
  outline: 2px solid var(--blue-600);
  outline-offset: 2px;
  border-radius: 10px; /* match button radius */
}
```

### 6) Do **not** use `tabIndex={1..n}`

* Positive tabIndex creates confusing orders for assistive tech.
* If reordering is absolutely unavoidable, reflow the **DOM** instead.

---

## Quick QA checklist (for this card)

* [ ] On mount, focus ring appears on **Encrypt Your Vault**.
* [ ] **Tab** → moves to **Copy**; **Tab** again → **Create Another Key**.
* [ ] **Shift+Tab** moves in reverse order.
* [ ] Pressing **Enter** on each button performs the correct action.
* [ ] After **Copy**, a toast shows and a polite live region announces success.
* [ ] No element with positive tabIndex.

This pattern is reusable on **Encrypt** and **Decrypt** screens: keep the **primary CTA first in DOM**, then secondary controls (e.g., Copy path), then tertiary actions.
