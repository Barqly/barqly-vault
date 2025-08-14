@agent-sr-frontend-engineer  Here’s the detailed **full audit + ready-to-use instructions** for the entire **Encrypt Flow** so @sr-frontend-engineer can apply them step-by-step without having to interpret color codes or translate design guidance.

---

## **Audit & Implementation Instructions for Encrypt Flow**

---

### **General Rules Across All Steps**

1. **Heading "Encrypt Your Vault"**

   * Reduce color intensity: use `text-slate-800` (not pure black).
   * Keep font-weight `font-semibold` instead of `font-bold` to soften appearance.
   * Ensure consistent top/bottom spacing across all steps.

2. **Tagline "Secure file encryption for Bitcoin custody"**

   * Keep it on the right, but use lighter color `text-slate-500` for subtlety.
   * Reduce font size to `text-sm` for less visual weight.
   * This should never repeat (remove duplication seen earlier).

3. **Stepper (Select Files → Choose Key → Encrypt Vault)**

   * Active step: Blue `text-blue-600` + `border-blue-600`.
   * Completed step: Green `text-green-600` + checkmark icon.
   * Inactive step: Gray `text-slate-500`.
   * Ensure spacing between step items is consistent.

4. **Buttons**

   * Primary: `bg-blue-600 hover:bg-blue-700 text-white`.
   * Secondary: `bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`.
   * Disabled: `bg-slate-100 text-slate-400 cursor-not-allowed`.

5. **Help Box (Encryption Guide)**

   * Background: `bg-blue-50`.
   * Main headings: `text-blue-800 font-semibold`.
   * Body text: `text-slate-700`.
   * Security note: `text-slate-500 italic`.

---

### **Step-by-Step Changes**

---

#### **Step 1 – Select Files**

* Dropzone border: `border-dashed border-2 border-slate-300`.
* Drop icon: `text-slate-400`.
* Instruction text: `text-slate-600`.
* File/folder select buttons: `border border-blue-600 text-blue-600 hover:bg-blue-50`.
* Continue button disabled until files selected.

---

#### **Step 2 – Choose Key**

* Dropdown border: `border-slate-300`.
* Placeholder text: `text-slate-500 italic`.
* Selected key name: `text-slate-800 font-medium`.
* Timestamp below key: `text-slate-500 text-xs`.
* When key is selected:

  * Show public key in monospace font `font-mono text-slate-700`.
  * Eye icon for hide/show: `text-slate-500 hover:text-slate-700`.
* Continue button enabled only after key selection.

---

#### **Step 3 – Encrypt Vault (Ready State)**

* Card background: `bg-green-50 border border-green-200`.
* Heading "Ready to Encrypt Your Vault": `text-green-800 font-semibold`.
* File path text: `text-slate-700 font-mono`.
* Checklist items:

  * Icon: `text-green-600`.
  * Text: `text-slate-700`.
* Change location link: `text-blue-600 hover:underline`.

---

#### **Step 4 – Encryption Success**

* Card background: `bg-green-50 border border-green-200`.
* Success heading: `text-green-800 font-semibold`.
* Subtext (e.g., “Military-grade encryption applied”): `text-slate-700 text-sm`.
* File path list:

  * `font-mono text-slate-700`.
  * Copy button: `bg-slate-100 hover:bg-slate-200 text-slate-700`.
* Encrypt More button: same style as primary button.

---

### **Checklist for @sr-frontend-engineer**

1. Apply **heading softening** (`text-slate-800 font-semibold`) across all steps.
2. Update tagline styling (`text-slate-500 text-sm`).
3. Fix stepper active/completed/inactive color logic.
4. Apply button style rules consistently.
5. Adjust dropzone colors and text in Step 1.
6. Style key selection dropdown + public key in Step 2.
7. Apply green card styling for Step 3 and Step 4 success states.
8. Ensure **no duplication** of tagline.
9. Run `fmt/lint` after changes.
10. Commit after **Encrypt Flow** is complete before starting **Decrypt Flow**.

---