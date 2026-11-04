import { Feather } from "@expo/vector-icons";

export type RouteConfig = {
  path: string;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
};

export const ROUTES = {
  HOME: "/",
  BIBLE: "/bible",
  STUDIES: "/studies",
  SEARCH: "/search",
  CONFIGURATION: "/configuration",
  TRASH: "/configuration/trash",
  DOWNLOADS: "/configuration/downloads",
  DOWNLOADS_BOOKS: (version: string) =>
    `/configuration/downloads/${version}` as const,
  STUDY_EDITOR: (id: string) => `/studies/study/${id}` as const,
  READING_PLAN: "/reading-plan",
  NOTES: "/notes",
  COLLECTIONS: "/collections",
  STATS: "/stats",
} as const;

export const ROUTE_LABELS: Record<string, string> = {
  [ROUTES.HOME]: "Início",
  [ROUTES.BIBLE]: "Bíblia",
  [ROUTES.STUDIES]: "Estudos",
  [ROUTES.SEARCH]: "Pesquisar",
  [ROUTES.NOTES]: "Anotações",
  [ROUTES.COLLECTIONS]: "Coleções",
  [ROUTES.STATS]: "Estatísticas",
  [ROUTES.CONFIGURATION]: "Configurações",
  [ROUTES.TRASH]: "Gerenciar estudos excluídos",
  [ROUTES.DOWNLOADS]: "Downloads",
  [ROUTES.READING_PLAN]: "Plano de Leitura",
  APPEARANCE: "Aparência (Aa)",
  HISTORY: "Histórico",
};

export const DRAWER_ITEMS: {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
}[] = [
  {
    key: "bible",
    label: ROUTE_LABELS[ROUTES.BIBLE],
    icon: "book-open",
    route: ROUTES.BIBLE,
  },
  {
    key: "studies",
    label: ROUTE_LABELS[ROUTES.STUDIES],
    icon: "feather",
    route: ROUTES.STUDIES,
  },
  {
    key: "search",
    label: ROUTE_LABELS[ROUTES.SEARCH],
    icon: "search",
    route: ROUTES.SEARCH,
  },
  {
    key: "notes",
    label: ROUTE_LABELS[ROUTES.NOTES],
    icon: "file-text",
    route: ROUTES.NOTES,
  },
  {
    key: "collections",
    label: ROUTE_LABELS[ROUTES.COLLECTIONS],
    icon: "bookmark",
    route: ROUTES.COLLECTIONS,
  },
  {
    key: "reading-plan",
    label: ROUTE_LABELS[ROUTES.READING_PLAN],
    icon: "calendar",
    route: ROUTES.READING_PLAN,
  },
  {
    key: "stats",
    label: ROUTE_LABELS[ROUTES.STATS],
    icon: "bar-chart-2",
    route: ROUTES.STATS,
  },
  {
    key: "configuration",
    label: ROUTE_LABELS[ROUTES.CONFIGURATION],
    icon: "settings",
    route: ROUTES.CONFIGURATION,
  },
];
