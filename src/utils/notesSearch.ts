const removeAccents = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "");

export const normalizeSearch = (value: string) =>
  removeAccents(value).toLowerCase().trim();

export const matchesQuery = (
  query: string,
  ...fields: (string | undefined)[]
) => {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;
  return fields.some((field) =>
    field ? normalizeSearch(field).includes(normalizedQuery) : false,
  );
};
