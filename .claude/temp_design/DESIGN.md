---
name: Premium Marketplace System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#9d4300'
  on-secondary: '#ffffff'
  secondary-container: '#fd761a'
  on-secondary-container: '#5c2400'
  tertiary: '#2b6954'
  on-tertiary: '#ffffff'
  tertiary-container: '#71af97'
  on-tertiary-container: '#004231'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783200'
  tertiary-fixed: '#b0f0d6'
  tertiary-fixed-dim: '#95d3ba'
  on-tertiary-fixed: '#002117'
  on-tertiary-fixed-variant: '#0b513d'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

This design system is engineered for a high-end e-commerce marketplace, balancing the utility of a logistics platform with the editorial elegance of a luxury boutique. The aesthetic is **Corporate / Modern** with a strong emphasis on **Minimalism** and high-density information architecture inspired by industry leaders like Stripe and Linear.

The brand personality is authoritative yet vibrant. It leverages generous whitespace to let high-quality product photography breathe, while utilizing sharp, precision-engineered components to instill a sense of reliability and technical excellence. The emotional response should be one of effortless trust, speed, and premium quality.

## Colors

The palette is anchored by a deep **Emerald Green** (#10B981) derived from the source imagery, serving as the primary driver for successful actions and brand identity. This is paired with **Karakata Orange** (#F97316), used sparingly as a high-visibility accent for notifications, badges, or "limited offer" urgency.

- **Primary:** Emerald Green. Used for primary buttons, active states, and success indicators.
- **Secondary:** Karakata Orange. Reserved for highlights, cart counts, and seasonal promotions.
- **Tertiary:** Deep Forest. A darker shade of the emerald used for high-contrast text or hover states on primary elements.
- **Neutral:** A sophisticated range of cool grays. Backgrounds use a very soft #F8FAFC, while borders use #E2E8F0 to maintain a lightweight, airy feel.

## Typography

The design system utilizes **Geist** for its entire scale to achieve a technical, precise, and modern look. The typography scale is built on a modular 4px baseline.

For high-end e-commerce, product titles use `headline-md` with semi-bold weights to command attention without overwhelming the grid. Body text is set with generous line-height to ensure readability during long browsing sessions. Labels and metadata (SKUs, categories) utilize `label-md` in all-caps with increased letter spacing to differentiate them from interactive body text.

## Layout & Spacing

The system follows a strict **8px spacing grid**. All dimensions, padding, and margins are multiples of 8, ensuring a rhythmic and predictable layout.

The layout uses a **Fluid Grid** model:
- **Desktop (1440px+):** 12-column grid with 64px side margins and 24px gutters.
- **Tablet (768px - 1439px):** 8-column grid with 32px side margins and 16px gutters.
- **Mobile (Below 768px):** 4-column grid with 16px side margins and 16px gutters.

Large sections are separated by `xl` (40px) spacing to maintain the "premium" feel of uncrowded content. Smaller groupings within cards use `sm` (8px) and `md` (16px) spacing.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layers** and **Ambient Shadows**. This design system avoids heavy borders in favor of depth.

1.  **Level 0 (Base):** The main background (#F8FAFC).
2.  **Level 1 (Cards/Surface):** White surfaces (#FFFFFF) with a very subtle 1px border (#E2E8F0) and a soft, diffused shadow: `0px 1px 3px rgba(0,0,0,0.05)`.
3.  **Level 2 (Modals/Popovers):** Higher elevation with a deep, multi-layered shadow: `0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -2px rgba(0,0,0,0.05)`.

Interactive elements like buttons use a slight upward lift (Y-axis translation) on hover rather than aggressive color changes to maintain a sophisticated feel.

## Shapes

The shape language is defined as **Rounded**, utilizing a 12px (0.75rem) standard corner radius for primary containers to balance approachability with a professional structure.

- **Standard (Cards, Input Fields):** 12px.
- **Buttons & Small Components:** 8px to appear more precise and "clickable."
- **Badges/Tags:** Fully rounded (pill-shaped) to distinguish them from structural elements.

## Components

### Buttons
- **Primary:** Solid Emerald Green with white text. High-contrast, 8px radius.
- **Secondary:** Ghost style. Transparent background with a 1px border of the Primary color.
- **Tertiary:** Subtle gray background (#F1F5F9) for low-priority actions like "Cancel" or "View More."

### Input Fields
- White background with a 1px border (#E2E8F0).
- Focus state: Border transitions to Emerald Green with a 2px outer glow (ring) of the same color at 20% opacity.
- Labels are positioned outside the field in `body-sm` bold.

### Cards
- White background, 12px radius, Level 1 shadow.
- Padding should be a minimum of `lg` (24px) for product showcases to ensure a premium feel.

### Chips & Badges
- Used for categories or order status. 
- Status-specific: "In Stock" uses a light emerald tint; "Low Stock" uses Karakata Orange tint.

### Lists
- Clean, borderless rows separated by 1px horizontal dividers (#F1F5F9).
- High-density information with Geist Mono used for price points or tracking numbers to emphasize the technical nature of the platform.