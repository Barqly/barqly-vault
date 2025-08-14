@sr-frontend-engineer — here’s a **pixel-perfect, token-driven spec** for the **Setup → “Create Your Vault Key”** screen (desktop only). It’s written so you can copy/paste Tailwind classes (or the CSS vars) without translating. This builds directly on our color token map.&#x20;

---

# 0) Screen contract (desktop)

* **Viewport assumption:** desktop app window ≥ 1200px wide.
* **Main content rail width:** `max-w-[960px] mx-auto` (matches Encrypt/Decrypt).
* **Vertical rhythm:** parent container `py-10` (40px top/bottom); inner sections use the spacing scale below.

---

# 1) Design tokens (use these everywhere)

## 1.1 Spacing (Tailwind scale)

* `space-1 = 4px`, `space-2 = 8px`, `space-3 = 12px`, `space-4 = 16px`,
  `space-6 = 24px`, `space-8 = 32px`, `space-10 = 40px`, `space-12 = 48px`

## 1.2 Radius & shadows

* **Card radius:** `rounded-2xl`
* **Input radius:** `rounded-lg`
* **Pill/badge radius:** `rounded-full`
* **Shadow (cards):** `shadow-[0_1px_2px_rgba(16,24,40,0.05)]`

## 1.3 Typography

* **Header (section title):** `text-[28px] leading-8 font-semibold text-slate-800`
* **Field labels:** `text-sm font-medium text-slate-700`
* **Input text:** `text-[15px] text-slate-800`
* **Helper / security note:** `text-sm text-slate-500`
* **Inline status (success/error):** `text-sm font-medium`

## 1.4 Color tokens (Tailwind aliases)

> These map 1:1 to our token map. Keep using these across all screens.

* **Brand/primary:** `blue-600` (action/active), `blue-700` (hover/active), `blue-300` (focus ring)
* **Neutrals:** `slate-800` (headings), `slate-700` (body), `slate-500` (secondary), `slate-400` (icons), `slate-200` (borders), `slate-100` (fills)
* **Success:** `green-50` (bg), `green-200` (border), `green-600` (text/icons), `green-700` (bar fill/hover)
* **Error:** `red-50` (bg), `red-200` (border), `red-600` (text/icons), `red-700` (bar fill)

**Focus ring (all interactive):** `focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white`

---

# 2) Page structure (top → bottom)

## 2.1 Global header row

* Right-aligned strapline stays **in the top app bar**:
  `text-sm text-slate-500` → “Secure file encryption for Bitcoin custody”

## 2.2 Section header bar

```html
<section class="max-w-[960px] mx-auto">
  <div class="rounded-xl border border-slate-200 bg-white px-6 py-4">
    <h2 class="flex items-center gap-2 text-[28px] leading-8 font-semibold text-slate-800">
      <Shield class="h-5 w-5 text-blue-600" />
      Create Your Vault Key
    </h2>

    <div class="mt-4 flex gap-3">
      <!-- badges -->
      <span class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700">
        <Sparkles class="h-3.5 w-3.5 text-slate-500" /> Military-grade
      </span>
      <span class="inline-flex ..."> <!-- Local-only --> </span>
      <span class="inline-flex ..."> <!-- Zero network --> </span>
    </div>
  </div>
</section>
```

## 2.3 Form card

* **Card:** `mt-6 rounded-2xl border border-slate-200 bg-white p-6 max-w-[960px] mx-auto`
* **Field stack gap:** `space-y-5` (20px between labeled rows)
* **Label row (each field):**
  Wrap label + required asterisk in `flex items-center gap-1 text-sm font-medium text-slate-700`.

### Inputs (all three)

```html
<input
  class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3
         text-[15px] text-slate-800 placeholder:text-slate-400
         outline-none transition
         focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
/>
```

* **Eye icon buttons:** `text-slate-400 hover:text-slate-600 focus-visible:ring-2 ring-blue-300 rounded-md`

### Security note (bottom of card)

```html
<p class="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500">
  <span class="font-semibold">Security note:</span>
  Keys are generated and kept on this device. Nothing is sent over the network.
</p>
```

### Card footer (buttons)

* **Container:** `mt-6 flex items-center justify-end gap-3`
* **Clear:** `inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100`
* **Create Key (disabled):** `rounded-lg bg-slate-100 text-slate-400`
* **Create Key (enabled):** `rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 ring-blue-300 px-4 py-2.5`

### “How does this work?” link (below card)

```html
<div class="max-w-[960px] mx-auto mt-6">
  <button class="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 focus-visible:ring-2 ring-blue-300 rounded-md">
    <Info class="h-4 w-4" /> How does this work?
  </button>
</div>
```

---

# 3) Validation & states (single source of truth)

> All borders/bars/messages flip color by state; the base input shell stays the same.

## 3.1 Default (empty)

* All inputs use **base input** style above.
* Create Key = **disabled**.

## 3.2 Passphrase typing + strength meter

* **Strength bar container:** full-width, `h-1.5 w-full rounded-full bg-slate-200`
* **Fill:**

  * “Too short/weak”: `bg-red-700` (length proportionate)
  * “OK”: `bg-green-600` (length proportionate)
* **Strength label (above bar, left aligned):**

  * Weak: `text-sm font-medium text-red-600`
  * Strong: `text-sm font-medium text-green-600`

## 3.3 Field success (label / passphrase / confirm)

* **Input border:** `border-green-600`
* **Right-end success check:** `text-green-600`
* **Helper line (for confirm match):**
  `mt-2 inline-flex items-center gap-2 text-sm text-green-600`
  with a check icon.

## 3.4 Field error (confirm mismatch OR too short)

* **Input border:** `border-red-600`
* **Helper line:** `inline-flex items-center gap-2 text-sm text-red-600`
  (Use `X` icon at 16px.)
* **Strength bar (if too short):** `bg-red-700`

## 3.5 Button enablement

* **Create Key** becomes enabled when:

  * Key Label non-empty
  * Passphrase strength ≥ “OK” (min length we enforce)
  * Confirm matches exactly

---

# 4) Success card (after key creation)

**Placement:** replaces the form card area; same width.

```html
<div class="mt-6 max-w-[960px] mx-auto rounded-2xl border border-green-200 bg-green-50 p-6">
  <div class="flex items-start gap-3">
    <CheckCircle class="mt-0.5 h-5 w-5 text-green-600" />
    <div class="flex-1">
      <h3 class="text-base font-semibold text-green-700">Key generated successfully</h3>
      <p class="mt-1 text-sm text-slate-700">
        Your encryption keypair has been created and securely stored on this device.
      </p>

      <div class="mt-4">
        <p class="text-sm font-medium text-slate-700">Your public key</p>
        <code class="mt-2 block w-full truncate rounded-lg bg-slate-100 px-3 py-2 text-[13px] text-slate-800">
          age1…(entire key stays on one line; container is wide enough)
        </code>
      </div>

      <p class="mt-3 text-sm text-slate-500">
        Share this key with others so they can encrypt files for you.
      </p>
    </div>

    <button class="shrink-0 rounded-md p-1.5 text-slate-400 hover:text-slate-600 focus-visible:ring-2 ring-blue-300" aria-label="Dismiss">
      <X class="h-4 w-4" />
    </button>
  </div>
</div>
```

---

# 5) Component → state mapping (for code)

| Component key     | States                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `SetupHeader`     | static                                                                                     |
| `SecurityBadges`  | static                                                                                     |
| `KeyFormCard`     | `default` \| `typing` \| `pass_ok` \| `pass_weak` \| `confirm_match` \| `confirm_mismatch` |
| `StrengthMeter`   | `weak` (red) \| `ok`/`strong` (green)                                                      |
| `CreateKeyButton` | `disabled` \| `enabled`                                                                    |
| `SuccessAlert`    | `visible` \| `dismissed`                                                                   |

---

# 6) Accessibility checklist

* **Contrast:**

  * Slate text on white ≥ 7:1 (`slate-700`+)
  * `green-700` & `red-600` on white ≥ AA for text
* **Focus visible:** on inputs, icon-buttons, link, primary CTA (see ring above).
* **Icons:** not color-only — pair with text for errors/success labels.

---

# 7) What changed vs. earlier drafts (for clarity)

* Setup rail now **shares width** with Encrypt/Decrypt (`max-w-[960px]`).
* All validation colors use the **same green/red** we use on Encrypt/Decrypt success panels.
* Tight text blocks removed; **calmer** helper copy only where needed.
* Success card ensures **public key stays on one line** (no wrapping) because the container is wide enough.
