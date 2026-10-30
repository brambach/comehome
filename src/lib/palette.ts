import tokens from "@brambach/design-tokens/tokens.json";

// The same light palette the CSS gets from tokens.css plus themes/warm-paper.css,
// for things that can't read CSS variables: the OG image, the map, theme-color.
export const palette = { ...tokens.modes.light, ...tokens.themes["warm-paper"] };
