const primary = '#3B82F6'; // A modern, friendly blue
const secondary = '#F472B6'; // A soft, warm pink for accents
const backgroundLight = '#F9FAFB'; // A very light gray for a soft background
const backgroundDark = '#1F2937'; // A deep, cool gray for dark mode
const textLight = '#111827'; // A dark gray for high contrast on light backgrounds
const textDark = '#F9FAFB'; // A light gray for readability on dark backgrounds
const cardLight = '#FFFFFF'; // White cards for a clean look
const cardDark = '#374151'; // A slightly lighter gray for cards in dark mode
const iconLight = '#6B7280';
const iconDark = '#D1D5DB';

export const Colors = {
  light: {
    primary,
    secondary,
    text: textLight,
    background: backgroundLight,
    card: cardLight,
    icon: iconLight,
    tint: primary,
    tabIconDefault: '#ccc',
    tabIconSelected: primary,
  },
  dark: {
    primary,
    secondary,
    text: textDark,
    background: backgroundDark,
    card: cardDark,
    icon: iconDark,
    tint: primary,
    tabIconDefault: '#ccc',
    tabIconSelected: primary,
  },
};
