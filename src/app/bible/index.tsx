import { STORAGE_KEYS } from "@/constants/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

export default function BibleIndex() {
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState("/bible/naa/gn/1");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.CURRENT_READ).then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (parsed.version && parsed.book && parsed.chapter) {
            setRoute(
              `/bible/${parsed.version.toLowerCase()}/${parsed.book.toLowerCase()}/${parsed.chapter}`,
            );
          }
        } catch (e) {}
      }
      setReady(true);
    });
  }, []);

  if (!ready) return null;
  return <Redirect href={route as any} />;
}
