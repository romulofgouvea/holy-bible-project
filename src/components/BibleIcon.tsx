import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { BibleTooltipButton } from "./BibleTooltipButton";

export type BibleIconProps = {
  name: keyof typeof Feather.glyphMap;
  size?: number;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  containerSize?: number;
  onPress?: () => void;
  style?: ViewStyle;
  activeOpacity?: number;
  testID?: string;
  accessibilityLabel?: string;
};

const ICON_LABELS: Partial<Record<keyof typeof Feather.glyphMap, string>> = {
  x: "Fechar",
  "chevron-left": "Anterior",
  "chevron-right": "Próximo",
  "chevron-up": "Expandir",
  "chevron-down": "Recolher",
  check: "Concluir",
  "arrow-left": "Voltar",
  menu: "Menu",
  search: "Pesquisar",
  "trash-2": "Excluir",
  plus: "Adicionar",
  "more-vertical": "Mais opções",
  type: "Aparência",
  clock: "Histórico",
  "arrow-up": "Voltar ao topo",
  "more-horizontal": "Mais opções",
  settings: "Configurações",
  filter: "Filtros",
  headphones: "Áudio",
  "share-2": "Compartilhar",
  copy: "Copiar",
  "corner-up-left": "Desfazer",
  "corner-up-right": "Refazer",
  "rotate-cw": "Refazer",
  "edit-2": "Editar",
  "edit-3": "Editar",
  "file-plus": "Novo",
  "pen-tool": "Desenhar",
  "play-circle": "Reproduzir",
  "arrow-right": "Avançar",
  "check-circle": "Concluir",
};

const MIN_TOUCH_SIZE = 48;

export function BibleIcon({
  name,
  size,
  color,
  backgroundColor,
  borderRadius = 6,
  containerSize = 32,
  onPress,
  style,
  activeOpacity = 0.7,
  testID,
  accessibilityLabel,
}: BibleIconProps) {
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: "center",
          justifyContent: "center",
        },
      }),
    [ms, colors, DESIGN],
  );

  const Container = onPress ? BibleTooltipButton : View;
  const label = accessibilityLabel ?? ICON_LABELS[name];

  const finalContainerSize = ms(containerSize);
  const finalIconSize = size || ms(containerSize * 0.5);
  const hitSlopSize = Math.max(0, (MIN_TOUCH_SIZE - finalContainerSize) / 2);

  return (
    <Container
      testID={testID}
      onPress={onPress}
      {...(onPress && {
        accessibilityRole: "button" as const,
        accessibilityLabel: label,
        tooltip: label,
        hitSlop: {
          top: hitSlopSize,
          bottom: hitSlopSize,
          left: hitSlopSize,
          right: hitSlopSize,
        },
      })}
      activeOpacity={activeOpacity}
      style={[
        styles.container,
        {
          width: finalContainerSize,
          height: finalContainerSize,
          borderRadius: ms(borderRadius),
          backgroundColor: backgroundColor || "transparent",
        },
        style,
      ]}
    >
      <Feather
        name={name}
        size={finalIconSize}
        color={color || colors.onSurface}
      />
    </Container>
  );
}
