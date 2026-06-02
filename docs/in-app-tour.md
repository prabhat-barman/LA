# In-app tour — current state + remaining sites

This branch lays the foundation for the first-time-user tour /
walkthrough flow. One site is wired (Dashboard welcome); the rest
are sketched here as concrete follow-up tickets.

## What ships in this branch

- `src/services/tourStorage.ts` — typed AsyncStorage wrapper. Holds
  the canonical `TOUR_KEYS` map, plus `hasSeenTour` /
  `markTourSeen` / `resetAllTours`.
- `src/components/organisms/Tooltip/Tooltip.tsx` — centred modal
  card that surfaces once per `tourKey` and persists the dismiss
  flag automatically.
- One wired tour: Dashboard welcome modal — see
  `<Tooltip tourKey={TOUR_KEYS.DashboardWelcome} ... />` in
  `DashboardScreen/index.tsx`.

## Wiring a new tour site (3 lines)

```tsx
import { Tooltip } from '../../../components/organisms/Tooltip';
import { TOUR_KEYS } from '../../../services/tourStorage';

<Tooltip
  tourKey={TOUR_KEYS.PracticeFirstQuestion}
  title="Your first practice question"
  body="Tap a category card, pick a question, and submit — you'll get instant AI feedback."
/>
```

The Tooltip handles "show on first mount, persist seen flag, never
re-show" automatically.

## Remaining sites (declared keys, not yet wired)

The following keys exist in `TOUR_KEYS` and need a `<Tooltip>` mount
on the corresponding screen. Pick them up in any order:

| Tour key                       | Where it goes                           | What it should say |
|--------------------------------|-----------------------------------------|--------------------|
| `DashboardCategories`          | DashboardScreen — first category card   | "Tap any skill to drill into question types and start practicing." |
| `PracticeFirstQuestion`        | PracticeQuestionDetail — first opening  | "Listen to the question, record / type your answer, then tap Submit to get scored." |
| `MockTestPrerequisite`         | MockTestPrerequisite — first opening    | "Mocks are timed end-to-end. Make sure you have ~3 hours and a stable internet connection before starting." |
| `ProgressTrackerIntro`         | ProgressTracker — first opening         | "Watch your accuracy per skill and per question type as you log more attempts." |

## Follow-up: anchored tooltips

The current Tooltip is a centred modal card. To get arrow-anchored
tooltips that attach to a specific UI element (Figma-style),
install `react-native-walkthrough-tooltip` and replace the
`<Modal>` host inside `Tooltip.tsx`. The public API
(`tourKey/title/body/ctaLabel/onDismiss`) is intentionally stable —
no call sites should need to change.
