/**
 * Central barrel for every skeleton component in the app.
 *
 * - `Skeleton` and `SkeletonCircle` are the shimmer primitives
 *   (used to compose any custom loading placeholder).
 * - `<X>Skeleton` exports are full per-screen placeholders matching the
 *   live screen layout, so consumers can render a single component while
 *   data is loading.
 *
 * When adding a new loading state, prefer composing the `Skeleton` /
 * `SkeletonCircle` primitives into a new file in this folder named
 * `<ScreenName>Skeleton.tsx` and re-exporting it here.
 */

export { Skeleton, SkeletonCircle } from './Skeleton';

export { DashboardSkeleton } from './DashboardSkeleton';
export { PracticeSkeleton } from './PracticeSkeleton';
export { MockTestSkeleton } from './MockTestSkeleton';
export { VideosSkeleton } from './VideosSkeleton';
export { DailyFeedbackListSkeleton } from './DailyFeedbackListSkeleton';
export { MonthlyPredictionSkeleton } from './MonthlyPredictionSkeleton';
export { PdfListSkeleton } from './PdfListSkeleton';
export { PracticeCommonListSkeleton } from './PracticeCommonListSkeleton';
export { SubscriptionSkeleton } from './SubscriptionSkeleton';
