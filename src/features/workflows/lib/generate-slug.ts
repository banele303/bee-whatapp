const ADJECTIVES = ["swift", "brave", "bright", "calm", "clever", "eager", "gentle", "happy", "keen", "mighty", "nimble", "quick", "silent", "smart", "wild"];
const ANIMALS = ["falcon", "tiger", "panther", "eagle", "lion", "wolf", "hawk", "bear", "fox", "puma", "viper", "otter", "cheetah", "leopard", "lynx"];

export function generateSlug() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj}-${animal}-${num}`;
}
