export const BRISTOL_SCALE = [
  {
    type: 1,
    label: "Type 1",
    description: "Grumeaux durs séparés",
    hint: "Constipation sévère",
    emoji: "⚫⚫⚫",
    color: "#8D6E4C",
    direction: "constipation",
  },
  {
    type: 2,
    label: "Type 2",
    description: "Saucisse bosselée et grumeuse",
    hint: "Constipation légère",
    emoji: "🌑🌑",
    color: "#A0856A",
    direction: "constipation",
  },
  {
    type: 3,
    label: "Type 3",
    description: "Saucisse avec craquelures",
    hint: "Normal (limite)",
    emoji: "🌕🌕",
    color: "#81B29A",
    direction: "normal",
  },
  {
    type: 4,
    label: "Type 4",
    description: "Saucisse lisse et douce",
    hint: "Idéal",
    emoji: "✅",
    color: "#4CAF82",
    direction: "normal",
  },
  {
    type: 5,
    label: "Type 5",
    description: "Morceaux mous aux bords nets",
    hint: "Manque de fibres",
    emoji: "💛💛",
    color: "#FFB74D",
    direction: "soft",
  },
  {
    type: 6,
    label: "Type 6",
    description: "Morceaux floconneux, pâteux",
    hint: "Diarrhée légère",
    emoji: "🟠🟠",
    color: "#FF8A65",
    direction: "diarrhea",
  },
  {
    type: 7,
    label: "Type 7",
    description: "Entièrement liquide, sans solide",
    hint: "Diarrhée sévère",
    emoji: "💧💧💧",
    color: "#EF9A9A",
    direction: "diarrhea",
  },
];

export function getBristol(type) {
  return BRISTOL_SCALE.find(b => b.type === type);
}
