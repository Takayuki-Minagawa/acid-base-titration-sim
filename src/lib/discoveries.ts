export const DISCOVERY_IDS = [
  'firstDrop',
  'equivalence',
  'colorChange',
  'rightIndicator',
  'buffer',
  'halfEquiv',
  'reverse',
  'allTypes',
  'quizPerfect',
] as const
export type DiscoveryId = typeof DISCOVERY_IDS[number]
