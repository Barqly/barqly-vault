
## **1) Background**

* **Light blue tint** (very subtle):

  * Tailwind: `bg-blue-50` (hex `#EFF6FF`) — WCAG-safe with dark text.
  * If you want even softer: `bg-blue-50/40` for a 40% opacity tint over white.

---

## **2) Main Step Text**

* **Dark neutral-blue for body text** (reads as brand color, not a link):

  * Tailwind: `text-blue-800` (hex `#1E3A8A`) — deep enough for high contrast.
  * WCAG Contrast vs. `bg-blue-50`: **8.2:1** (well above AA large/small text requirements).
  * Avoid `text-blue-600` for body — that’s your button/link blue and may feel clickable.

---

## **3) Step Titles & Bold Fragments**

* Keep same `text-blue-800` color.
* Add `font-semibold` for emphasis instead of changing the color — weight is enough to draw the eye without adding more shades.

---

## **4) Security Note**

* Use a **muted gray** to make it secondary:

  * Tailwind: `text-slate-500` (hex `#64748B`) — meets contrast on `bg-blue-50`.
  * Keep “Security Note:” in `font-semibold` for emphasis.

---

## **5) Icons & Numbered Circles**

* Numbered circles:

  * Background: white (`bg-white`), border: `ring-1 ring-slate-200`.
  * Text: `text-blue-800` for consistency with step text.
* Icons:

  * `text-blue-600` for subtle accent, but no fill — keep line style for minimalism.

---

## **6) Tailwind Example**

```tsx
<div className="rounded-xl border border-blue-100 bg-blue-50 p-6">
  <h4 className="mb-4 text-base font-semibold text-blue-800">
    How Bitcoin Legacy Protection Works
  </h4>

  <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
    {/* Step */}
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-semibold text-blue-800 ring-1 ring-slate-200">
          1
        </span>
        <span className="text-sm md:text-base font-semibold text-blue-800">
          Key Generation
        </span>
      </div>
      <p className="text-sm text-blue-800 leading-relaxed">
        <span className="font-semibold">Your keypair is created and stored securely</span> on this device. Uses industry-standard <code>age</code> encryption. Your passphrase protects the private key.
      </p>
    </div>
    {/* Repeat for steps 2 & 3 */}
  </div>

  <p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
    <span className="font-semibold">Security Note:</span> Your private key never leaves this device. Share your public key only with trusted individuals.
  </p>
</div>
```

