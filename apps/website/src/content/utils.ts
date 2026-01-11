export function convertI18n(
  trans: any[],
  fieldName: string,
  defaultLanguage: string
) {
  const getNestedValue = (obj: any, path: string) => {
    return path.split(".").reduce((acc, part) => acc?.[part], obj);
  };

  const translations = (trans ?? []).reduce(
    (acc: any, trans: any) => {
      const value = getNestedValue(trans, fieldName);

      acc[trans.languages_id.code] = value ?? "";
      return acc;
    },
    {} as Record<string, string>
  );

  return {
    value: translations[defaultLanguage],
    translations: translations,
  };
}

export function getImage(image: any) {
  let photoData = null;
  if (image && typeof image === "object") {
    const filename = image.filename_disk || "image.jpg";

    photoData = {
      src: `${import.meta.env.DIRECTUS_URL}/assets/${
        image.id
      }/${filename}?access_token=${
        import.meta.env.DIRECTUS_TOKEN
      }&width=1000&withoutEnlargement=true`,
      title: image.title,
      width: image.width,
      height: image.height,
      focalPoint: {
        x: image.focal_point_x,
        y: image.focal_point_y,
      },
    };
  }
  return photoData;
}
