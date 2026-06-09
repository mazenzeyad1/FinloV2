# Finlo Design System

A modern-fintech design language for the Finlo web app (React + Tailwind) and mobile app (Expo + NativeWind). The goal: make money feel **clear, calm, and trustworthy** — one confident green accent, lots of whitespace, and numbers that are easy to read at a glance.

The companion file `finlo-design-mockup.html` shows this system applied to real screens. Open it in a browser and use the Web / Mobile toggle.

---

## 1. Design principles

1. **Clarity over decoration.** Every screen answers one question first ("how much do I have / how am I doing"). Secondary detail is one tap away, never crowding the headline number.
2. **One accent, used with intent.** Green means *your money / positive / primary action*. Don't spend it on decoration — when everything is green, nothing is.
3. **Trust through restraint.** Soft shadows, rounded cards, generous spacing. No harsh borders, no neon. The look should feel like a bank that respects you.
4. **Numbers are the hero.** Tabular figures, tight letter-spacing on large amounts, consistent currency formatting. Charts support the number, not the other way around.
5. **Same brain, two bodies.** Web and mobile share tokens, naming, and component logic. A "budget row" looks like the same idea on both, sized for the device.
6. **Accessible by default.** 4.5:1 text contrast minimum, 44×44px minimum tap targets, never color alone to signal state (pair with icon/label).

---

## 2. Color palette

### Brand
| Token | Hex | Use |
|---|---|---|
| `brand` | `#0E9F6E` | Primary green — buttons, active nav, positive amounts, progress |
| `brand-600` | `#0B8A5F` | Hover / pressed |
| `brand-700` | `#097552` | Text on mint, deep accents |
| `brand-glow` | `#13B981` | Gradient partner (buttons, balance card) |
| `mint` | `#E9FBF3` | Tinted backgrounds, positive chips, icon tiles |
| `mint-2` | `#D6F6E8` | Slightly deeper mint surface |

### Ink & neutrals
| Token | Hex | Use |
|---|---|---|
| `ink` | `#0F172A` | Primary text, large numbers, dark surfaces |
| `ink-2` | `#334155` | Secondary text |
| `muted` | `#64748B` | Labels, captions |
| `faint` | `#94A3B8` | Meta text, placeholders, axis labels |
| `bg` | `#F6F8FA` | App background |
| `card` | `#FFFFFF` | Cards, sheets |
| `line` | `#E8EDF2` | Card borders |
| `line-2` | `#EEF2F6` | Internal dividers, track backgrounds |

### Semantic & data
| Token | Hex | Use |
|---|---|---|
| `positive` | `#0E9F6E` | Income, gains (= brand) |
| `negative` | `#E0524B` | Over-budget, losses, destructive |
| `warning` | `#F4A93C` | Approaching limit |
| Chart 1 | `#0E9F6E` | green |
| Chart 2 | `#6366F1` | indigo |
| Chart 3 | `#14B8A6` | teal |
| Chart 4 | `#F4A93C` | amber |
| Chart 5 | `#8B5CF6` | violet |
| Chart 6 | `#CBD5E1` | "Other" / neutral grey |

**Dark accent surface** (balance card, sidebar): gradient `#0E1B2A → #0C1622`, with a green radial glow `rgba(19,185,129,.5)` in one corner. This is the only place we go dark — it makes the primary balance feel premium without committing the whole app to dark mode.

> Dark mode (future): swap `bg→#0C1622`, `card→#13212F`, `ink→#F1F5F9`, keep `brand` as-is. The dark accent surface already proves the palette works inverted.

---

## 3. Typography

System font stack (no web-font load cost, native feel on each platform):
`-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif`.

| Role | Size / weight | Notes |
|---|---|---|
| Display balance | 30–34px / 780 | `letter-spacing:-.03em`, tabular numerals |
| Page title (H1) | 26px / 750 | `-.02em` |
| Card KPI value | 27px / 750 | `-.025em` |
| Section heading (H3/H4) | 15–16px / 700 | |
| Body | 14px / 400–600 | |
| Label / caption | 12.5–13px / 600 | `muted` |
| Meta / axis | 11.5–12px / 500 | `faint` |

Rules: all monetary values use `font-variant-numeric: tabular-nums` so columns align. Large amounts get negative letter-spacing; small text never goes below 11px.

---

## 4. Spacing, radius, elevation

- **Spacing scale (px):** 4, 8, 12, 16, 18, 20, 24, 30. Card padding 20 (web) / 16 (mobile). Gaps between cards 18 (web) / 14 (mobile).
- **Radius:** cards 18px, large surfaces / balance card 24px, buttons & inputs 12px, pills 999px, phone screen 34px.
- **Elevation (2 levels only):**
  - `shadow` = `0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06)` — resting cards.
  - `shadow-lg` = `0 10px 40px rgba(16,24,40,.12)` — modals, the app frame, floating elements.
  - Colored buttons get a tinted shadow (`rgba(14,159,110,.32)`) for a subtle lift.

---

## 5. Components

### Buttons
- **Primary (green):** gradient `brand → brand-glow`, white text, tinted shadow. The single most important action per screen (Connect bank, Add money).
- **Secondary:** white fill, `line` border, `ink` text. Hover lifts the border + adds `shadow`.
- **Dark:** `ink` fill, white text — for high-emphasis neutral actions.
- Height 40px (web) / 48–52px (mobile). Icon + label, 8px gap.

### Cards
White, 18px radius, `line` border, `shadow`, 20px padding. A card holds exactly one idea with a header row (`title` + optional `link ›`). Never nest cards more than one level.

### KPI tile
Label with a colored 30px icon tile → big tabular value → delta pill. Delta pills: green `up`, red `down` (arrow rotates), grey `flat`. Always pair the color with an arrow/label, never color alone.

### Transaction row
`[merchant avatar] [name + meta] [category pill] [amount]`. Avatar is a colored rounded square with initials (or brand logo). Income amounts are green with `+`; spending is `ink` with `−`. Mobile drops the category pill to fit width and shows it in the detail sheet instead.

### Budget row
`[emoji tile] name … spent / limit` over a 9px progress bar. Bar fills with the category color; **over-budget turns the bar and amount red** and caps the fill at 100%. This is the one place red appears proactively.

### Progress ring
Used for goals. Track = `line-2` (or translucent white on dark), fill = brand or category color, rounded cap, percentage centered. Small (52px) in lists, large (120px) on the dark goal hero.

### Charts
- **Donut** for category breakdown — 16px stroke, rounded caps, 3px gaps between segments, total amount in the center.
- **Grouped bars** for cash flow — income in `brand`, spending in `#CBD5E1`, 5px corner radius, thin baseline only (no gridlines).
- **Sparklines / area** for trends — single brand stroke, soft `mint` fill.
- Built with Recharts (web) — palette above maps 1:1 to its `fill` props.

### Pills / chips
999px radius, 12px/600 text. Filter chips: active = `ink` fill/white, inactive = `mint`/`brand-700`. Status chips reuse semantic colors at low saturation.

---

## 6. Web layout

- **248px fixed sidebar** on the dark accent surface: logo, primary nav (Dashboard, Accounts, Transactions, Budgets, Goals, Transfers, Investments), an upsell card, and the user chip pinned to the bottom. Active item gets the green gradient + glow.
- **Content area:** page header (greeting + date, actions on the right) → KPI row (4 tiles) → charts row (cash flow + category donut) → budgets + recent transactions (2-up) → goals (3-up).
- **Grid:** 4 / 3 / 2 column helpers, 18px gutters, max content width ~1280px. Collapses to single column under 980px (sidebar becomes a bottom bar or drawer).

## 7. Mobile layout

- **Home:** greeting + avatar → dark **balance card** (total + income/spending chips) → 4 **quick actions** (Transfer, Add, Budgets, Goals) → spending donut card → recent transactions card. A **floating green + button** for the top action and a **bottom tab bar** (Home, Activity, Budgets, Goals).
- **Activity:** title + filter, horizontal filter chips, transactions grouped by day in cards.
- **Goal detail:** back/title/overflow header → dark hero with progress ring → two stat cards (monthly, ETA) → contributions list → full-width "Add money" button.
- Tap targets ≥44px, content padding 16px, cards 18px radius. Bottom tab bar uses a blurred translucent white with the active tab in `brand-600`.

---

## 8. Mapping to the codebase

**Web (`frontend/`, Tailwind):** add these to `tailwind.config.ts` `theme.extend.colors`:

```ts
colors: {
  brand:   { DEFAULT:'#0E9F6E', 600:'#0B8A5F', 700:'#097552', glow:'#13B981' },
  mint:    { DEFAULT:'#E9FBF3', 2:'#D6F6E8' },
  ink:     { DEFAULT:'#0F172A', 2:'#334155' },
  muted:   '#64748B', faint:'#94A3B8',
  surface: { bg:'#F6F8FA', card:'#FFFFFF', line:'#E8EDF2', line2:'#EEF2F6' },
  danger:  '#E0524B', warning:'#F4A93C',
}
```
Add `boxShadow.card` and `boxShadow.cardLg`, set `borderRadius.card:'18px'`. Recharts series use the chart palette in order. Heroicons (already a dependency) are the icon set — the mockup mimics their stroke style.

**Mobile (`mobile/`, NativeWind):** mirror the same tokens in `tailwind.config.js` so class names match across apps (`bg-brand`, `text-ink`, `rounded-card`). Use `@react-navigation` bottom tabs for the tab bar; the FAB is an absolutely-positioned `Pressable`.

---

## 9. Quick do / don't

| Do | Don't |
|---|---|
| Lead each screen with one big number | Stack five charts above the fold |
| Use green only for money & the primary action | Color every button green |
| Show over-budget in red with an icon | Rely on color alone to signal state |
| Keep cards to one idea each | Nest cards inside cards |
| Use tabular numerals for all amounts | Mix proportional + tabular figures |
| Two shadow levels, soft | Hard 1px borders everywhere |
