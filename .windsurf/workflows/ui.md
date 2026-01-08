---
auto_execution_mode: 1
---
# LifeOS Design System

## 1. The Axioms (UX Laws)
These are the non-negotiable constraints for all LifeOS interfaces.

### 🎯 Fitts's Law (Touch & Ergonomics)
*Constraint: Minimum Interactive Size*
> "The time to acquire a target is a function of the distance to and size of the target."

* **Rule:** All interactive elements (buttons, inputs, icons) must have a touch target of at least **44px**.
* **Implementation:**
    * Buttons: Minimum `min-h-[44px]` (or default DaisyUI `btn`).
    * Icons: If an icon is clickable, wrap it in a `btn btn-ghost btn-circle` to ensure the hit area is sufficient.
    * Spacing: Interactive elements must have `gap-2` (8px) separation to prevent "fat finger" errors.

### 🧠 Hick's Law (Cognitive Load)
*Constraint: Decision Simplicity*
> "The time it takes to make a decision increases with the number and complexity of choices."

* **Rule:** Interfaces must prioritize the "Next Best Action." Avoid "Kitchen Sink" dashboards.
* **Implementation:**
    * **Max Options:** Menus and Lists should default to showing **5-7 items** max before engaging "Show More" or scrolling.
    * **Primary Action:** Every screen must have exactly **one** primary action (`btn-primary`), distinct from secondary actions (`btn-ghost` or `btn-outline`).
    * **Kid Test:** Labels must be concise. Use icons + text pairs where possible to aid recognition (e.g., for the 7-year-old user).

### ⚡ Doherty Threshold (Perceived Performance)
*Constraint: System Feedback <400ms*
> "Productivity soars when a computer and its users interact at a pace that ensures neither has to wait on the other."

* **Rule:** The UI must feel instant (Local-First), regardless of network status.
* **Implementation:**
    * **Optimistic UI:** Toggle states (like "Lights On") must update the icon **immediately** upon click, reverting only if the server request fails.
    * **Loading Skips:** Avoid full-page loaders. Use "Skeleton" loaders (`skeleton` class) for specific data regions.
    * **Active States:** All buttons must have an `:active` (press) state scale animation (`active:scale-95`) to provide immediate tactile confirmation.

## 2. The Primitives (Catalyst)
Use these DaisyUI component configurations to enforce the "Sci-Fi HUD" aesthetic.

### 🔘 Buttons (Actions)
* **Primary Action:** `btn btn-primary btn-sm md:btn-md rounded-sm uppercase tracking-widest font-bold`
    * *Style:* Sharp corners, high contrast.
    * *Use for:* Initiating a command (e.g., "ENGAGE", "DEPLOY").
* **Secondary Action:** `btn btn-outline btn-secondary btn-sm md:btn-md rounded-sm`
    * *Style:* Wireframe look.
    * *Use for:* Navigation or toggles.
* **Destructive:** `btn btn-error btn-outline rounded-sm`
    * *Use for:* "ABORT" or Delete actions.

### 🃏 Cards (Containers)
* **Data Frame:** `card bg-base-100/80 backdrop-blur-md border border-primary/20 rounded-none shadow-[0_0_15px_rgba(0,0,0,0.5)]`
    * *Style:* "Glassmorphism" with a subtle neon border glow. Looks like a floating display pane.
    * *Use for:* Grouping related data (e.g., "Sensor Readings").
* **Widget:** `card bg-neutral text-neutral-content rounded-sm border-l-4 border-accent`
    * *Style:* Solid, technical block with a color-coded indicator on the left.
    * *Use for:* Single metrics (e.g., "Battery Level").

### 📟 Typography & Data
* **Headers:** `font-sans uppercase tracking-widest text-primary/80 text-xs mb-2`
    * *Style:* Small, technical labels (e.g., "SYSTEM STATUS").
* **Values:** `font-mono text-xl md:text-3xl text-accent`
    * *Style:* Monospace numbers for readability (e.g., "420.5 V").

## 3. The Generator (Design Studio)
When generating new UI components, follow these logic rules to ensure a consistent "Sci-Fi/Cyber" theme using standard utility classes.

### 🎨 Theme Enforcement (The "No Hard-Coding" Rule)
1.  **Never use arbitrary colors** (e.g., `bg-blue-500`). Always use semantic DaisyUI colors:
    * `primary`: Main actions & active states.
    * `secondary`: Supporting lines & borders.
    * `accent`: Highlights, values, and important data.
    * `neutral`: Backgrounds for secondary containers.
    * `base-100/200/300`: Layered backgrounds.
2.  **Dark Mode Default:** Assume the interface is always in Dark Mode. Use `base-content` (usually white/light gray) for text.

### 📐 The "HUD" Construction Logic
1.  **Squared > Rounded:** Avoid `rounded-xl` or `rounded-full`. Prefer `rounded-none`, `rounded-sm`, or `rounded-md`. Sci-Fi is precise, not bubbly.
2.  **Borders are Structure:** Use borders (`border border-base-content/10`) to define hierarchy instead of shadows. Shadows should be used for *glow* effects, not depth.
3.  **Density:** Sci-Fi interfaces are information-dense. Use `gap-2` and `p-2` by default. Only increase padding for top-level layout containers.
4.  **Monospace Numbers:** ALWAYS use `font-mono` for any number that changes (timers, prices, sensor readings). It implies "Data," not just "Text."

### 🎞️ Motion & Feedback
1.  **Instant Response:** All interactive elements must have `active:bg-primary/20` to simulate a touch-screen light-up effect.
2.  **Status Indicators:** If a value is "Good," use `text-success`. If "Critical," use `text-error` + `animate-pulse`.

### 🏰 Architecture: Decoupled Configuration
* **No Monorepo Config:** Each micro-frontend (`garage`, `budget`, etc.) manages its own theme.
* **Location:** The theme is defined in `routes/_app.tsx` via the `<html data-theme="...">` attribute.
* **Drift Policy:** It is acceptable for apps to diverge. The Garage can be "dim" (Dark Mode) while the Budget is "corporate" (Light Mode).