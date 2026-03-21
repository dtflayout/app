# DTF Layout — Design System Specification
## Pexo-Inspired Redesign

---

## 1. TYPOGRAPHY (Inter only)

| Element              | Weight | Size     | Letter-spacing | Line-height | Tailwind Class Example                          |
|----------------------|--------|----------|----------------|-------------|--------------------------------------------------|
| Hero Heading (H1)    | 700    | 56px     | -0.025em       | 1.1         | `text-[56px] font-bold tracking-tight leading-[1.1]` |
| Section Heading (H2) | 700    | 42px     | -0.02em        | 1.15        | `text-[42px] font-bold tracking-tight leading-[1.15]` |
| Card Title (H3)      | 600    | 22px     | -0.01em        | 1.3         | `text-[22px] font-semibold leading-[1.3]`       |
| Body Text            | 400    | 17px     | normal         | 1.6         | `text-[17px] font-normal leading-relaxed`        |
| Small Body           | 400    | 14px     | normal         | 1.55        | `text-sm font-normal`                            |
| Button               | 600    | 15px     | 0.01em         | 1           | `text-[15px] font-semibold`                      |
| Nav Links            | 500    | 14px     | normal         | 1           | `text-sm font-medium`                            |
| Labels / Badges      | 500    | 13px     | 0.02em         | 1           | `text-xs font-medium tracking-wide`              |
| Big Stat Numbers     | 800    | 72px     | -0.03em        | 1.0         | `text-[72px] font-extrabold tracking-tighter`    |
| Price Display        | 700    | 48px     | -0.025em       | 1.1         | `text-5xl font-bold tracking-tight`              |

---

## 2. COLOR PALETTE

### Core Colors
| Token                    | Value     | Usage                              |
|--------------------------|-----------|-------------------------------------|
| `--color-primary`        | `#4F46E5` | Primary buttons, active states, links |
| `--color-primary-hover`  | `#4338CA` | Primary hover state                |
| `--color-primary-light`  | `#EEF2FF` | Soft/tinted button bg, active sidebar tint |
| `--color-text-heading`   | `#111827` | Headings, bold text                |
| `--color-text-body`      | `#6B7280` | Body text, descriptions            |
| `--color-text-muted`     | `#9CA3AF` | Placeholders, captions, secondary  |
| `--color-bg`             | `#F7F7F5` | Page background                    |
| `--color-surface`        | `#FFFFFF` | Cards, modals, panels              |
| `--color-border`         | `#E5E7EB` | Borders, dividers                  |

### Card Tint Colors
| Name         | Gradient                                      | Usage                    |
|--------------|-----------------------------------------------|--------------------------|
| Indigo Tint  | `135deg, #EEF2FF → #E0E7FF`                  | Primary feature cards    |
| Mint Tint    | `135deg, #ECFDF5 → #D1FAE5`                  | Success/positive cards   |
| Peach Tint   | `135deg, #FFF7ED → #FED7AA`                  | Warning/attention cards  |
| Pink Tint    | `135deg, #FDF2F8 → #FCE7F3`                  | Accent cards             |
| Sky Tint     | `135deg, #F0F9FF → #BAE6FD`                  | Info cards               |
| Yellow Tint  | `135deg, #FEFCE8 → #FEF08A`                  | Highlight cards          |

---

## 3. GRADIENTS

### Hero / Page Backgrounds
| Name                 | CSS                                                            |
|----------------------|----------------------------------------------------------------|
| Soft Lavender Wash   | `linear-gradient(160deg, #EEF2FF 0%, #C7D2FE 30%, #DDD6FE 60%, #F5F3FF 100%)` |
| Lavender → Blush     | `linear-gradient(160deg, #E0E7FF 0%, #EDE9FE 40%, #FCE7F3 70%, #FFF1F2 100%)` |

### Dark Backgrounds (sections, floating bars, dark hero variants)
| Name                 | CSS                                                            |
|----------------------|----------------------------------------------------------------|
| Deep Navy → Indigo   | `linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)` |

### Button / CTA Gradients
| Name                  | CSS                                                           |
|-----------------------|---------------------------------------------------------------|
| Navy → Indigo         | `linear-gradient(135deg, #312E81 0%, #4F46E5 100%)`          |
| Indigo → Violet       | `linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%)` |

### Mesh / Radial (page backgrounds, hero sections)
| Name                    | CSS                                                         |
|-------------------------|-------------------------------------------------------------|
| Indigo+Violet+Blue Mesh | `radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.12) 0%, transparent 50%), radial-gradient(ellipse at 60% 80%, rgba(59,130,246,0.1) 0%, transparent 50%), #F7F7F5` |
| Corner Glow             | `radial-gradient(ellipse at 0% 0%, rgba(79,70,229,0.12) 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(124,58,237,0.1) 0%, transparent 50%), linear-gradient(180deg, #FAFAFA 0%, #F3F4F6 100%)` |
| Top Glow + Pink         | `radial-gradient(ellipse at 30% 0%, rgba(99,102,241,0.2) 0%, transparent 50%), radial-gradient(ellipse at 70% 100%, rgba(236,72,153,0.08) 0%, transparent 50%), #FFFFFF` |

---

## 4. BUTTON STYLES

### Shape
- All buttons: **Pill** (`border-radius: 9999px`)

### Primary Buttons

**Solid Primary**
```css
background: #4F46E5;
color: #fff;
font-weight: 600;
font-size: 15px;
padding: 12px 28px;
border-radius: 9999px;
/* Hover: */
background: #4338CA;
transform: translateY(-2px);
box-shadow: 0 8px 24px rgba(79, 70, 229, 0.35);
```

**Gradient Primary**
```css
background: linear-gradient(135deg, #4F46E5, #7C3AED);
color: #fff;
/* Hover: */
background: linear-gradient(135deg, #4338CA, #6D28D9);
transform: translateY(-2px);
box-shadow: 0 8px 28px rgba(99, 102, 241, 0.4);
```

### Secondary Buttons

**Outline**
```css
background: transparent;
color: #111827;
border: 1.5px solid #E5E7EB;
/* Hover: */
border-color: #4F46E5;
color: #4F46E5;
background: rgba(79, 70, 229, 0.04);
transform: translateY(-1px);
box-shadow: 0 4px 12px rgba(0,0,0,0.06);
```

**Outline → Fill**
```css
background: transparent;
color: #4F46E5;
border: 1.5px solid #4F46E5;
/* Hover: */
background: #4F46E5;
color: #fff;
transform: translateY(-2px);
box-shadow: 0 8px 24px rgba(79, 70, 229, 0.3);
```

**Soft / Tinted**
```css
background: #EEF2FF;
color: #4F46E5;
/* Hover: */
background: #E0E7FF;
transform: translateY(-1px);
box-shadow: 0 4px 16px rgba(79, 70, 229, 0.12);
```

### Button Sizes
| Size    | Padding         | Font-size |
|---------|-----------------|-----------|
| Small   | 8px 18px        | 13px      |
| Default | 12px 28px       | 15px      |
| Large   | 16px 36px       | 16px      |
| XL      | 18px 44px       | 17px      |

---

## 5. SIDEBAR — Style 1: Deep Indigo

### Colors
| Token                    | Value                                              |
|--------------------------|-----------------------------------------------------|
| Background               | `linear-gradient(180deg, #1E1B4B 0%, #0F0D2E 100%)` |
| Logo icon bg             | `#4F46E5`                                           |
| Logo text                | `#FFFFFF`                                           |
| Credits box bg           | `rgba(79,70,229,0.15)` border `rgba(79,70,229,0.2)` |
| Credits value            | `#A5B4FC`                                           |
| Credits bar bg           | `rgba(255,255,255,0.1)`                             |
| Credits bar fill         | `linear-gradient(90deg, #6366F1, #818CF8)`          |
| Nav item (default)       | `#A5B4FC`                                           |
| Nav item (hover)         | bg `rgba(99,102,241,0.1)`, color `#E0E7FF`          |
| Nav item (active)        | bg `#4F46E5`, color `#FFFFFF`                        |
| Badge (e.g. "New")       | bg `rgba(251,146,60,0.2)`, color `#FB923C`           |
| Divider                  | `rgba(99,102,241,0.15)`                              |
| User avatar bg           | `rgba(99,102,241,0.2)`, color `#A5B4FC`              |
| User name                | `#E0E7FF`                                            |
| User email               | inherit with `opacity: 0.6`                          |

### Structural specs
- Width collapsed: 70px
- Width expanded: 260px
- Nav item border-radius: 10px
- Nav item padding: 10px 12px
- Nav item font: 13.5px / 500 weight
- Logo icon: 32x32, border-radius 8px
- Avatar: 32x32, border-radius 8px
- Credits bar height: 4px

---

## 6. BORDER RADIUS SYSTEM

| Token        | Value   | Usage                              |
|--------------|---------|------------------------------------|
| `--radius-sm`  | 8px   | Small elements, badges, inputs     |
| `--radius-md`  | 12px  | Buttons (rounded variant), cards   |
| `--radius-lg`  | 16px  | Cards, modals                      |
| `--radius-xl`  | 20px  | Feature cards, large panels        |
| `--radius-2xl` | 24px  | Hero cards, prominent elements     |
| `--radius-full`| 9999px| Pills, buttons, badges             |

---

## 7. SHADOW SYSTEM

| Name           | Value                                          | Usage                    |
|----------------|------------------------------------------------|--------------------------|
| `shadow-xs`    | `0 1px 2px rgba(0,0,0,0.05)`                 | Subtle input borders     |
| `shadow-sm`    | `0 2px 8px rgba(0,0,0,0.04)`                 | Cards at rest            |
| `shadow-md`    | `0 4px 12px rgba(0,0,0,0.06)`                | Buttons at rest          |
| `shadow-lg`    | `0 8px 24px rgba(0,0,0,0.08)`                | Cards on hover           |
| `shadow-xl`    | `0 20px 40px rgba(0,0,0,0.12)`               | Modals, elevated panels  |
| `shadow-glow`  | `0 8px 24px rgba(79,70,229,0.35)`            | Primary button hover     |
| `shadow-glow-lg`| `0 8px 28px rgba(99,102,241,0.4)`            | Gradient button hover    |

---

## 8. CSS VARIABLES (for index.css)

```css
:root {
  --background: 0 0% 97%;           /* #F7F7F5 */
  --foreground: 222.2 84% 4.9%;     /* #111827 */
  --primary: 243.4 75.4% 58.6%;     /* #4F46E5 */
  --primary-foreground: 0 0% 100%;  /* #FFFFFF */
  --secondary: 220 14.3% 95.9%;     /* #F1F5F9 */
  --muted: 220 14.3% 95.9%;
  --muted-foreground: 220 8.9% 46.1%; /* #6B7280 */
  --accent: 243.4 75.4% 58.6%;      /* same as primary */
  --accent-foreground: 0 0% 100%;
  --border: 220 13% 91%;            /* #E5E7EB */
  --input: 220 13% 91%;
  --ring: 243.4 75.4% 58.6%;        /* #4F46E5 */
  --radius: 0.75rem;                /* 12px base */
}
```

---

## 9. MAPPING: Old → New

| Element                 | Old (Current)                       | New                                    |
|-------------------------|--------------------------------------|----------------------------------------|
| Primary color           | Emerald `#10b981`                   | Indigo `#4F46E5`                       |
| Primary hover           | Emerald-700                          | Indigo-700 `#4338CA`                   |
| Active nav bg           | `emerald-600`                        | `#4F46E5`                              |
| Sidebar bg              | `slate-900`                          | `gradient(#1E1B4B → #0F0D2E)`         |
| Page bg                 | `emerald-100/50 via white`           | `#F7F7F5` or mesh gradient             |
| CTA gradient            | `green-500 to emerald-500`           | `#4F46E5 to #7C3AED`                  |
| Floating bar bg         | `slate-800 to slate-900`             | `gradient(#0F172A → #312E81)`          |
| Credits bar             | `emerald-500 to teal-500`            | `#6366F1 to #818CF8`                   |
| Upload bar border       | `emerald → teal → cyan`             | `#4F46E5 → #7C3AED` or `#6366F1 → #A78BFA` |
| Card border-radius      | mixed                                | 20-24px consistently                   |
| Button border-radius    | mixed (rounded-lg, rounded-xl)       | Pill (`9999px`) everywhere             |
| Button shape            | Various                              | Pill only                              |

---

## 10. IMPLEMENTATION ORDER

1. **Global theme** — `index.css` (CSS variables, font import), `tailwind.config.ts` (colors, radius)
2. **AppSidebar** — Deep Indigo style with all color tokens
3. **AppLayout** — Update page background
4. **Buttons** — Update `button.tsx` variants in shadcn
5. **FloatingLayoutBar** — Dark navy gradient, new CTA style
6. **UploadBar** — Indigo gradient border
7. **Toolbox** — Update tool icon colors to indigo palette
8. **CollageCreator** — Hero section typography + spacing
9. **Navbar** — Floating pill style
10. **Modals/Dialogs** — Updated radius, button styles
11. **Marketing pages** — Full visual overhaul (biggest task)
