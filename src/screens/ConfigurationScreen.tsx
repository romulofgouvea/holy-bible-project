import { BibleDivider } from "@/components/BibleDivider";
import { BibleIcon } from "@/components/BibleIcon";
import { BibleConfirmModal } from "@/components/modals/BibleConfirmModal";
import { COLOR_THEMES, ColorThemeKey } from "@/constants/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BibleDrawerMenu } from "../components/BibleDrawerMenu";
import { BibleHeader } from "../components/BibleHeader";
import { BibleSwitch } from "../components/BibleSwitch";
import { BibleText } from "../components/BibleText";
import { BibleChangelogModal } from "../components/modals/BibleChangelogModal";
import { BiblePageModal } from "../components/modals/BiblePageModal";
import { DonateModal } from "../components/modals/DonateModal";
import { SettingsItem } from "../components/SettingsItem";
import { ROUTES, ROUTE_LABELS } from "../constants/routes";
import { STORAGE_KEYS } from "../constants/storage";
import { useBiblePlan } from "../hooks/useBiblePlan";
import { useHistory } from "../hooks/useHistory";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useReadingPlanNotifications } from "../hooks/useReadingPlanNotifications";
import { useResponsive } from "../hooks/useResponsive";
import { useStudies } from "../hooks/useStudies";
import { useTheme } from "../hooks/useTheme";
import {
  buildAppBackupJson,
  clearAllAppStorage,
  countRestoredStudies,
  parseBackupRaw,
  restoreAppStorage,
  writeAutoBackupFile,
} from "../utils/backup";
import { impactLight, selectionHaptic } from "../utils/haptics";

const COLOR_THEME_OPTIONS = Object.entries(COLOR_THEMES).map(
  ([key, value]) => ({
    key,
    ...value,
  }),
);

function parseTimeToDate(time: string): Date {
  const [hh, mm] = time.split(":").map((v) => parseInt(v, 10));
  const date = new Date();
  date.setHours(
    Number.isFinite(hh) ? hh : 8,
    Number.isFinite(mm) ? mm : 0,
    0,
    0,
  );
  return date;
}

export default function ConfigurationScreen() {
  const { ms, DESIGN } = useResponsive();
  const {
    isDarkMode,
    toggleDarkMode,
    colors,
    colorTheme,
    setColorTheme,
    hapticsEnabled,
    toggleHaptics,
  } = useTheme();
  const {
    enabled: isReadingPlanNotificationsEnabled,
    time: readingPlanNotificationTime,
    setEnabled: setReadingPlanNotificationsEnabled,
    setTime: setReadingPlanNotificationTime,
  } = useReadingPlanNotifications();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        content: {
          padding: ms(DESIGN.spacing.lg),
          paddingBottom: ms(DESIGN.spacing.xxl),
        },
        card: {
          borderRadius: ms(DESIGN.borderRadius.lg),
          borderWidth: 1,
          overflow: "hidden",
          elevation: 1,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        },
        cardHeader: {
          flexDirection: "row",
          alignItems: "center",
          padding: ms(DESIGN.spacing.lg),
          gap: ms(DESIGN.spacing.lg),
        },
        cardTextContainer: {
          flex: 1,
          gap: ms(DESIGN.spacing.xs),
        },
        cardTitle: {
          fontWeight: "700",
        },
        cardDesc: {
          lineHeight: ms(DESIGN.fontSize.xl),
        },
        swatchGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          rowGap: ms(DESIGN.fontSize.xs),
          width: "100%",
        },
        swatchItem: {
          alignItems: "center",
          justifyContent: "center",
          gap: ms(DESIGN.spacing.xs),
          paddingVertical: ms(DESIGN.spacing.sm),
          borderRadius: ms(DESIGN.borderRadius.md),
          borderWidth: 1.5,
          width: "31.5%",
          minHeight: ms(DESIGN.layout.emptyPaddingTop),
        },
        swatchDot: {
          width: ms(DESIGN.icon.sm),
          height: ms(DESIGN.icon.sm),
          borderRadius: ms(DESIGN.borderRadius.sm),
          alignItems: "center",
          justifyContent: "center",
        },
        swatchLabel: {
          fontWeight: "600",
          textAlign: "center",
        },
        modalHeader: { flexDirection: "row", alignItems: "center" },
        modalTitle: { fontWeight: "800" },
        subItem: {
          flexDirection: "row",
          alignItems: "center",
          gap: ms(DESIGN.spacing.sm),
          marginHorizontal: ms(DESIGN.spacing.lg),
          marginBottom: ms(DESIGN.spacing.md),
          marginTop: -ms(DESIGN.spacing.xs),
          paddingVertical: ms(DESIGN.spacing.sm),
          paddingHorizontal: ms(DESIGN.spacing.md),
          borderRadius: ms(DESIGN.borderRadius.md),
        },
        subItemTimeButton: {
          borderWidth: 1,
          borderRadius: ms(DESIGN.borderRadius.sm),
          paddingHorizontal: ms(DESIGN.spacing.md),
          paddingVertical: ms(DESIGN.spacing.xs),
        },
      }),
    [ms, colors, DESIGN],
  );

  const { setReaderTheme } = useReaderSettings();
  const { clearHistory } = useHistory();
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const { importBulk, reloadFromStorage } = useStudies();
  const { clearAllBiblePlans } = useBiblePlan();
  const router = useRouter();
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState(false);
  const [isDonateVisible, setIsDonateVisible] = useState(false);
  const [isChangelogVisible, setIsChangelogVisible] = useState(false);
  const versionTapCountRef = useRef(0);
  const lastVersionTapTimeRef = useRef(0);
  const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{
    title: string;
    message: string;
    isDanger?: boolean;
  } | null>(null);
  const [isClearCacheConfirmVisible, setIsClearCacheConfirmVisible] =
    useState(false);
  const [isClearAllConfirmVisible, setIsClearAllConfirmVisible] =
    useState(false);
  const [isClearPlanConfirmVisible, setIsClearPlanConfirmVisible] =
    useState(false);
  const [isReminderTimePickerVisible, setIsReminderTimePickerVisible] =
    useState(false);

  const handleToggleReadingPlanNotifications = (value: boolean) => {
    if (value && Platform.OS !== "web") {
      setIsReminderTimePickerVisible(true);
    } else {
      setReadingPlanNotificationsEnabled(value);
    }
  };

  const handleReminderTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setIsReminderTimePickerVisible(false);
    if (event.type !== "set" || !selectedDate) return;
    const hh = String(selectedDate.getHours()).padStart(2, "0");
    const mm = String(selectedDate.getMinutes()).padStart(2, "0");
    setReadingPlanNotificationTime(`${hh}:${mm}`);
    setReadingPlanNotificationsEnabled(true);
  };

  const handleClearCache = async () => {
    try {
      await clearHistory();
      setIsClearCacheConfirmVisible(false);
    } catch (e) {
      setAlertInfo({
        title: "Erro",
        message: "Não foi possível limpar o histórico.",
        isDanger: true,
      });
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllAppStorage();
      setIsClearAllConfirmVisible(false);
      setIsAutoBackupEnabled(false);
      await reloadFromStorage();
      setAlertInfo({
        title: "Dados apagados",
        message:
          "Todos os dados do aplicativo foram removidos. O app foi restaurado ao estado inicial.",
      });
    } catch (e) {
      setAlertInfo({
        title: "Erro",
        message: "Não foi possível limpar os dados do aplicativo.",
        isDanger: true,
      });
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.AUTO_BACKUP).then((val) => {
      setIsAutoBackupEnabled(val === "true");
    });
  }, []);

  const handleToggleAutoBackup = async (val: boolean) => {
    if (!val) {
      setIsAutoBackupEnabled(false);
      await AsyncStorage.setItem(STORAGE_KEYS.AUTO_BACKUP, "false");
      return;
    }

    if (Platform.OS === "android") {
      try {
        const permissions = await (
          FileSystem as any
        ).StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const fileName = `backup_estudos_automatico`;
          const fileUri = await (
            FileSystem as any
          ).StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            fileName,
            "application/json",
          );

          await AsyncStorage.setItem(
            STORAGE_KEYS.AUTO_BACKUP_FILE_URI,
            fileUri,
          );
          await AsyncStorage.setItem(STORAGE_KEYS.AUTO_BACKUP, "true");
          setIsAutoBackupEnabled(true);

          try {
            await writeAutoBackupFile();
          } catch (e) {}
          setAlertInfo({
            title: "Sucesso",
            message: "Backup automático configurado para a pasta escolhida!",
          });
        } else {
          setIsAutoBackupEnabled(false);
          await AsyncStorage.setItem(STORAGE_KEYS.AUTO_BACKUP, "false");
        }
      } catch (e) {
        setIsAutoBackupEnabled(false);
        await AsyncStorage.setItem(STORAGE_KEYS.AUTO_BACKUP, "false");
        setAlertInfo({
          title: "Erro",
          message: "Não foi possível configurar a pasta de backup.",
          isDanger: true,
        });
      }
    } else {
      setIsAutoBackupEnabled(true);
      await AsyncStorage.setItem(STORAGE_KEYS.AUTO_BACKUP, "true");
      if (Platform.OS !== "web") {
        try {
          await writeAutoBackupFile();
        } catch (e) {}
      }
    }
  };

  const handleManualBackup = async () => {
    try {
      const json = await buildAppBackupJson(true);
      const fileBaseName = `backup_biblia_${new Date().getTime()}`;
      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileBaseName}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setAlertInfo({
          title: "Sucesso",
          message: "Backup completo do aplicativo exportado com sucesso!",
        });
      } else if (Platform.OS === "android") {
        const permissions = await (
          FileSystem as any
        ).StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const fileUri = await (
            FileSystem as any
          ).StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            fileBaseName,
            "application/json",
          );
          await (FileSystem as any).writeAsStringAsync(fileUri, json);
          setAlertInfo({
            title: "Sucesso",
            message: "Backup completo exportado e salvo na pasta escolhida!",
          });
        }
      } else {
        const path = `${(FileSystem as any).documentDirectory}${fileBaseName}.json`;
        await (FileSystem as any).writeAsStringAsync(path, json);
        await Sharing.shareAsync(path, { mimeType: "application/json" });
        setAlertInfo({
          title: "Sucesso",
          message: "Backup completo do aplicativo exportado com sucesso!",
        });
      }
    } catch (err) {
      setAlertInfo({
        title: "Erro",
        message: "Não foi possível criar o arquivo de backup.",
        isDanger: true,
      });
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
      });
      if (result.canceled) return;

      let raw = "";
      if (Platform.OS === "web" && (result.assets[0] as any).file) {
        raw = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText((result.assets[0] as any).file);
        });
      } else if (Platform.OS === "web") {
        raw = await fetch(result.assets[0].uri).then((r) => r.text());
      } else {
        raw = await (FileSystem as any).readAsStringAsync(result.assets[0].uri);
      }

      const parsed = parseBackupRaw(raw);

      if ("legacyStudies" in parsed) {
        const legacy = parsed.legacyStudies;
        if (!Array.isArray(legacy)) {
          setAlertInfo({
            title: "Erro",
            message: "Formato de arquivo inválido.",
            isDanger: true,
          });
          return;
        }
        const importedCount = importBulk(legacy);
        setAlertInfo({
          title: "Restauração Concluída",
          message: `${importedCount} estudo(s) restaurado(s).\n\n(${legacy.length - importedCount} ignorados pois já existem no app.)`,
        });
        return;
      }

      const restoredKeys = await restoreAppStorage(parsed.storage);
      await reloadFromStorage();
      const studyCount = countRestoredStudies(parsed.storage);
      setAlertInfo({
        title: "Restauração Concluída",
        message: `Backup completo restaurado com sucesso.\n\n${restoredKeys} chave(s) do aplicativo.\n${studyCount} estudo(s) no arquivo.`,
      });
    } catch (err) {
      setAlertInfo({
        title: "Erro",
        message: "Não foi possível tratar o arquivo de restauração.",
        isDanger: true,
      });
    }
  };

  const handleToggle = () => {
    impactLight();
    const nextDark = !isDarkMode;
    toggleDarkMode(nextDark);
    setReaderTheme(nextDark ? "dark" : "light");
  };

  const handleVersionTap = () => {
    const now = Date.now();
    if (now - lastVersionTapTimeRef.current < 1500) {
      versionTapCountRef.current += 1;
    } else {
      versionTapCountRef.current = 1;
    }
    lastVersionTapTimeRef.current = now;

    if (versionTapCountRef.current >= 5) {
      versionTapCountRef.current = 0;
      setIsChangelogVisible(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BibleHeader
        title={ROUTE_LABELS[ROUTES.CONFIGURATION]}
        onMenuPress={() => setIsDrawerVisible(true)}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BibleText
          style={{
            marginLeft: ms(DESIGN.spacing.sm),
            marginBottom: ms(DESIGN.spacing.sm),
            fontSize: ms(DESIGN.fontSize.md),
            fontWeight: "700",
            color: colors.textMuted,
          }}
        >
          APARÊNCIA
        </BibleText>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <SettingsItem
            label="Modo Escuro"
            description="Ative o tema noturno no app"
            icon={isDarkMode ? "moon" : "sun"}
            onPress={handleToggle}
            rightElement={
              <BibleSwitch value={isDarkMode} onValueChange={handleToggle} />
            }
          />
          <BibleDivider
            style={{ marginLeft: ms(DESIGN.layout.settingsIconOffset) }}
          />
          <SettingsItem
            label="Cor do Aplicativo"
            description="Escolha a paleta de cores do app"
            icon="layers"
            onPress={() => setIsThemeModalVisible(true)}
            rightElement={
              <View
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: ms(DESIGN.spacing.lg),
                  paddingVertical: ms(DESIGN.spacing.sm),
                  borderRadius: ms(DESIGN.borderRadius.xl),
                  elevation: 2,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: ms(DESIGN.spacing.tiny) },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                }}
              >
                <BibleText
                  style={{
                    fontSize: ms(DESIGN.fontSize.md),
                    color: colors.onPrimary,
                    fontWeight: "800",
                    textTransform: "uppercase",
                  }}
                >
                  Escolher
                </BibleText>
              </View>
            }
          />
        </View>

        <BibleText
          style={{
            marginTop: ms(DESIGN.spacing.xl),
            marginLeft: ms(DESIGN.spacing.sm),
            marginBottom: ms(DESIGN.spacing.sm),
            fontSize: ms(DESIGN.fontSize.md),
            fontWeight: "700",
            color: colors.textMuted,
          }}
        >
          CONFIGURAÇÕES GERAIS
        </BibleText>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <SettingsItem
            label="Vibração"
            description="Feedback tátil ao tocar nos itens"
            icon="target"
            onPress={() => toggleHaptics()}
            rightElement={
              <BibleSwitch
                value={hapticsEnabled}
                onValueChange={toggleHaptics}
              />
            }
          />
          <BibleDivider
            style={{ marginLeft: ms(DESIGN.layout.settingsIconOffset) }}
          />
          <SettingsItem
            label="Lembrete de leitura"
            description="Receba uma notificação para não perder o dia"
            icon="bell"
            onPress={() =>
              handleToggleReadingPlanNotifications(
                !isReadingPlanNotificationsEnabled,
              )
            }
            rightElement={
              <BibleSwitch
                value={isReadingPlanNotificationsEnabled}
                onValueChange={handleToggleReadingPlanNotifications}
              />
            }
          />
          {isReadingPlanNotificationsEnabled && (
            <View
              style={[
                styles.subItem,
                {
                  backgroundColor: colors.primary + "12",
                  borderLeftWidth: ms(3),
                  borderLeftColor: colors.primary,
                },
              ]}
            >
              <BibleIcon
                name="corner-down-right"
                color={colors.primary}
                size={ms(DESIGN.icon.xs)}
              />
              <BibleText
                style={{
                  flex: 1,
                  fontSize: ms(DESIGN.fontSize.md),
                  color: colors.textMuted,
                  fontWeight: "600",
                }}
              >
                Horário do lembrete
              </BibleText>
              {Platform.OS === "web" ? (
                <TimeInputField
                  value={readingPlanNotificationTime}
                  onChangeText={setReadingPlanNotificationTime}
                  colors={colors}
                  ms={ms}
                  DESIGN={DESIGN}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => setIsReminderTimePickerVisible(true)}
                  style={[
                    styles.subItemTimeButton,
                    { borderColor: colors.border },
                  ]}
                >
                  <BibleText
                    style={{
                      fontSize: ms(DESIGN.fontSize.md),
                      color: colors.primary,
                      fontWeight: "700",
                    }}
                  >
                    {readingPlanNotificationTime}
                  </BibleText>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <BibleText
          style={{
            marginTop: ms(DESIGN.spacing.xl),
            marginLeft: ms(DESIGN.spacing.sm),
            marginBottom: ms(DESIGN.spacing.sm),
            fontSize: ms(DESIGN.fontSize.md),
            fontWeight: "700",
            color: colors.textMuted,
          }}
        >
          CONFIGURAÇÕES DA BÍBLIA
        </BibleText>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <SettingsItem
            label="Downloads de Áudio"
            description="Baixe capítulos para ouvir offline"
            icon="download"
            onPress={() => router.push(ROUTES.DOWNLOADS as any)}
          />
          <BibleDivider
            style={{ marginLeft: ms(DESIGN.layout.settingsIconOffset) }}
          />
          <SettingsItem
            label="Gerenciar estudos excluídos"
            description="Gerencie estudos excluídos ou restaure-os"
            icon="trash-2"
            onPress={() => router.push(ROUTES.TRASH as any)}
          />
        </View>

        <BibleText
          style={{
            marginTop: ms(DESIGN.spacing.xl),
            marginLeft: ms(DESIGN.spacing.sm),
            marginBottom: ms(DESIGN.spacing.sm),
            fontSize: ms(DESIGN.fontSize.md),
            fontWeight: "700",
            color: colors.textMuted,
          }}
        >
          BACKUP E RESTAURAÇÃO
        </BibleText>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <SettingsItem
            label="Backup Automático"
            description="Salvar backup completo do app na pasta escolhida"
            icon="refresh-cw"
            onPress={() => handleToggleAutoBackup(!isAutoBackupEnabled)}
            rightElement={
              <BibleSwitch
                value={isAutoBackupEnabled}
                onValueChange={handleToggleAutoBackup}
              />
            }
          />
          <BibleDivider
            style={{ marginLeft: ms(DESIGN.layout.settingsIconOffset) }}
          />
          <SettingsItem
            label="Exportar Backup"
            description="Salvar backup completo do app (estudos, histórico, configurações)"
            icon="download"
            onPress={handleManualBackup}
          />
          <BibleDivider
            style={{ marginLeft: ms(DESIGN.layout.settingsIconOffset) }}
          />
          <SettingsItem
            label="Restaurar do Backup"
            description="Restaurar backup completo ou arquivo antigo só de estudos"
            icon="upload"
            onPress={handleImport}
          />
        </View>

        <BibleText
          style={{
            marginTop: ms(DESIGN.spacing.xl),
            marginLeft: ms(DESIGN.spacing.sm),
            marginBottom: ms(DESIGN.spacing.sm),
            fontSize: ms(DESIGN.fontSize.md),
            fontWeight: "700",
            color: colors.error,
          }}
        >
          ZONA DE PERIGO
        </BibleText>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.error + "60",
              shadowColor: colors.shadow,
            },
          ]}
        >
          <SettingsItem
            label="Limpar Histórico"
            description="Remove todo o historico de pesquisa de versiculos"
            icon="clock"
            isDanger
            onPress={() => setIsClearCacheConfirmVisible(true)}
          />
          <BibleDivider
            style={{ marginLeft: ms(DESIGN.layout.settingsIconOffset) }}
          />
          <SettingsItem
            label="Limpar Plano de Leitura"
            description="Remove todos os planos de leitura"
            icon="calendar"
            isDanger
            onPress={() => setIsClearPlanConfirmVisible(true)}
          />
          <BibleDivider
            style={{ marginLeft: ms(DESIGN.layout.settingsIconOffset) }}
          />
          <SettingsItem
            label="Limpar Tudo"
            description="Limpar todos os dados do aplicativo"
            icon="trash"
            isDanger
            onPress={() => setIsClearAllConfirmVisible(true)}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleVersionTap}
          style={{
            alignItems: "center",
            marginTop: ms(DESIGN.spacing.xl),
            paddingVertical: ms(DESIGN.spacing.md),
          }}
        >
          <BibleText
            style={{
              fontSize: ms(DESIGN.fontSize.sm),
              color: colors.textMuted,
              fontWeight: "600",
            }}
          >
            Bíblia Sagrada v{require("../../app.json").expo.version}
          </BibleText>
        </TouchableOpacity>
      </ScrollView>

      <BibleDrawerMenu
        visible={isDrawerVisible}
        activeItem="configuration"
        onClose={() => setIsDrawerVisible(false)}
        onSelectItem={() => {}}
        onOpenDonate={() => {
          setIsDrawerVisible(false);
          setTimeout(() => setIsDonateVisible(true), 250);
        }}
      />

      <BibleConfirmModal
        visible={isClearCacheConfirmVisible}
        title="Limpar Histórico"
        message="Tem certeza? Isso removerá sua posição de leitura salva."
        confirmText="Limpar"
        isDanger
        onConfirm={handleClearCache}
        onCancel={() => setIsClearCacheConfirmVisible(false)}
      />

      <BibleConfirmModal
        visible={isClearAllConfirmVisible}
        title="Limpar Tudo"
        message="Tem certeza que deseja limpar todos os dados do aplicativo? Isso removerá estudos, destaques, histórico, configurações e posição de leitura. Esta ação não pode ser desfeita."
        confirmText="Limpar Tudo"
        isDanger
        onConfirm={handleClearAll}
        onCancel={() => setIsClearAllConfirmVisible(false)}
      />

      <BibleConfirmModal
        visible={isClearPlanConfirmVisible}
        title="Resetar Plano de Leitura"
        message="Tem certeza? O progresso atual será perdido. Você poderá escolher um novo plano."
        confirmText="Resetar"
        isDanger
        onConfirm={() => {
          clearAllBiblePlans();
          setIsClearPlanConfirmVisible(false);
        }}
        onCancel={() => setIsClearPlanConfirmVisible(false)}
      />

      <BibleConfirmModal
        visible={!!alertInfo}
        title={alertInfo?.title || ""}
        message={alertInfo?.message || ""}
        confirmText="OK"
        isDanger={alertInfo?.isDanger}
        onConfirm={() => setAlertInfo(null)}
      />

      <DonateModal
        visible={isDonateVisible}
        onClose={() => setIsDonateVisible(false)}
      />

      <BiblePageModal
        visible={isThemeModalVisible}
        onClose={() => setIsThemeModalVisible(false)}
        header={
          <View style={styles.modalHeader}>
            <BibleIcon
              name="layers"
              color={colors.primary}
              backgroundColor={colors.primary + "20"}
              style={{ marginRight: ms(DESIGN.spacing.sm) }}
            />
            <BibleText
              style={[
                styles.modalTitle,
                {
                  fontSize: ms(DESIGN.fontSize.lg),
                  color: colors.onSurface,
                  fontWeight: "700",
                },
              ]}
            >
              Cor do Aplicativo
            </BibleText>
            <BibleIcon
              name="x"
              color={colors.error}
              backgroundColor={colors.error + "20"}
              onPress={() => setIsThemeModalVisible(false)}
              style={{ marginLeft: "auto" }}
            />
          </View>
        }
      >
        <View style={[styles.swatchGrid, { padding: ms(DESIGN.spacing.md) }]}>
          {COLOR_THEME_OPTIONS.map((theme) => {
            const isActive = colorTheme === theme.key;
            const swatchColor = theme.swatch;
            return (
              <TouchableOpacity
                key={theme.key}
                activeOpacity={0.8}
                onPress={() => {
                  selectionHaptic();
                  setColorTheme(theme.key as ColorThemeKey);
                }}
                style={[
                  styles.swatchItem,
                  {
                    borderColor: isActive ? swatchColor : colors.border,
                    backgroundColor: isActive
                      ? swatchColor + "15"
                      : colors.surfaceHighlight,
                  },
                  isActive && {
                    borderWidth: ms(DESIGN.spacing.tiny),
                    borderColor: swatchColor,
                  },
                ]}
              >
                <View
                  style={[styles.swatchDot, { backgroundColor: swatchColor }]}
                >
                  {isActive && (
                    <BibleIcon
                      name="check"
                      color={colors.onPrimary}
                      size={ms(DESIGN.fontSize.md)}
                    />
                  )}
                </View>
                <BibleText
                  style={[
                    styles.swatchLabel,
                    {
                      fontSize: ms(DESIGN.fontSize.md),
                      color: isActive ? swatchColor : colors.onSurface,
                    },
                    isActive && { fontWeight: "800" },
                  ]}
                >
                  {theme.label}
                </BibleText>
              </TouchableOpacity>
            );
          })}
        </View>
      </BiblePageModal>

      <BibleChangelogModal
        visible={isChangelogVisible}
        onClose={() => setIsChangelogVisible(false)}
      />

      {Platform.OS !== "web" && isReminderTimePickerVisible && (
        <DateTimePicker
          value={parseTimeToDate(readingPlanNotificationTime)}
          mode="time"
          is24Hour
          display="default"
          onChange={handleReminderTimeChange}
        />
      )}
    </View>
  );
}

function TimeInputField({
  value,
  onChangeText,
  colors,
  ms,
  DESIGN,
}: {
  value: string;
  onChangeText: (t: string) => void;
  colors: any;
  ms: (v: number) => number;
  DESIGN: any;
}) {
  const handleChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    let formatted = "";
    if (cleaned.length <= 2) {
      formatted = cleaned;
    } else {
      formatted = `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
    }
    onChangeText(formatted);
  };

  return (
    <TextInput
      value={value}
      onChangeText={handleChange}
      placeholder="HH:mm"
      placeholderTextColor={colors.textMuted}
      keyboardType="default"
      maxLength={5}
      style={{
        width: ms(64),
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: ms(DESIGN.borderRadius.md),
        paddingHorizontal: ms(DESIGN.spacing.sm),
        paddingVertical: ms(DESIGN.spacing.sm),
        fontSize: ms(DESIGN.fontSize.lg),
        textAlign: "center",
        color: colors.onSurface,
        ...({ outlineStyle: "none" } as any),
      }}
    />
  );
}
