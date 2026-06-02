import type {
  MockSection,
  MockTestRunnerRouteParams,
  MockTestVariant,
} from '../MockTestRunner/types';

// The carousel walks through one or more typed "slides". Each slide is
// a discriminated-union variant so the renderer can switch on `kind`
// and pull the correct per-slide config without any casts.
//
// Kept narrow on purpose — the reference project's prereq carousel
// has eight slides for Full Mock. We ship them all now that the
// `intro-recording` slide has its own MicrophoneCheckPlayer-based
// component.
export type PrerequisiteSlide =
  | { kind: 'headset-check'; id: string }
  | { kind: 'microphone-check'; id: string }
  | { kind: 'keyboard-check'; id: string }
  | { kind: 'test-introduction'; id: string }
  | { kind: 'speaking-instructions'; id: string }
  | { kind: 'welcome-table'; id: string }
  | { kind: 'intro-recording'; id: string }
  | { kind: 'module-intro'; id: string };

export type PrerequisiteSlideKind = PrerequisiteSlide['kind'];

// Subset of the runner's route params plus the user-visible name of
// the slide the user is currently on (handy for analytics later).
// We thread the same `mockId / variant / category / title / resume`
// values straight through to the runner on completion so neither
// screen has to refetch anything that wasn't already cached.
export type MockTestPrerequisiteRouteParams = MockTestRunnerRouteParams;

// Re-exported so other files can route on the same union the runner uses.
export type { MockSection, MockTestVariant };
