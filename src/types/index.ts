export interface Character {
  id: string;
  user_id: string;
  name: string;
  nickname: string | null;
  age: string | null;
  gender: string | null;
  pronouns: string | null;
  species: string | null;
  appearance: CharacterAppearance;
  personality: CharacterPersonality;
  primary_affinity: string | null;
  secondary_affinity: string | null;
  starting_class: string | null;
  background: string | null;
  origin: string | null;
  level: number;
  hp: number;
  mp: number;
  exp: number;
  skill_points: number;
  created_at: string;
}

export interface CharacterAppearance {
  hairStyle: string;
  hairColor: string;
  hairLength: string;
  eyeColor: string;
  eyeType: string;
  faceShape: string;
  eyebrows: string;
  mouth: string;
  height: string;
  bodyType: string;
  glasses: string;
  earrings: string;
  scars: string;
  birthmarks: string;
  specialFeatures: string;
}

export interface CharacterPersonality {
  brave: number;
  kind: number;
  calm: number;
  curious: number;
  confident: number;
}

export type WorldStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface WorldProgress {
  id: string;
  character_id: string;
  world_number: number;
  status: WorldStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username: string;
  created_at: string;
}

export const AFFINITY_OPTIONS = [
  'Fire',
  'Water',
  'Wind',
  'Nature',
  'Lightning',
  'Ice',
  'Shadow',
  'Light',
  'Mystery',
] as const;

export const CLASS_OPTIONS = [
  { id: 'attack', name: 'Attack', icon: 'sword', desc: 'Excels at offensive combat and dealing damage.' },
  { id: 'defense', name: 'Defense', icon: 'shield', desc: 'Excels at protection and absorbing damage.' },
  { id: 'support', name: 'Support', icon: 'sparkles', desc: 'Excels at healing, assistance, and special effects.' },
] as const;

export const ORIGIN_OPTIONS = [
  'Village',
  'City',
  'Forest',
  'Kingdom',
  'Unknown',
  'Custom',
] as const;

export const WORLDS = [
  { number: 1, name: 'Whispering Forest', theme: 'Dreamy forest, ancient trees, mysterious glowing symbols' },
  { number: 2, name: 'Modern World', theme: 'Modern city, technology, laboratories' },
  { number: 3, name: 'Ocean World', theme: 'Underwater cities, coral kingdoms, deep-sea ruins' },
  { number: 4, name: 'Ice & Snow World', theme: 'Frozen mountains, glaciers, auroras' },
  { number: 5, name: 'Lava World', theme: 'Volcanoes, lava rivers, burning cities' },
  { number: 6, name: 'Nature World', theme: 'Ancient forests, giant trees, fairy villages' },
  { number: 7, name: 'Star World', theme: 'Outer space, alien ruins, cosmic temples' },
  { number: 8, name: 'Shadow World', theme: 'Eternal night, dark forests, souls and shadows' },
  { number: 9, name: 'The King of Void', theme: 'Final universal boss — uses all elements' },
] as const;

export const DEFAULT_APPEARANCE: CharacterAppearance = {
  hairStyle: 'Short',
  hairColor: 'Black',
  hairLength: 'Medium',
  eyeColor: 'Brown',
  eyeType: 'Normal',
  faceShape: 'Oval',
  eyebrows: 'Normal',
  mouth: 'Smile',
  height: 'Average',
  bodyType: 'Average',
  glasses: 'None',
  earrings: 'None',
  scars: 'None',
  birthmarks: 'None',
  specialFeatures: 'None',
};

export const DEFAULT_PERSONALITY: CharacterPersonality = {
  brave: 2,
  kind: 2,
  calm: 2,
  curious: 2,
  confident: 2,
};

export interface CharacterItem {
  id: string;
  character_id: string;
  item_key: string;
  item_name: string;
  item_type: string;
  quantity: number;
  world_source: number | null;
  created_at: string;
}

export interface CharacterAbility {
  id: string;
  character_id: string;
  ability_key: string;
  ability_name: string;
  ability_type: string;
  world_source: number | null;
  element: string | null;
  power: number;
  mp_cost: number;
  created_at: string;
}

export const APPEARANCE_OPTIONS = {
  hairStyle: ['Short', 'Long', 'Ponytail', 'Braids', 'Curly', 'Bald', 'Wavy', 'Twin Tails', 'Spiky', 'Undercut'],
  hairColor: ['Black', 'Brown', 'Blonde', 'Red', 'White', 'Silver', 'Blue', 'Green', 'Pink', 'Purple'],
  hairLength: ['Very Short', 'Short', 'Medium', 'Long', 'Very Long'],
  eyeColor: ['Brown', 'Blue', 'Green', 'Hazel', 'Amber', 'Red', 'Violet', 'Gold', 'Silver', 'Heterochromia'],
  eyeType: ['Normal', 'Sharp', 'Round', 'Narrow', 'Glowing', 'Determined', 'Gentle', 'Cold'],
  faceShape: ['Oval', 'Round', 'Square', 'Heart', 'Diamond', 'Long'],
  eyebrows: ['Normal', 'Thick', 'Thin', 'Arched', 'Straight', 'Angled'],
  mouth: ['Smile', 'Neutral', 'Frown', 'Smirk', 'Open', 'Small'],
  height: ['Short', 'Below Average', 'Average', 'Above Average', 'Tall', 'Very Tall'],
  bodyType: ['Slim', 'Athletic', 'Average', 'Muscular', 'Curvy', 'Stocky'],
  glasses: ['None', 'Round', 'Square', 'Half-Rim', 'Sunglasses', 'Monocle'],
  earrings: ['None', 'Studs', 'Hoops', 'Dangling', 'Multiple', 'Cuff'],
  scars: ['None', 'Cheek', 'Eye', 'Forehead', 'Arm', 'Multiple'],
  birthmarks: ['None', 'Face', 'Neck', 'Arm', 'Back', 'Shoulder'],
  specialFeatures: ['None', 'Freckles', 'Glowing Tattoos', 'Horns', 'Pointed Ears', 'Fangs', 'Tail', 'Wings'],
} as const;
