@sr-frontend-engineer — here’s the **Barqly Vault UI Color Token Map** + usage rules, and a fix for the “Encrypt Your Vault” heading being too strong. Please apply across Encrypt/Decrypt/Setup screens.

---

# Barqly Vault — UI Color Tokens & Usage

## Core palette (tokens + Tailwind equivalents)

```css
:root {
  /* Brand blues */
  --bv-blue-600: #2563EB; /* tailwind blue-600: primary accent, CTAs, active */
  --bv-blue-700: #1D4ED8; /* hover/active border */
  --bv-blue-800: #1E3A8A; /* long-form text in blue panels */

  /* Slate neutrals */
  --bv-slate-900: #0F172A; /* rare: top-level titles only if needed */
  --bv-slate-800: #1E293B; /* main headings (preferred) */
  --bv-slate-700: #334155; /* standard body text on white */
  --bv-slate-500: #64748B; /* inactive labels, secondary text */
  --bv-slate-400: #94A3B8; /* icons/placeholder/inactive iconography */
  --bv-slate-200: #E2E8F0; /* borders, dividers */
  --bv-slate-100: #F1F5F9; /* light fills */

  /* Tints */
  --bv-blue-50:  #EFF6FF;   /* help box background */
  --bv-blue-50-40: rgba(239,246,255,0.4); /* optional softer tint */

  /* Focus ring */
  --bv-focus: #93C5FD; /* blue-300 */
}
```

**Tailwind aliases** (use when possible):

* `text-bv-heading` → `text-slate-800`
* `text-bv-body` → `text-slate-700`
* `text-bv-secondary` → `text-slate-500`
* `text-bv-icon` → `text-slate-400`
* `border-bv` → `border-slate-200`
* `bg-bv-help` → `bg-blue-50` (or `bg-blue-50/40`)

If you extend Tailwind theme, add these as custom colors/utilities.

---

## Role-based usage rules

**Brand blue (—600)**

* Use for **primary actions and active states only**:

  * Buttons (text + border)
  * Active tab underline/icon
  * Active step badge
  * Key trust-building icons (e.g., lock in section header)
* Do **not** use for long body text (looks like links).

**Dark blue (—800)**

* Use for **body text inside blue-tinted panels** (e.g., Encryption Guide).
* Never use for buttons/links.

**Slate neutrals**

* `slate-800` → main headings on white
* `slate-700` → body text on white
* `slate-500` → inactive labels (tabs, step titles not active), helper text
* `slate-400` → muted icons, placeholders
* Borders/dividers → `slate-200`

**Focus**

* `focus-visible:ring-2 ring-blue-300 ring-offset-2 ring-offset-white`

---

## Component mapping (top → bottom of screen)

* **Top nav (Setup / Encrypt / Decrypt)**

  * Active: `text-blue-600`
  * Inactive: `text-slate-500`
  * Underline for active: `bg-blue-600`

* **Section header (“Encrypt Your Vault”)**

  * Text: `text-slate-800` `font-semibold`
  * Icon (lock): `text-blue-600`
  * (See heading softening fix below.)

* **Stepper**

  * Active pill: blue-600 background/text or outlined with blue-600 text
  * Inactive labels: `text-slate-500`
  * Dividers: `border-slate-200`

* **Dropzone**

  * Border: `border-slate-200` (dashed)
  * Arrow icon: `text-slate-400`
  * Helper text (“- or -”): `text-slate-500`

* **Primary buttons (“Select Files”, “Select Folder”)**

  * Base: `border-blue-600 text-blue-600 bg-white`
  * Hover: `hover:bg-[rgba(37,99,235,0.05)] hover:border-blue-700`
  * Active: `active:bg-[rgba(37,99,235,0.08)] active:border-blue-700`
  * Focus: `focus-visible:ring-2 ring-blue-300 ring-offset-2`

* **Encryption Guide panel**

  * Background: `bg-blue-50` (or `bg-blue-50/40`)
  * Border: `border-slate-200` (or `border-blue-100`)
  * Title + body text: `text-blue-800`
  * Numbered circles: white bg, `ring-slate-200`, number `text-blue-800`
  * Security note: `text-slate-500`, label bold

---

## Heading softening (the “too strong” issue)

**Problem**: “Encrypt Your Vault” appears too bold/bright versus the calm aesthetic.

**Change**

* Replace heading color from brand blue/black to **neutral heading**:

  * **Use**: `text-slate-800 font-semibold`
  * **Optional size**: `text-2xl md:text-[28px]` (down from 3xl if currently used)
* Keep the **lock icon** as the accent (blue-600), not the text.
* Do not use full black or brand blue for the heading text.

**Example**

```tsx
<h2 className="flex items-center gap-2 text-slate-800 text-2xl md:text-[28px] font-semibold">
  <LockIcon className="h-5 w-5 text-blue-600" />
  Encrypt Your Vault
</h2>
```

---

## Example snippets

**Inactive labels unify**

```html
<!-- Tabs -->
<a class="text-slate-500">Setup</a>
<a class="text-blue-600 border-b-2 border-blue-600">Encrypt</a>
<a class="text-slate-500">Decrypt</a>

<!-- Stepper -->
<span class="rounded-full px-3 py-1 text-blue-600 ring-1 ring-blue-600">1 Select Files</span>
<span class="text-slate-500">2 Choose Key</span>
<span class="text-slate-500">3 Encrypt Vault</span>
```

**Help panel**

```html
<div class="rounded-xl border border-slate-200 bg-blue-50 p-6">
  <h4 class="mb-4 text-base font-semibold text-blue-800">
    How Bitcoin Legacy Protection Works
  </h4>
  <!-- steps... -->
  <p class="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
    <span class="font-semibold">Security Note:</span> Your private key never leaves this device. Share your public key only with trusted individuals.
  </p>
</div>
```

---

## Accessibility checkpoints

* Text contrast:

  * `text-blue-800` on `bg-blue-50` ≥ 7:1
  * `text-slate-700` on white ≥ 7:1
  * `text-slate-500` on white ≥ 4.5:1 for small labels (meets AA)
* Focus visible on all interactive controls (`ring-blue-300`).
* Hover never the only cue; ensure active/inactive states differ by color **and** weight/background where appropriate.

---

## Quick QA checklist

* [ ] Section heading uses `text-slate-800 font-semibold` (not bright blue/black).
* [ ] Only primary actions & active states use `blue-600`.
* [ ] All inactive labels use `text-slate-500` consistently (tabs + stepper).
* [ ] Icons mostly `text-slate-400`, except key/lock icons `text-blue-600`.
* [ ] Borders/dividers unified on `border-slate-200`.
* [ ] Encryption Guide body uses `text-blue-800` and reads calmer than link-blue.
* [ ] Buttons share the same hover/active/focus styles across screens.

---

If anything here conflicts with existing Tailwind theme tokens, prefer these rules and adjust theme aliases accordingly.
