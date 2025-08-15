## **Keyboard Focus & Action Behavior Spec (Global)**

### **1. Default Focus**

* When a screen loads, auto-focus the **primary call-to-action (CTA)** button or input.
* **Definition of primary CTA per screen:**

  * **Setup Screen** → First required input field (e.g., Key Label) so user can start typing right away.
  * **Encrypt Screen** → "Select Files" button.
  * **Decrypt Screen** → First enabled action button (e.g., "Choose Key" or "Decrypt Now"), depending on step.

---

### **2. Enter Key Activation**

* Pressing **Enter** when a button is focused should trigger its click handler.
* Pressing **Enter** in an input field should:

  * Submit the form **if validation passes**.
  * Otherwise, highlight the first invalid field and show error feedback.

---

### **3. Tab Navigation**

* Ensure **logical tab order** matches visual order.
* **Tab** → moves forward
* **Shift + Tab** → moves backward
* Skip disabled or hidden elements.

---

### **4. Focus Styling (Accessibility)**

* Use a **visible, high-contrast outline** or glow when an element is focused.
* Avoid relying only on color — ensure it meets WCAG 2.1 AA contrast requirements.
* Example CSS:

  ```css
  :focus-visible {
    outline: 2px solid #2563eb; /* blue-600 */
    outline-offset: 2px;
    border-radius: 6px;
  }
  ```

---

### **5. Escape Key**

* Pressing **Esc** while a modal, tooltip, or dropdown is open should close it without affecting the rest of the form.

---

### **6. Consistent Implementation**

* Implement the focus and Enter-key handling **in a shared component** so all screens inherit it automatically.
* Use the same logic for tooltips, dialogs, and confirmation screens.

---