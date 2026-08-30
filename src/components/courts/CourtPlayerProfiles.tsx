import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { CourtPlayer } from '@/src/types';
import { getPlayerSlotPosition } from '@/src/constants/court';
import { UserAvatar } from '@/src/components/ui/UserAvatar';
import { typography } from '@/src/theme';

const SIDE_LABEL = ['상', '하', '상', '하'] as const;

interface CourtPlayerProfilesProps {
  players: CourtPlayer[];
  avatarSize: number;
  courtWidth: number;
  courtHeight: number;
  compact?: boolean;
}

export function CourtPlayerProfiles({
  players,
  avatarSize,
  courtWidth,
  courtHeight,
  compact = false,
}: CourtPlayerProfilesProps) {
  if (players.length === 0) return null;

  const labelW = compact ? avatarSize + 2 : Math.max(32, avatarSize + 4);
  const showName = !compact || courtWidth >= 110;

  return (
    <>
      {players.map((player, i) => {
        const pos = getPlayerSlotPosition(i, courtWidth, courtHeight);
        if (!pos) return null;
        return (
          <View
            key={player.userId}
            style={[
              styles.slot,
              {
                left: pos.x,
                top: pos.y,
                width: labelW,
                marginLeft: -labelW / 2,
                marginTop: -(avatarSize / 2 + 2),
              },
            ]}
          >
            <View
              style={[
                styles.avatarRing,
                {
                  width: avatarSize + 3,
                  height: avatarSize + 3,
                  borderRadius: (avatarSize + 3) / 2,
                },
              ]}
            >
              <UserAvatar
                userId={player.userId}
                name={player.name}
                color={player.avatarColor}
                size={avatarSize}
              />
            </View>
            {showName && (
              <Text style={[styles.nickname, { maxWidth: labelW, fontSize: compact ? 6 : 7 }]} numberOfLines={1}>
                {player.name}
              </Text>
            )}
            {compact && courtWidth >= 72 && (
              <View style={styles.sideTag}>
                <Text style={styles.sideTagText}>{SIDE_LABEL[i] ?? '·'}</Text>
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    alignItems: 'center',
  },
  avatarRing: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
    ...Platform.select({
      web: { boxShadow: '0 1px 2px rgba(0,0,0,0.18)' } as object,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1,
      },
      android: { elevation: 2 },
    }),
  },
  nickname: {
    ...typography.small,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 7,
    fontWeight: '600',
    marginTop: 1,
    textAlign: 'center',
  },
  sideTag: {
    marginTop: 1,
    paddingHorizontal: 3,
    paddingVertical: 0,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sideTagText: {
    fontSize: 5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
});
