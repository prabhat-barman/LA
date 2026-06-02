# In-app tour — current state

All five tour sites are wired. The Tooltip component handles the
"show once on first mount, persist seen flag, never re-show again"
behaviour automatically.

## What ships in this branch

- `src/services/tourStorage.ts` — typed AsyncStorage wrapper. Holds
  the canonical `TOUR_KEYS` map, plus `hasSeenTour` /
  `markTourSeen` / `resetAllTours`.
- `src/components/organisms/Tooltip/Tooltip.tsx` — centred modal
  card with optional `dependsOn` prerequisite chaining so multiple
  tooltips on the same screen don't stack on top of each other.

## Wired sites

| Tour key                  | Mounted in                                              | Depends on              |
|---------------------------|---------------------------------------------------------|-------------------------|
| `DashboardWelcome`        | `DashboardScreen/index.tsx`                             | —                       |
| `DashboardCategories`     | `DashboardScreen/index.tsx`                             | `DashboardWelcome`      |
| `PracticeFirstQuestion`   | `Practice/PracticeQuestionDetail/index.tsx`             | —                       |
| `MockTestPrerequisite`    | `MockTest/MockTestPrerequisite/index.tsx`               | —                       |
| `ProgressTrackerIntro`    | `Progress/ProgressTracker/index.tsx`                    | —                       |

## Adding a new tour site

```tsx
import { Tooltip } from '../../../components/organisms/Tooltip';
import { TOUR_KEYS } from '../../../services/tourStorage';

<Tooltip
  tourKey={TOUR_KEYS.YourNewKey}
  title="Headline"
  body="One-paragraph body copy."
/>
```

Add the new key to `TOUR_KEYS` in `src/services/tourStorage.ts`
first. Chain it after another tooltip on the same screen by
passing `dependsOn={[TOUR_KEYS.OtherKey]}`.

## Resetting tours during QA

Call `resetAllTours()` from `src/services/tourStorage.ts` (e.g.
from a dev menu) to wipe every `tour:seen_v1:*` AsyncStorage flag
so all tooltips show again on next launch.

## Follow-up: anchored tooltips

The current Tooltip is a centred modal card. To get arrow-anchored
tooltips that attach to a specific UI element, install
`react-native-walkthrough-tooltip` and replace the `<Modal>` host
inside `Tooltip.tsx`. The public API is intentionally stable — no
call sites should need to change.
