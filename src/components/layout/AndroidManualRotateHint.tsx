import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getLockedUiOrientation,
  iconRotationForPose,
  isOrientationLockHeld,
  lockInitialOrientation,
  lockUiOrientation,
  physicalPoseFromDevice,
  poseToUi,
  requestDeviceOrientationPermission,
  shouldUseManualRotateHint,
  type PhysicalPose,
  type UiOrientation,
} from '@/src/services/pwaOrientation';

/**
 * 안드로이드 내비 바 수동 회전을 흉내:
 * 웹앱이 방향을 잠근 뒤, 기기를 돌리면 왼쪽 아래에 아이콘이 뜨고
 * 탭하면 그 방향으로 다시 잠근다.
 */
export function AndroidManualRotateHint() {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(false);
  const [held, setHeld] = useState(false);
  const [locked, setLocked] = useState<UiOrientation>('portrait');
  const [pose, setPose] = useState<PhysicalPose | null>(null);
  const poseRef = useRef<PhysicalPose | null>(null);
  const poseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncLockState = useCallback(() => {
    setHeld(isOrientationLockHeld());
    setLocked(getLockedUiOrientation());
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!shouldUseManualRotateHint()) return;

    setActive(true);
    void lockInitialOrientation().then(syncLockState);

    const armOnGesture = () => {
      void requestDeviceOrientationPermission();
      void lockInitialOrientation().then(syncLockState);
    };
    window.addEventListener('pointerdown', armOnGesture, { once: true, passive: true });

    const orient = typeof screen !== 'undefined' ? screen.orientation : null;
    const onOrientChange = () => syncLockState();
    orient?.addEventListener?.('change', onOrientChange);

    const onDeviceOrient = (e: DeviceOrientationEvent) => {
      const next = physicalPoseFromDevice(e.beta, e.gamma, poseRef.current);
      if (!next || next === poseRef.current) return;
      if (poseTimer.current) clearTimeout(poseTimer.current);
      poseTimer.current = setTimeout(() => {
        poseRef.current = next;
        setPose(next);
      }, 80);
    };
    window.addEventListener('deviceorientation', onDeviceOrient);

    return () => {
      window.removeEventListener('pointerdown', armOnGesture);
      orient?.removeEventListener?.('change', onOrientChange);
      window.removeEventListener('deviceorientation', onDeviceOrient);
      if (poseTimer.current) clearTimeout(poseTimer.current);
    };
  }, [syncLockState]);

  const show = useMemo(() => {
    if (!active || !held || pose == null) return false;
    return poseToUi(pose) !== locked;
  }, [active, held, pose, locked]);

  const iconDeg = pose ? iconRotationForPose(pose) : 0;

  const onPress = useCallback(async () => {
    if (!pose) return;
    const target = poseToUi(pose);
    const ok = await lockUiOrientation(target, pose);
    if (ok) {
      setHeld(true);
      setLocked(target);
    }
  }, [pose]);

  if (!show) return null;

  return (
    <View
      style={[
        styles.host,
        {
          left: Math.max(insets.left, 10),
          bottom: Math.max(insets.bottom, 10) + 8,
        },
      ]}
    >
      <Pressable
        onPress={() => void onPress()}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        accessibilityRole="button"
        accessibilityLabel="화면 회전"
      >
        <Image
          source={{ uri: '/rotate-hint.png' }}
          style={[
            styles.icon,
            {
              transform: [{ rotate: `${iconDeg}deg` }],
              ...(Platform.OS === 'web'
                ? ({ transition: 'transform 180ms ease' } as object)
                : null),
            },
          ]}
          resizeMode="contain"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    zIndex: 10060,
    pointerEvents: 'box-none',
  },
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35))',
        } as object)
      : null),
  },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  icon: {
    width: 40,
    height: 40,
  },
});
