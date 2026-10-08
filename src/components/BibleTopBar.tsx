import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ROUTE_LABELS } from "../constants/routes";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { BibleHeader } from "./BibleHeader";
import { BibleIcon } from "./BibleIcon";
import { BibleActionsDrawer } from "./modals/BibleActionsDrawer";

export type BibleTopBarProps = {
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onOpenMenu: () => void;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  onOpenHistory: () => void;
  isSplitScreen?: boolean;
  onToggleCompare?: () => void;
};

export const BibleTopBar = React.memo((props: BibleTopBarProps) => {
  const {
    onPrevChapter,
    onNextChapter,
    onOpenMenu,
    onOpenSettings,
    onOpenSearch,
    onOpenHistory,
    isSplitScreen,
    onToggleCompare,
  } = props;
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();
  const { readerColors, readerTheme } = useReaderSettings();
  const [dotsMenuVisible, setDotsMenuVisible] = useState(false);

  const isSepia = readerTheme === "sepia";
  const headerBg = isSepia ? readerColors.primary : colors.primary;
  const headerContent = isSepia ? readerColors.onPrimary : colors.onPrimary;

  return (
    <>
      <BibleHeader
        title="Bíblia Online"
        backgroundColor={headerBg}
        contentColor={headerContent}
        menuBtnBackgroundColor="transparent"
        onMenuPress={onOpenMenu}
        rightContent={
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              style={[
                styles.menuButton,
                {
                  backgroundColor: "transparent",
                  width: ms(DESIGN.height.sm),
                  height: ms(DESIGN.height.sm),
                  borderRadius: ms(DESIGN.borderRadius.sm),
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
              onPress={onOpenSearch}
            >
              <BibleIcon
                name="search"
                size={ms(DESIGN.fontSize.xl)}
                color={headerContent}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.menuButton,
                {
                  backgroundColor: "transparent",
                  width: ms(DESIGN.height.sm),
                  height: ms(DESIGN.height.sm),
                  borderRadius: ms(DESIGN.borderRadius.sm),
                  marginLeft: ms(DESIGN.spacing.xs),
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
              onPress={onOpenSettings}
            >
              <BibleIcon
                name="type"
                size={ms(DESIGN.fontSize.xl)}
                color={headerContent}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.menuButton,
                {
                  backgroundColor: "transparent",
                  width: ms(DESIGN.height.sm),
                  height: ms(DESIGN.height.sm),
                  borderRadius: ms(DESIGN.borderRadius.sm),
                  marginLeft: ms(DESIGN.spacing.xs),
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
              onPress={() => setDotsMenuVisible(true)}
            >
              <BibleIcon
                name="more-vertical"
                size={ms(DESIGN.fontSize.xl)}
                color={headerContent}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <BibleActionsDrawer
        visible={dotsMenuVisible}
        onClose={() => setDotsMenuVisible(false)}
        title="Ações"
        items={[
          {
            icon: "clock",
            label: ROUTE_LABELS.HISTORY,
            onPress: onOpenHistory,
          },
          {
            icon: isSplitScreen ? "x-circle" : "columns",
            label: isSplitScreen ? "Fechar Comparação" : "Comparar Versão",
            onPress: () => onToggleCompare?.(),
          },
        ]}
      />
    </>
  );
});

const styles = StyleSheet.create({
  menuButton: {
    alignItems: "center",
    justifyContent: "center",
  },
});
