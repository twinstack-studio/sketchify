import * as Haptics from 'expo-haptics';

// Haptics are a nicety: never let a missing motor or a simulator throw.
const safe = (fn: () => Promise<void>) => () => {
  fn().catch(() => {});
};

export const tap = safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const tick = safe(() => Haptics.selectionAsync());
export const success = safe(() =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
);
export const warn = safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
