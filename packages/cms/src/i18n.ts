export type ReducedTranslations = Record<string, string>;

export function reduceTranslations(trans: any[], fieldName: string) {
  const getNestedValue = (obj: any, path: string) => {
    return path.split(".").reduce((acc, part) => acc?.[part], obj);
  };

  const translations = (trans ?? []).reduce(
    (acc: any, trans: any) => {
      const value = getNestedValue(trans, fieldName);

      acc[trans.languages_id.code] = value ?? "";
      return acc;
    },
    {} as Record<string, string>,
  );

  return translations;
}
