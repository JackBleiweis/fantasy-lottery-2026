import { COLORS } from "./tuning";

export type CharacterKey = "wizard" | "viking" | "robot";

export interface CharacterDef {
  key: CharacterKey;
  name: string;
  title: string;
  blurb: string;
  color: number;
  accent: number;
  // Launch speed at full power (px/s).
  maxPower: number;
  // Fraction of the previewed trajectory that is drawn (accuracy of the guide).
  guideFraction: number;
  // Cosmetic wobble added to the drawn guide points (visible imprecision only;
  // the ACTUAL shot always matches the aim exactly - no hidden scatter).
  guideWobble: number;
  emoji: string;
}

export const CHARACTERS: Record<CharacterKey, CharacterDef> = {
  wizard: {
    key: "wizard",
    name: "Wizard",
    title: "The Wizard",
    blurb: "Pinpoint aim, gentle power. The guide reads true and far.",
    color: 0x6a4bd6,
    accent: COLORS.gold,
    maxPower: 560,
    guideFraction: 1.0,
    guideWobble: 0,
    emoji: "\uD83E\uDDD9",
  },
  viking: {
    key: "viking",
    name: "Viking",
    title: "The Viking",
    blurb: "Booming power, rough aim. The guide is short and shaky.",
    color: 0xc0492b,
    accent: COLORS.gold,
    maxPower: 900,
    guideFraction: 0.45,
    guideWobble: 15,
    emoji: "\uD83E\uDE93",
  },
  robot: {
    key: "robot",
    name: "Robot",
    title: "The Robot",
    blurb: "Balanced and predictable. Medium power, steady guide.",
    color: 0x4a90a4,
    accent: COLORS.gold,
    maxPower: 720,
    guideFraction: 0.72,
    guideWobble: 4,
    emoji: "\uD83E\uDD16",
  },
};

export const CHARACTER_ORDER: CharacterKey[] = ["wizard", "robot", "viking"];

export function getCharacter(key: string | undefined): CharacterDef {
  if (key && key in CHARACTERS) return CHARACTERS[key as CharacterKey];
  return CHARACTERS.robot;
}
