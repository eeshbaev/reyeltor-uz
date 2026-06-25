export const motion = {
  quick: 150,
  standard: 250,
  gentle: 350,
  spring: { damping: 15, stiffness: 150, mass: 1 },
  springSnappy: { damping: 20, stiffness: 300, mass: 0.8 },
  clusterFlyDuration: 400,
} as const;
