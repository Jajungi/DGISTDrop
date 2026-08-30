import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, typography } from '@/src/theme';

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  showOnline?: boolean;
  imageUri?: string;
}

export function Avatar({ name, color, size = 36, showOnline, imageUri }: AvatarProps) {
  const initial = name.charAt(0);

  return (
    <View style={{ position: 'relative' }}>
      {imageUri ? (
        <Image
          key={imageUri}
          source={{ uri: imageUri }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.avatar,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          ]}
        >
          <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
        </View>
      )}
      {showOnline && <View style={styles.onlineDot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: colors.surfaceAlt,
  },
  initial: {
    color: colors.textLight,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
