const pixelValue = /(-?(?:\d+|\d*\.\d+))px\b/gi;
const borderWidthProperty = /^border(?:-(?:(?:top|right|bottom|left|block(?:-start|-end)?|inline(?:-start|-end)?)(?:-width)?|width))?$/i;
const protectedToken = /url\([^)]*\)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/gi;

function toRem(value) {
  return Number((Number.parseFloat(value) / 16).toFixed(5)).toString() + "rem";
}

module.exports = function fluidUnits() {
  return {
    postcssPlugin: "quizsupport-fluid-units",
    Declaration(declaration) {
      const property = declaration.prop.toLowerCase();
      const value = declaration.value;

      // Keep the requested fluid root formula in CSS pixels, and preserve only
      // 1px borders plus shadow dimensions as fixed pixel values.
      if (
        (property === "font-size" && declaration.parent.selector?.trim() === "html") ||
        property === "box-shadow" ||
        property === "text-shadow" ||
        (property === "filter" && /drop-shadow\(/i.test(value))
      ) {
        return;
      }

      // Tailwind's rounded-full compiles to calc(infinity * 1px); rewriting it
      // produces invalid CSS, so leave infinity expressions untouched.
      if (/infinity/i.test(value)) return;

      const keepOnePixelBorder = borderWidthProperty.test(property);
      const protectedTokens = [];
      const safeValue = value.replace(protectedToken, (token) => {
        const index = protectedTokens.push(token) - 1;
        return `__FLUID_TOKEN_${index}__`;
      });

      declaration.value = safeValue.replace(pixelValue, (match, number) => {
        if (keepOnePixelBorder && Number.parseFloat(number) === 1) return match;
        return toRem(number);
      }).replace(/__FLUID_TOKEN_(\d+)__/g, (_match, index) => protectedTokens[Number(index)]);
    },
  };
};
