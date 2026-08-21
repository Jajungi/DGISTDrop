import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getLockedUiOrientation,
  iconRotationForPose,
  lockInitialOrientation,
  lockUiOrientation,
  physicalPoseFromDevice,
  poseToUi,
  shouldUseManualRotateHint,
  type PhysicalPose,
  type UiOrientation,
} from '@/src/services/pwaOrientation';

/**
 * 안드로이드 내비 바 수동 회전 버튼을 흉내:
 * 기기를 돌리면 왼쪽 아래에 작게 뜨고, 아이콘이 회전 방향으로 기울어짐.
 * 탭하면 그 방향으로 화면 잠금.
 */
export function AndroidManualRotateHint() {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(false);
  const [locked, setLocked] = useState<UiOrientation>('portrait');
  const [pose, setPose] = useState<PhysicalPose | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!shouldUseManualRotateHint()) return;

    setActive(true);
    setLocked(getLockedUiOrientation());
    void lockInitialOrientation().then(() => setLocked(getLockedUiOrientation()));

    const orient = typeof screen !== 'undefined' ? screen.orientation : null;
    const onOrientChange = () => setLocked(getLockedUiOrientation());
    orient?.addEventListener?.('change', onOrientChange);

    const onDeviceOrient = (e: DeviceOrientationEvent) => {
      const next = physicalPoseFromDevice(e.beta, e.gamma);
      if (next) setPose(next);
    };
    window.addEventListener('deviceorientation', onDeviceOrient);

    return () => {
      orient?.removeEventListener?.('change', onOrientChange);
      window.removeEventListener('deviceorientation', onDeviceOrient);
    };
  }, []);

  const show = useMemo(() => {
    if (!active || pose == null) return false;
    return poseToUi(pose) !== locked;
  }, [active, pose, locked]);

  const iconDeg = pose ? iconRotationForPose(pose) : 0;

  const onPress = useCallback(async () => {
    if (!pose) return;
    const target = poseToUi(pose);
    const ok = await lockUiOrientation(target);
    if (ok) setLocked(getLockedUiOrientation());
  }, [pose]);

  if (!show) return null;

  return (
    <View
      pointerEvents="box-none"
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
  },
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
        } as object)
      : null),
  },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  icon: {
    width: 40,
    height: 40,
  },
});
