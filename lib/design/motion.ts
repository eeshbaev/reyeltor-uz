export const motion = {
  quick: 150,
  standard: 250,
  gentle: 350,
  pressScale: 0.97,
  spring: { damping: 15, stiffness: 150, mass: 1 },
  springSnappy: { damping: 20, stiffness: 300, mass: 0.8 },
  springSheet: { damping: 22, stiffness: 280, mass: 0.9 },
  clusterFlyDuration: 400,
} as const;
