import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import type { GuideSection } from '@/src/constants/guideContent';
import { InteractiveRulesCourt } from './InteractiveRulesCourt';
import { GuidePointsTable } from './GuidePointsTable';
import { TierDistribution } from './TierDistribution';
import { colors, borderRadius, spacing, typography } from '@/src/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface GuideAccordionProps {
  sections: GuideSection[];
}

export function GuideAccordion({ sections }: GuideAccordionProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(expanded === id ? null : id);
  };

  return (
    <View style={styles.container}>
      {sections.map((section) => {
        const isOpen = expanded === section.id;
        return (
          <View key={section.id} style={styles.section}>
            <Pressable
              onPress={() => toggle(section.id)}
              style={styles.header}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
            >
              <Text style={styles.icon}>{section.icon}</Text>
              <Text style={styles.title}>{section.title}</Text>
              <Text style={styles.chevron}>{isOpen ? '−' : '+'}</Text>
            </Pressable>
            {isOpen && (
              <View style={styles.content}>
                {section.intro ? (
                  <Text style={styles.intro}>{section.intro}</Text>
                ) : null}

                {section.courtInteractive && <InteractiveRulesCourt />}

                {section.items.map((item, idx) => {
                  const prevCategory = idx > 0 ? section.items[idx - 1]?.category : undefined;
                  const showCategory = item.category && item.category !== prevCategory;
                  return (
                    <React.Fragment key={idx}>
                      {showCategory ? (
                        <Text style={[styles.category, idx > 0 && styles.categorySpaced]}>
                          {item.category}
                        </Text>
                      ) : null}
                      <View style={[styles.item, idx > 0 && !showCategory && styles.itemBorder]}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemContent}>{item.content}</Text>
                      </View>
                    </React.Fragment>
                  );
                })}

                {section.pointsTable && <GuidePointsTable />}

                {section.tierDistribution && <TierDistribution />}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  icon: { fontSize: 20 },
  title: { ...typography.bodyBold, color: colors.text, flex: 1, fontSize: 15 },
  chevron: { ...typography.h3, color: colors.textMuted, width: 20, textAlign: 'center' },
  content: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  intro: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 21,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  item: { paddingTop: spacing.md },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.divider, marginTop: spacing.md },
  category: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
  },
  categorySpaced: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  itemTitle: { ...typography.bodyBold, color: colors.text, marginBottom: 6, fontSize: 14 },
  itemContent: { ...typography.caption, color: colors.textSecondary, lineHeight: 21 },
});
