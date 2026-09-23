import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';

import { TabBar } from '@/components/ui/TabBar';
import { useSettings } from '@/store/settings';
import { color } from '@/theme';

export default function TabsLayout() {
  const onboarded = useSettings((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.bg },
        animation: 'fade',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Studio' }} />
      <Tabs.Screen name="batch" options={{ title: 'Batch' }} />
      <Tabs.Screen name="gallery" options={{ title: 'Gallery' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
