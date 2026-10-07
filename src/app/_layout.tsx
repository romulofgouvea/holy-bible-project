import {
  Stack,
  useGlobalSearchParams,
  usePathname,
  useRootNavigationState,
  useRouter,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { LogBox, Platform, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { AudioSettingsProvider } from "../hooks/useAudioSettings";
import { DownloadsProvider } from "../hooks/useDownloads";
import { ReaderSettingsProvider } from "../hooks/useReaderSettings";
import { ThemeProvider, useTheme } from "../hooks/useTheme";
import { BibleModalProvider } from "../hooks/useBibleModals";
import { BibleProvider, useBible } from "../hooks/useBible";
import { GlobalBibleModals } from "../components/modals/GlobalBibleModals";

SplashScreen.preventAutoHideAsync().catch(() => {});

LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications (remote notifications)",
]);

function useRoutePersistence() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const navigationState = useRootNavigationState();
  const router = useRouter();
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    setIsRestored(true);
  }, []);

  return isRestored;
}

function AppLayout() {
  const { colors } = useTheme();
  const { isReady } = useBible();
  const isRestored = useRoutePersistence();

  useEffect(() => {
    if (Platform.OS === "web") {
      document.title = "Bíblia Online";
    }
  }, []);

  useEffect(() => {
    if (isReady && isRestored) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady, isRestored]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
      </View>
      <GlobalBibleModals />
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ReaderSettingsProvider>
          <AudioSettingsProvider>
            <DownloadsProvider>
              <BibleProvider>
                <BibleModalProvider>
                  <AppLayout />
                </BibleModalProvider>
              </BibleProvider>
            </DownloadsProvider>
          </AudioSettingsProvider>
        </ReaderSettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
