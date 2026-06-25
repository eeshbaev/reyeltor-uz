export type StyleSpecification = {
  version: number;
  sources: Record<string, unknown>;
  layers: unknown[];
};

export const EMPTY_MAP_STYLE: StyleSpecification = {
  version: 8 as const,
  sources: {},
  layers: [],
};
