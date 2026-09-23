import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { StylePreview } from '@/components/art/StylePreview';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Chip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { tick } from '@/lib/haptics';
import { cloudEnabled } from '@/lib/supabase';
import { FILTERS, FILTER_BY_ID, type StyleId } from '@/skia/filters';
import { useAuth } from '@/store/auth';
import { useLibrary } from '@/store/library';
import { FORMATS, useSettings, type ExportResolution } from '@/store/settings';
import { useSync } from '@/store/sync';
import { color, family, radius, space } from '@/theme';

const SIZES: { id: ExportResolution; label: string }[] = [
  { id: 1440, label: '1440' },
  { id: 2560, label: '2560' },
  { id: 4096, label: '4096' },
];
const SIZE_HINT: Record<ExportResolution, string> = {
  1440: 'Standard: quick to share, small files.',
  2560: 'High: sharp on any phone screen.',
  4096: 'Max: for printing. Slower to save.',
};
const FORMAT_HINT = {
  png: 'PNG keeps every detail; the largest files.',
  jpg: 'JPG is the smallest and opens everywhere.',
  webp: 'WebP is small and sharp; not every app opens it.',
} as const;

export default function Profile() {
  const router = useRouter();
  const settings = useSettings();
  const items = useLibrary((s) => s.items);
  const session = useAuth((s) => s.session);
  const signOut = useAuth((s) => s.signOut);
  const sync = useSync();

  const favourites = items.filter((i) => i.favourite).length;
  const pending = items.filter((i) => !i.syncedAt || i.syncedAt < i.updatedAt).length;
  const topStyle = mostUsed(items.map((i) => i.style));
  const email = session?.user.email;

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your sketches stay on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <Screen scroll tabs>
      <ScreenHeader overline="You" title="Profile" />

      <View style={styles.hero}>
        <View style={styles.avatar}>
          {email ? (
            <Text style={styles.initial}>{email[0].toUpperCase()}</Text>
          ) : (
            <Icon name="user" size={28} color={color.accentInk} />
          )}
        </View>
        <View style={styles.flex}>
          <Text variant="title" numberOfLines={1}>
            {email ?? 'Guest artist'}
          </Text>
          <Text variant="caption" tone="muted">
            {email ? 'Backing up to the cloud' : 'Everything stays on this phone'}
          </Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat value={String(items.length)} label="Sketches" />
        <Stat value={String(favourites)} label="Favourites" />
        {topStyle ? (
          <View style={[styles.stat, styles.statStyle]}>
            <StylePreview style={topStyle} width={34} height={42} radius={6} />
            <View style={styles.flex}>
              <Text variant="heading" numberOfLines={1}>
                {FILTER_BY_ID[topStyle].name}
              </Text>
              <Text variant="caption" tone="muted">
                Top style
              </Text>
            </View>
          </View>
        ) : (
          <Stat value={String(FILTERS.length - 1)} label="Styles" />
        )}
      </View>

      <Section title="Export">
        <Row icon="image" title="File format" hint={FORMAT_HINT[settings.format]} />
        <Segmented
          options={FORMATS}
          value={settings.format}
          onChange={(format) => settings.set({ format })}
        />
        <Divider />
        <Row icon="crop" title="Size (long edge)" hint={SIZE_HINT[settings.resolution]} />
        <Segmented
          options={SIZES}
          value={settings.resolution}
          onChange={(resolution) => settings.set({ resolution })}
        />
        <Divider />
        <Row
          icon="download"
          title="Also save to Photos"
          hint="Copy every saved sketch to your photo library."
          right={
            <Toggle
              value={settings.saveToGallery}
              label="Also save to Photos"
              onChange={(saveToGallery) => settings.set({ saveToGallery })}
            />
          }
        />
        <Divider />
        <Row
          icon="sparkles"
          title="Watermark"
          hint="A small “Sketchify” mark in the corner."
          right={
            <Toggle
              value={settings.watermark}
              label="Watermark"
              onChange={(watermark) => settings.set({ watermark })}
            />
          }
        />
      </Section>

      <Section title="Cloud backup">
        {!cloudEnabled ? (
          <Row
            icon="shieldCheck"
            title="Offline build"
            hint="Cloud backup is switched off, so nothing ever leaves your phone."
          />
        ) : session ? (
          <>
            <Row
              icon={sync.error ? 'info' : 'cloud'}
              title={
                sync.running
                  ? `Uploading ${sync.done} of ${sync.total}…`
                  : pending === 0
                    ? 'Everything is backed up'
                    : `${pending} not backed up yet`
              }
              hint={sync.error ? `Last sync failed: ${sync.error}` : `Signed in as ${session.user.email}`}
              danger={!!sync.error}
            />
            <View style={styles.row}>
              <Button
                label="Back up now"
                icon="cloudUpload"
                size="sm"
                busy={sync.running}
                disabled={pending === 0}
                onPress={sync.syncNow}
                style={styles.flex}
              />
              <Button label="Sign out" icon="logOut" size="sm" variant="secondary" onPress={confirmSignOut} />
            </View>
          </>
        ) : (
          <>
            <Row
              icon="cloud"
              title="Keep your sketches safe"
              hint="Sign in to back them up and keep them if you change phones."
            />
            <Button label="Sign in" icon="mail" size="sm" onPress={() => router.push('/sign-in')} />
          </>
        )}
      </Section>

      <Section title="About">
        <PressableScale
          to={0.98}
          onPress={() => {
            tick();
            settings.set({ onboarded: false });
          }}
        >
          <Row icon="eye" title="Show the welcome tour" right={<Icon name="chevronRight" size={18} color={color.faint} />} />
        </PressableScale>
        <Divider />
        <Row
          icon="shieldCheck"
          title="Private by design"
          hint="Every style renders on your phone. Photos are only uploaded if you turn on backup."
        />
      </Section>

      <Text variant="caption" tone="faint" align="center" style={styles.version}>
        Sketchify {Constants.expoConfig?.version ?? ''}
      </Text>
    </Screen>
  );
}

function mostUsed(styles: StyleId[]): StyleId | null {
  const counts = new Map<StyleId, number>();
  for (const s of styles) counts.set(s, (counts.get(s) ?? 0) + 1);
  let best: StyleId | null = null;
  for (const [s, n] of counts) if (!best || n > (counts.get(best) ?? 0)) best = s;
  return best;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="overline" tone="muted" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function Row({
  icon,
  title,
  hint,
  right,
  danger,
}: {
  icon: IconName;
  title: string;
  hint?: string;
  right?: ReactNode;
  danger?: boolean;
}) {
  return (
    <View style={styles.rowItem}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Icon name={icon} size={18} color={danger ? color.danger : color.accent} />
      </View>
      <View style={styles.flex}>
        <Text variant="heading">{title}</Text>
        {hint ? (
          <Text variant="caption" tone={danger ? 'danger' : 'muted'}>
            {hint}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

function Toggle({ value, label, onChange }: { value: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        tick();
        onChange(v);
      }}
      trackColor={{ false: color.line, true: color.accent }}
      thumbColor={color.paper}
      accessibilityLabel={label}
    />
  );
}

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.xxl,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.accent,
  },
  initial: { fontFamily: family.serif, fontSize: 26, color: color.accentInk },
  stats: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  stat: {
    flex: 1,
    padding: space.md,
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    justifyContent: 'center',
  },
  statStyle: { flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  statValue: { fontFamily: family.serif, fontSize: 26, lineHeight: 32, color: color.text },
  section: { marginTop: space.xxl, gap: space.sm },
  sectionTitle: { paddingHorizontal: space.xs },
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.xxl,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.accentSoft,
  },
  rowIconDanger: { backgroundColor: color.dangerSoft },
  divider: { height: 1, backgroundColor: color.line, marginVertical: 2 },
  version: { marginTop: space.xxl },
});
