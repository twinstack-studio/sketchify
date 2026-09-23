import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, IconButton } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Chip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Em, Text } from '@/components/ui/Text';
import { success, warn } from '@/lib/haptics';
import { cloudEnabled } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { useSync } from '@/store/sync';
import { color, font, radius, space } from '@/theme';

type Mode = 'sign-in' | 'sign-up';

const MODES = [
  { id: 'sign-in', label: 'Sign in' },
  { id: 'sign-up', label: 'Create account' },
] as const;

export default function SignIn() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const validPassword = password.length >= (mode === 'sign-up' ? 8 : 1);

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'sign-in') {
        await signIn(email.trim(), password);
      } else {
        const { needsConfirmation } = await signUp(email.trim(), password);
        if (needsConfirmation) {
          setNotice('Check your email for a confirmation link, then sign in here.');
          setMode('sign-in');
          return;
        }
      }
      success();
      useSync.getState().syncNow();
      router.back();
    } catch (e) {
      warn();
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.top}>
          <IconButton icon="x" label="Close" size={40} onPress={() => router.back()} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(400)} style={styles.badge}>
            <Icon name="cloud" size={30} color={color.accentInk} />
          </Animated.View>
          <Text variant="display">
            {mode === 'sign-in' ? (
              <>
                Welcome <Em>back</Em>.
              </>
            ) : (
              <>
                Keep every <Em>sketch</Em>.
              </>
            )}
          </Text>
          <Text tone="muted">
            {mode === 'sign-in'
              ? 'Sign in to back up your sketches and restore them on a new phone.'
              : 'An account keeps a private backup of your sketches in the cloud.'}
          </Text>

          {!cloudEnabled ? (
            <View style={styles.offline}>
              <Icon name="shieldCheck" size={20} color={color.accent} />
              <Text tone="muted" style={styles.flex}>
                Cloud backup is not set up in this build, so the app works fully offline.
              </Text>
            </View>
          ) : (
            <>
              <Segmented
                options={MODES}
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setError(null);
                }}
                style={styles.segmented}
              />
              <Field
                icon="mail"
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!busy}
              />
              <Field
                icon="lock"
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'sign-up' ? 'Password (8+ characters)' : 'Password'}
                secureTextEntry={!showPassword}
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                textContentType={mode === 'sign-up' ? 'newPassword' : 'password'}
                editable={!busy}
                onSubmitEditing={() => validEmail && validPassword && submit()}
                trailing={
                  <PressableScale
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={10}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name="eye" size={18} color={showPassword ? color.accent : color.faint} />
                  </PressableScale>
                }
              />

              {error ? (
                <View style={[styles.message, styles.messageError]}>
                  <Icon name="info" size={16} color={color.danger} />
                  <Text variant="caption" tone="danger" style={styles.flex}>
                    {error}
                  </Text>
                </View>
              ) : null}
              {notice ? (
                <View style={styles.message}>
                  <Icon name="mail" size={16} color={color.accent} />
                  <Text variant="caption" tone="accent" style={styles.flex}>
                    {notice}
                  </Text>
                </View>
              ) : null}

              <Button
                label={mode === 'sign-in' ? 'Sign in' : 'Create account'}
                icon="arrowRight"
                size="lg"
                onPress={submit}
                busy={busy}
                disabled={!validEmail || !validPassword}
                style={styles.submit}
              />
              <Text variant="caption" tone="faint" align="center">
                Your sketches stay on this phone whether or not you sign in.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({ icon, trailing, ...props }: TextInputProps & { icon: IconName; trailing?: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, focused && styles.fieldFocused]}>
      <Icon name={icon} size={18} color={focused ? color.accent : color.faint} />
      <TextInput
        {...props}
        placeholderTextColor={color.faint}
        selectionColor={color.accent}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={styles.input}
      />
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: space.md },
  body: { gap: space.md, paddingTop: space.md, paddingBottom: space.xxl },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.accent,
    marginBottom: space.sm,
  },
  segmented: { marginTop: space.md },
  offline: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
    marginTop: space.md,
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    borderWidth: 1.5,
    borderColor: color.line,
  },
  fieldFocused: { borderColor: color.accent },
  input: { ...font.body, flex: 1, color: color.text, paddingVertical: space.md },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.accentSoft,
  },
  messageError: { backgroundColor: color.dangerSoft },
  submit: { marginTop: space.sm },
});
