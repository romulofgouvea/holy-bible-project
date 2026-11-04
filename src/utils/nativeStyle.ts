type StyleValue = number | string | Record<string, number | string>[];

const toCssValue = (key: string, value: number | string) =>
  typeof value === "number" && key !== "opacity" ? `${value}px` : value;

const toCssTransform = (transforms: Record<string, number | string>[]) =>
  transforms
    .map((transform) => {
      const [name, value] = Object.entries(transform)[0];
      return `${name}(${toCssValue(name, value)})`;
    })
    .join(" ");

export const applyNativeStyle = (
  node: any,
  style: Record<string, StyleValue>,
) => {
  if (!node) return;
  if (typeof node.setNativeProps === "function") {
    node.setNativeProps({ style });
    return;
  }
  const css = node.style;
  if (!css) return;
  Object.entries(style).forEach(([key, value]) => {
    css[key] =
      key === "transform"
        ? toCssTransform(value as Record<string, number | string>[])
        : toCssValue(key, value as number | string);
  });
};
