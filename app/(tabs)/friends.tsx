import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { PageContainer } from '@/src/components/layout/PageContainer';
import { FriendsSegmentTabs, type FriendsTab } from '@/src/components/friends/FriendsSegmentTabs';
import { FriendsListPanel } from '@/src/components/friends/FriendsListPanel';
import { FriendSchedulePanel } from '@/src/components/friends/FriendSchedulePanel';
import { FriendRequestsPanel } from '@/src/components/friends/FriendRequestsPanel';
import { FriendSearchPanel } from '@/src/components/friends/FriendSearchPanel';
import { PartnerSuggestPanel } from '@/src/components/friends/PartnerSuggestPanel';
import { ActivityNoticeBanner } from '@/src/components/guide/ActivityNoticeBanner';
import { ClubEventBanner } from '@/src/components/guide/ClubEventBanner';
import { SystemNoticeBanner } from '@/src/components/guide/SystemNoticeBanner';
import { useSearchStore } from '@/src/stores/searchStore';
import { useAuthStore } from '@/src/stores/authStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { useFriendsPresence } from '@/src/hooks/useFriendsPresence';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { isSupabaseEnabled } from '@/src/lib/supabase';
import { colors, spacing, typography } from '@/src/theme';

export default function FriendsScreen() {
  const { isDesktop } = useLayoutMode();
  const [tab, setTab] = useState<FriendsTab>('friends');
  const searchQuery = useSearchStore((s) => s.query);

  const {
    onlineFriends,
    offlineFriends,
    othersCheckedIn,
    allFriends,
    incomingRequests,
    outgoingRequests,
    activityStart,
    activityEnd,
  } = useFriendsPresence();

  useFocusEffect(
    useCallback(() => {
      if (!isSupabaseEnabled()) return;
      const userId = useAuthStore.getState().currentUser?.id;
      if (!userId) return;
      void import('@/src/services/supabase/social')
        .then(({ fetchFriendData }) => fetchFriendData(userId))
        .then(({ requests, friendships }) => {
          useFriendStore.getState().hydrate(friendships, requests);
        })
        .catch((err) => console.warn('[friend] focus refetch failed', err));
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <PageContainer>
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <Text style={[styles.title, isDesktop && styles.titleDesktop]}>친구</Text>
          <Text style={styles.subtitle}>오늘 {activityStart} – {activityEnd}</Text>
        </View>

        <ClubEventBanner />
        <SystemNoticeBanner />
        <ActivityNoticeBanner />

        <FriendsSegmentTabs active={tab} onChange={setTab} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <FriendSearchPanel />

          {tab === 'friends' && !searchQuery.trim() ? (
            <>
              <FriendRequestsPanel incoming={incomingRequests} outgoing={outgoingRequests} />
              <PartnerSuggestPanel />
              <FriendsListPanel
                onlineFriends={onlineFriends}
                offlineFriends={offlineFriends}
                othersCheckedIn={othersCheckedIn}
              />
            </>
          ) : tab === 'friends' ? null : (
            <FriendSchedulePanel
              friends={allFriends}
              activityStart={activityStart}
              activityEnd={activityEnd}
            />
          )}
        </ScrollView>
      </PageContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 4,
  },
  headerDesktop: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    fontSize: 28,
  },
  titleDesktop: {
    fontSize: 32,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  scroll: {
    flexGrow: 1,
  },
});
