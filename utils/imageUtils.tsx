const PLACEHOLDER = require("../assets/images/Fish-Tank.jpeg");

export const resolveTankImage = (background: any, useFallback: boolean) => {
  if (useFallback) return PLACEHOLDER;
  if (!background) return PLACEHOLDER;

  if (typeof background === "number") return background;

  if (typeof background === "string") return { uri: background };

  if (typeof background === "object" && background.uri) return background;

  return PLACEHOLDER;
};

export const fishImages: Record<string, any> = {
  betta: require('../assets/images/Betta.png'),
  guppy: require('../assets/images/Guppy.png'),
  anubias: require('../assets/images/Anubias.png'),
  'java-fern': require('../assets/images/Java-Fern.png'),
  'neon-tetra': require('../assets/images/Neon-Tetra.png'),
  'amazon-sword': require('../assets/images/Amazon-Sword.png'),
  'banggai-cardinal': require('../assets/images/Banggai-Cardinalfish.png'),
  'bristlenose-pleco': require('../assets/images/Bristlenose-Pleco.png'),
  'caulerpa-prolifera': require('../assets/images/Caulerpa-Prolifera.png'),
  chaetomorpha: require('../assets/images/Chaetomorpha.png'),
  'crypt-wendtii': require('../assets/images/Cryptocoryne-Wendtii.png'),
  'firefish-goby': require('../assets/images/Firefish.png'),
  'harlequin-rasbora': require('../assets/images/Harlequin-Rasbora.png'),
  hornwort: require('../assets/images/Hornwort.png'),
  'kuhli-loach': require('../assets/images/Kuhli-Loach.png'),
  'ocellaris-clownfish': require('../assets/images/Ocellaris-Clownfish.png'),
  otocinclus: require('../assets/images/Otocinclus.png'),
  'corydoras-panda': require('../assets/images/Panda-Corydora.png'),
  'royal-gramma': require('../assets/images/Royal-Gramma.png'),
  'tailspot-blenny': require('../assets/images/Tailspot-Blenny.png'),
  'water-wisteria': require('../assets/images/Water-Wisteria.png'),
};

export const defaultFishImage = require("../assets/images/Default-Fish.png");

export const getFishImage = (slug: string) => {
  const key = slug.toLowerCase();
  return fishImages[key] ?? defaultFishImage;
};