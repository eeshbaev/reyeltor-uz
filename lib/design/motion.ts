/**
 * Motion tokens (design doc: Motion system). Springs run on the UI thread (Reanimated).
 * Navigation never takes longer than ~400 ms; every moment has a reduced-motion version.
 */
export const motion = {
  quick: 150,
  standard: 250,
  gentle: 350,
  pressScale: 0.97,
  /** Instant: press scale, chip toggle, heart. */
  springTap: { damping: 30, stiffness: 600, mass: 0.6 },
  /** Quick, no overshoot: bubble selection, carousel cards. */
  springSnappy: { damping: 24, stiffness: 380, mass: 0.8 },
  /** Weighty: sheets, side panel, filter sheet. */
  springSheet: { damping: 26, stiffness: 300, mass: 0.9 },
  /** Slight overshoot — signature moments only (first listing live, pin drop). */
  springExpressive: { damping: 16, stiffness: 180, mass: 1 },
  /** @deprecated use springSnappy or springExpressive */
  spring: { damping: 15, stiffness: 150, mass: 1 },
  clusterFlyDuration: 400,
} as const;
