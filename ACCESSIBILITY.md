# Accessibility Statement for repointxt

Corbit Technologies is committed to ensuring digital accessibility for software engineers, developers, and users of all abilities. We continuously improve the user experience for everyone and apply relevant accessibility standards across all of our open-source tools.

---

## 🎯 Conformance Status

We aim to adhere to the **Web Content Accessibility Guidelines (WCAG) 2.1 Level AA** standards.

### Key Accessibility Implementations:
- **Keyboard Navigation:** Core actions can be executed via keyboard shortcuts (`⌘↵` / `Ctrl+Enter` to generate bundles, `Tab` for focusable elements).
- **Color Contrast:** Modern high-contrast color palettes designed to meet minimum contrast ratios in dark and light modes.
- **Form Controls & Labels:** Inputs, checkboxes, and sliders feature distinct visual focus outlines and touch-accessible tap targets.
- **Font Scaling & Prevention of Auto-Zoom:** Responsive typography calibrated to prevent forced viewport zooming on mobile and high-DPI displays.

---

## 🛠️ Supported Environments

repointxt is tested and supported across modern evergreen browsers:
- Google Chrome & Chromium-based browsers (Brave, Edge, Opera)
- Mozilla Firefox
- Apple Safari (macOS & iOS)

---

## ⚠️ Known Limitations & Ongoing Work

- **Deep Virtualized File Trees:** Very large monorepo trees ($>3,000$ files) use DOM virtualization (`@tanstack/react-virtual`). We are actively optimizing ARIA tree roles and keyboard traversal (`Up`/`Down`/`Right`/`Left` arrow keys) across virtualized nodes.

---

## 📬 Feedback & Contact

We welcome your feedback on the accessibility of repointxt. If you encounter accessibility barriers:

- **E-mail:** [accessibility@corbittechnologies.com](mailto:accessibility@corbittechnologies.com)
- **GitHub Issues:** Open an issue labeled `accessibility` on [GitHub Issues](https://github.com/CorbitTechnologies/repointxt/issues)

We aim to respond to accessibility reports within 2 business days.
