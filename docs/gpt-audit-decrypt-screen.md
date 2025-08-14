awesome—decrypt flow looks really solid already. here’s a **full audit + one consolidated, Tailwind-ready instruction set** for @sr-frontend-engineer so they can implement without translating anything.

---

# @sr-frontend-engineer — Decrypt Flow: Final Implementation Checklist (Tailwind-ready)

> Goal: mirror Encrypt flow visuals/behavior exactly, with Decrypt-specific copy and inputs.

## 0) Global rules (apply to all steps)

* **Header title**: `text-slate-800 text-2xl md:text-[28px] font-semibold`
  Icon next to title: `text-blue-600`
* **Tagline (right side)**: `text-sm text-slate-500` (render **once** in the header row; never in stepper row)
* **Stepper**

  * Active: `text-blue-600` with blue underline/divider (`bg-blue-600` or `border-blue-600`)
  * Completed: `text-green-600` with check icon `text-green-600`
  * Inactive: `text-slate-500`
  * Dividers: `border-slate-200`
* **Primary button**: `bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-2 ring-blue-300 ring-offset-2`
* **Secondary button** (Previous): `bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`
* **Disabled button** (Continue): `bg-slate-100 text-slate-400 cursor-not-allowed`
* **Cards/panels**: `rounded-2xl border border-slate-200 bg-white shadow-sm` (match Encrypt)
* **Help box** (Decryption Tips): `rounded-xl border border-slate-200 bg-blue-50 p-6 text-blue-800`
  Security note: `text-xs text-slate-500` with label bold.

---

## 1) Step 1 — **Select Vault**

### Dropzone

* Wrapper card: `rounded-2xl border border-slate-200 bg-white`
* Dropzone area: `rounded-xl border-2 border-dashed border-slate-300 p-10`
* Icon (lock): `text-slate-400`
* Headline: `text-slate-700`
* Sub “- or -”: `text-slate-500`
* **Button** (“Select Vault”): `border border-blue-600 text-blue-600 hover:bg-[rgba(37,99,235,0.05)] active:bg-[rgba(37,99,235,0.08)] focus-visible:ring-2 ring-blue-300 ring-offset-2`

### Validation

* If user drops a non-`.age` file: inline message below dropzone:
  `text-sm text-slate-600` with hint “Only .age vaults are supported.”

---

## 2) Step 2 — **Choose Key & Passphrase**

### Key selector

* Combobox field: `rounded-lg border border-slate-300 bg-white`
* Placeholder (closed): `text-slate-500`
* Selected key (closed): `text-slate-800 font-medium`
* Dropdown list item: same as Encrypt

  * Name: `text-slate-800 font-medium`
  * Meta/date: `text-xs text-slate-500`
* Public key preview (read-only): `font-mono text-slate-700 bg-slate-50 rounded-lg border border-slate-200`
* Eye icon in preview row (if applicable): `text-slate-500 hover:text-slate-700`

### Passphrase input

* Input: `rounded-lg border border-slate-300`
  Placeholder: `text-slate-500`
  Show/Hide button: `text-slate-500 hover:text-slate-700` (right adornment)
* Error state (invalid passphrase):

  * Input border → `border-red-500`
  * Inline message under input: `text-sm text-red-600`
  * Keep layout height consistent to avoid jump (reserve 1 line).

### Memory Hints panel

* Container: `rounded-lg border border-blue-200 bg-blue-50/60`
* Header row: `text-slate-700 font-medium` with caret
* List items:

  * Key name line: `text-blue-700` (clickable? if yes, cursor-pointer + underline on hover)
  * Vault name line: `text-slate-700`
  * Icons (key/info): `text-blue-600`

### Continue button

* Enabled only when: **key selected** AND **passphrase non-empty** (and validation passes if applicable)
* Style: primary button spec above.

---

## 3) Step 3 — **Decrypt Vault (Ready State)**

* Card: `rounded-2xl border border-green-200 bg-green-50`
* Title: `text-green-800 font-semibold`
* Recovery path row:

  * Field style: `font-mono text-slate-700 bg-white rounded-lg border border-slate-200`
  * “Change location” link: `text-blue-600 hover:underline`
* Checklist (3 items): each row

  * Check icon: `text-green-600`
  * Text: `text-slate-700`
* Primary CTA (“Decrypt Now”): primary button spec

---

## 4) **Success State — “Vault Successfully Decrypted!”**

* Card: `rounded-2xl border border-green-200 bg-green-50`
* Header row:

  * Leading check icon: `text-green-600`
  * Title: `text-green-800 font-semibold`
  * Subtext: `text-slate-700 text-sm` (“Files recovered and ready to use”)
* Summary strip (chips):

  * “1 file” chip: `rounded-full bg-slate-100 text-slate-700 text-sm` with file icon `text-blue-600`
  * Size chip: same style (`text-slate-700`); drive icon muted `text-slate-500`
  * Right-side badges (e.g., **Verified**, **Manifest Restored**):
    `rounded-full bg-green-100 text-green-800 text-xs font-medium`
* Saved-to path section:

  * Label (folder icon + “Saved to”): `text-slate-700 font-medium`
  * Path input: `font-mono text-slate-700 bg-white rounded-lg border border-slate-200`
  * Copy button: `bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md`
* Final CTA (“Decrypt More”): primary button spec

---

## 5) Micro-interactions (shared)

* **Hover/focus for outline buttons** (like “Select Vault”):

  * Hover: `hover:bg-[rgba(37,99,235,0.05)] hover:border-blue-700`
  * Active: `active:bg-[rgba(37,99,235,0.08)] active:border-blue-700`
  * Focus: `focus-visible:ring-2 ring-blue-300 ring-offset-2`
* **Accordion/caret** (Decryption Tips & Memory Hints):

  * Animate height/opacity `transition-all duration-150 ease-in-out`
  * Preserve layout (no big jumps)

---

## 6) Copy (quick pass for consistency)

* Step 1 headline inside dropzone:
  `Drop your encrypted vault here (.age format)`
* Step 2 labels:

  * Field label: **Encryption Key**
  * Public key row label: **Public Key**
  * Input placeholder: `Enter your key passphrase`
* Step 3 card title: **Ready to Decrypt Your Vault**
  Checklist items (green):

  * Valid vault file selected
  * Key and passphrase verified
  * Recovery location ready
* Success title: **Vault Successfully Decrypted!**
  Subtext: **Files recovered and ready to use**

---

## 7) QA checklist (tick before push)

* [ ] **Header**: title `text-slate-800 font-semibold`; lock icon `text-blue-600`; tagline `text-sm text-slate-500` (appears once)
* [ ] **Stepper**: active (blue), completed (green + check), inactive (slate-500), dividers `border-slate-200`
* [ ] **Dropzone**: dashed `border-slate-300`, icon `text-slate-400`, helper text `text-slate-500`, button matches outline-primary spec
* [ ] **Key selector**: borders/placeholder per spec; dropdown item typography correct
* [ ] **Public key**: mono, muted, read-only field style
* [ ] **Passphrase**: show/hide icon works; error state uses red border + inline message
* [ ] **Memory Hints**: blue-tint panel style; links/icons colored as specified
* [ ] **Ready card**: green-50/green-200; checklist icons/text per spec
* [ ] **Success card**: badges, chips, copy button, path field per spec
* [ ] **Buttons**: hover/active/focus states match across all steps
* [ ] **Help box**: blue-50 background; body `text-blue-800`; security note `text-xs text-slate-500`
* [ ] **No duplicate taglines**; spacing between header/stepper/card consistent with Encrypt

---

## 8) Tiny polish (nice-to-have)

* Limit long file/path strings with middle truncation in the input (`text-ellipsis` fallback → custom middle-truncate if available).
* Ensure all interactive elements have `focus-visible` ring.
* Keep min tap targets ≥ 44×44.

---

if you implement exactly as above, decrypt will feel perfectly mirrored to encrypt, and the whole flow will read calm, trustworthy, and fast to scan. want me to do a last-pass pixel check after the update? send me fresh screenshots and i’ll mark any 1–2px nits.
