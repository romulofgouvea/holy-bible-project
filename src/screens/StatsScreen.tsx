import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { BibleDrawerMenu } from "../components/BibleDrawerMenu";
import { BibleHeader } from "../components/BibleHeader";
import { BibleIcon } from "../components/BibleIcon";
import { BibleText } from "../components/BibleText";
import { DonateModal } from "../components/modals/DonateModal";
import { ROUTES, ROUTE_LABELS } from "../constants/routes";
import { Feather } from "@expo/vector-icons";
import { getBibleData } from "../data/bible-version";
import { BIBLE_PLAN_TEMPLATES } from "../data/bible-plan/biblePlanRegistry";
import { useBible } from "../hooks/useBible";
import { useBiblePlan } from "../hooks/useBiblePlan";
import { useCollections } from "../hooks/useCollections";
import { useNotes } from "../hooks/useNotes";
import { useResponsive } from "../hooks/useResponsive";
import { useStudies } from "../hooks/useStudies";
import { useTheme } from "../hooks/useTheme";
import { getReadingStreak } from "../utils/planReading";
import {
  getLongestStreak,
  getReadChapterKeys,
  getReadingDays,
} from "../utils/readingStats";

type Tile = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: number;
};

export default function StatsScreen() {
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();
  const { version, highlights } = useBible();
  const { activePlans } = useBiblePlan();
  const { notes } = useNotes();
  const { studies } = useStudies();
  const { collections } = useCollections();
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isDonateVisible, setIsDonateVisible] = useState(false);

  const stats = useMemo(() => {
    const totalChapters = getBibleData(version).reduce(
      (sum, b) => sum + b.chapters.length,
      0,
    );
    const readChapters = getReadChapterKeys(
      activePlans,
      BIBLE_PLAN_TEMPLATES,
    ).size;
    const days = getReadingDays(activePlans);
    return {
      totalChapters,
      readChapters,
      percent: totalChapters
        ? Math.round((readChapters / totalChapters) * 100)
        : 0,
      streak: getReadingStreak(days),
      longest: getLongestStreak(days),
      readingDays: days.length,
    };
  }, [version, activePlans]);

  const readingTiles: Tile[] = [
    { icon: "zap", label: "Sequência atual", value: stats.streak },
    { icon: "award", label: "Melhor sequência", value: stats.longest },
    { icon: "calendar", label: "Dias de leitura", value: stats.readingDays },
    { icon: "layers", label: "Planos ativos", value: activePlans.length },
  ];

  const studyTiles: Tile[] = [
    {
      icon: "droplet",
      label: "Versículos marcados",
      value: Object.keys(highlights).length,
    },
    { icon: "message-square", label: "Anotações", value: notes.length },
    { icon: "feather", label: "Estudos", value: studies.length },
    { icon: "bookmark", label: "Coleções", value: collections.length },
  ];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        content: {
          padding: ms(DESIGN.spacing.lg),
          paddingBottom: ms(DESIGN.layout.listPaddingBottom),
          gap: ms(DESIGN.spacing.lg),
        },
        card: {
          padding: ms(DESIGN.spacing.lg),
          borderRadius: ms(DESIGN.borderRadius.lg),
          borderWidth: 1,
          gap: ms(DESIGN.spacing.sm),
        },
        heroRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: ms(DESIGN.spacing.md),
        },
        track: {
          height: ms(DESIGN.spacing.md),
          borderRadius: ms(DESIGN.borderRadius.md),
          overflow: "hidden",
        },
        grid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: ms(DESIGN.spacing.md),
        },
        tile: {
          flexGrow: 1,
          flexBasis: "45%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: ms(DESIGN.spacing.md),
          borderRadius: ms(DESIGN.borderRadius.lg),
          borderWidth: 1,
          gap: ms(DESIGN.spacing.xs),
        },
        tileText: { flexShrink: 1 },
        sectionTitle: {
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 1,
          opacity: 0.6,
        },
      }),
    [ms, DESIGN],
  );

  const renderTiles = (title: string, tiles: Tile[]) => (
    <View style={{ gap: ms(DESIGN.spacing.md) }}>
      <BibleText
        style={[
          styles.sectionTitle,
          { color: colors.textMuted, fontSize: ms(DESIGN.fontSize.xs) },
        ]}
      >
        {title}
      </BibleText>
      <View style={styles.grid}>
        {tiles.map((t) => (
          <View
            key={t.label}
            style={[
              styles.tile,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.tileText}>
              <BibleText
                style={{
                  color: colors.onSurface,
                  fontWeight: "800",
                  fontSize: ms(DESIGN.fontSize.display),
                }}
              >
                {t.value}
              </BibleText>
              <BibleText
                style={{
                  color: colors.textMuted,
                  fontSize: ms(DESIGN.fontSize.md),
                }}
              >
                {t.label}
              </BibleText>
            </View>
            <BibleIcon
              name={t.icon}
              color={colors.primary}
              backgroundColor={colors.surfaceHighlight}
              containerSize={DESIGN.icon.xl}
              borderRadius={DESIGN.borderRadius.md}
            />
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BibleHeader
        title={ROUTE_LABELS[ROUTES.STATS]}
        onMenuPress={() => setIsDrawerVisible(true)}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.heroRow}>
            <View>
              <BibleText
                style={{
                  color: colors.primary,
                  fontWeight: "800",
                  fontSize: ms(DESIGN.fontSize.display),
                }}
              >
                {`${stats.percent}%`}
              </BibleText>
              <BibleText
                style={{
                  color: colors.onSurface,
                  fontWeight: "700",
                  fontSize: ms(DESIGN.fontSize.md),
                }}
              >
                da Bíblia lida
              </BibleText>
            </View>
            <BibleIcon
              name="book-open"
              color={colors.primary}
              backgroundColor={colors.surfaceHighlight}
              containerSize={DESIGN.icon.xl}
              borderRadius={DESIGN.borderRadius.md}
            />
          </View>
          <View
            style={[styles.track, { backgroundColor: colors.surfaceHighlight }]}
          >
            <View
              style={{
                width: `${stats.percent}%`,
                height: "100%",
                borderRadius: ms(DESIGN.borderRadius.md),
                backgroundColor: colors.primary,
              }}
            />
          </View>
          <BibleText
            style={{
              color: colors.textMuted,
              fontSize: ms(DESIGN.fontSize.md),
            }}
          >
            {`${stats.readChapters} de ${stats.totalChapters} capítulos concluídos nos seus planos de leitura`}
          </BibleText>
        </View>

        {renderTiles("Leitura", readingTiles)}
        {renderTiles("Seu estudo", studyTiles)}
      </ScrollView>

      <BibleDrawerMenu
        visible={isDrawerVisible}
        activeItem="stats"
        onClose={() => setIsDrawerVisible(false)}
        onSelectItem={() => {}}
        onOpenDonate={() => {
          setIsDrawerVisible(false);
          setTimeout(() => setIsDonateVisible(true), 250);
        }}
      />
      <DonateModal
        visible={isDonateVisible}
        onClose={() => setIsDonateVisible(false)}
      />
    </View>
  );
}
