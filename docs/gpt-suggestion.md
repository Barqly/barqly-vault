@sr-frontend-engineer — please **do Encrypt first, then Decrypt**. After Encrypt: run fmt/lint, push for review; I’ll review before you touch Decrypt.

---

# Phase 1 — **Encrypt Screen** (implement, fmt/lint, push)

## A) Header (title row)

* Title text → `text-slate-800 font-semibold text-2xl md:text-[28px]`
* Lock icon → `text-blue-600`
* Tagline (top-right “Secure file encryption for Bitcoin custody”) — **Option 1 (tone down)**

  * `text-slate-500 text-sm font-normal`
  * Ensure vertical centering with the header row; no stronger than secondary labels.

## B) Top nav (Setup / Encrypt / Decrypt)

* Active tab (Encrypt): `text-blue-600` + underline `bg-blue-600`
* Inactive tabs: `text-slate-500`

## C) Stepper

* Active pill “1 Select Files”: blue-600 text/border (current style OK)
* Inactive labels “2 Choose Key”, “3 Encrypt Vault”: `text-slate-500`
* Dividers: `border-slate-200`

## D) Dropzone

* Border: `border-slate-200` dashed
* Upload icon: `text-slate-400`
* Helper copy “- or -”: `text-slate-500`
* Keep current spacing above/below consistent with Decrypt later

## E) Primary actions (buttons)

* Base: `border-blue-600 text-blue-600 bg-white`
* Hover: `hover:bg-[rgba(37,99,235,0.05)] hover:border-blue-700`
* Active: `active:bg-[rgba(37,99,235,0.08)] active:border-blue-700`
* Focus: `focus-visible:ring-2 ring-blue-300 ring-offset-2`

## F) Help panel (Encryption Guide)

* Container: `rounded-xl border border-slate-200 bg-blue-50 p-6`
* Title + body: `text-blue-800`
* Number circles: white bg, `ring-slate-200`, number `text-blue-800`
* Each step body is **one merged paragraph**; bold only the opening action phrase
* Security note: `text-xs text-slate-500` (label bold), top border `border-slate-200`

## G) Quick snippet (header w/ tagline)

```tsx
<header className="flex items-center justify-between">
  <h2 className="flex items-center gap-2 text-slate-800 text-2xl md:text-[28px] font-semibold">
    <Lock className="h-5 w-5 text-blue-600" />
    Encrypt Your Vault
  </h2>
  <span className="text-sm text-slate-500">Secure file encryption for Bitcoin custody</span>
</header>
```

**When done:** run formatter + linter, push branch, and ping me for a screenshot review.

---

# Phase 2 — **Decrypt Screen** (start only after Encrypt is reviewed)

## A) Header (title row)

* Title text → `text-slate-800 font-semibold text-2xl md:text-[28px]`
* Lock icon → `text-blue-600`
* Tagline (same as Encrypt): `text-slate-500 text-sm font-normal`

## B) Top nav

* Active tab (Decrypt): `text-blue-600` + underline `bg-blue-600`
* Inactive tabs (Setup, Encrypt): `text-slate-500`

## C) Stepper

* Active pill “1 Select Vault”: blue-600 text/border (match Encrypt styling)
* Inactive labels “2 Choose Key”, “3 Decrypt Vault”: `text-slate-500`
* Dividers: `border-slate-200`

## D) Dropzone

* Border: `border-slate-200` dashed
* Lock icon: `text-slate-400`
* Helper copy: `text-slate-500`
* Main line copy: “Drop your encrypted vault here (.age format)”

## E) Primary action (button)

* Same button styles as Encrypt (base/hover/active/focus)

## F) Help panel (Decryption Tips)

* Same container + colors as Encrypt Guide:

  * `bg-blue-50`, `border-slate-200`, text `text-blue-800`
* Keep numbered circles + merged paragraph pattern
* Security note: `text-xs text-slate-500` (label bold), top border `border-slate-200`

## G) Quick snippet (header w/ tagline)

```tsx
<header className="flex items-center justify-between">
  <h2 className="flex items-center gap-2 text-slate-800 text-2xl md:text-[28px] font-semibold">
    <Lock className="h-5 w-5 text-blue-600" />
    Decrypt Your Vault
  </h2>
  <span className="text-sm text-slate-500">Secure file encryption for Bitcoin custody</span>
</header>
```

---

## Shared QA checklist (apply on each screen before push)

* [ ] Heading uses `text-slate-800`, icon `text-blue-600`
* [ ] Tagline is `text-slate-500 text-sm` and visually secondary
* [ ] Inactive tabs + step labels use `text-slate-500`
* [ ] Dropzone icon `text-slate-400`; borders `border-slate-200`
* [ ] Buttons share identical hover/active/focus states
* [ ] Help panel uses `bg-blue-50` + `text-blue-800`; merged paragraphs; security note `text-xs text-slate-500`
* [ ] No brand-blue body text outside buttons/active states
* [ ] Focus-visible rings present on all interactive elements

Please proceed with **Encrypt Screen first**, then fmt/lint, push, and ping for review. After approval, repeat the same checklist for **Decrypt Screen**.
