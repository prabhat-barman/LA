// Shared navigation route-param types. Keeps the param shapes out of
// the navigator implementation so screens and other consumers can
// import them without pulling in the navigator's runtime dependencies.

// Section labels accepted as the initial category for the Practice tab.
// Anything outside this set is ignored on the receiving screen.
export type PracticeSection = 'Speaking' | 'Writing' | 'Reading' | 'Listening';

export type DashboardTabParamList = {
  Home: undefined;
  // `initialCategory` lets the Home dashboard hand off a specific skill
  // section to the Practice tab on first navigation. The Practice screen
  // clears the param after consuming it so subsequent tab-bar taps don't
  // override the user's current selection.
  Practice: { initialCategory?: PracticeSection } | undefined;
  Mock: undefined;
  Videos: undefined;
  Menu: undefined;
};
