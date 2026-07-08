// Centrale mapping voor supermarkt logo's
// Alle logo's moeten statisch geïmporteerd worden in React Native

export const SUPERMARKET_LOGOS = {
  ah: require('../../assets/supermarkets/albertheijn.png'),
  jumbo: require('../../assets/supermarkets/jumbo.png'),
  lidl: require('../../assets/supermarkets/lidl.png'),
  aldi: require('../../assets/supermarkets/aldi.png'),
  plus: require('../../assets/supermarkets/plus.png'),
  dirk: require('../../assets/supermarkets/dirk.png'),
  coop: require('../../assets/supermarkets/coop.png'),
  hoogvliet: require('../../assets/supermarkets/hoogvliet.png'),
  dekamarkt: require('../../assets/supermarkets/dekamarkt.png'),
  spar: require('../../assets/supermarkets/spar.png'),
  vomar: require('../../assets/supermarkets/vomar.png'),
  poiesz: require('../../assets/supermarkets/poiesz.png'),
  ekoplaza: require('../../assets/supermarkets/ekoplaza.png'),
  amazingoriental: require('../../assets/supermarkets/amazingoriental.png'),
};

export function getSupermarketLogo(id) {
  return SUPERMARKET_LOGOS[id] || null;
}

export const SUPERMARKETS = [
  { id: 'ah', name: 'Albert Heijn', color: '#00ADEF' },
  { id: 'jumbo', name: 'Jumbo', color: '#E3000F' },
  { id: 'lidl', name: 'Lidl', color: '#0050AA' },
  { id: 'aldi', name: 'ALDI', color: '#00B04E' },
  { id: 'plus', name: 'PLUS', color: '#F37021' },
  { id: 'dirk', name: 'Dirk', color: '#E3000F' },
  { id: 'coop', name: 'Coop', color: '#FF6600' },
  { id: 'hoogvliet', name: 'Hoogvliet', color: '#E3000F' },
  { id: 'dekamarkt', name: 'DekaMarkt', color: '#0055A4' },
  { id: 'spar', name: 'SPAR', color: '#E3000F' },
  { id: 'vomar', name: 'Vomar', color: '#E3000F' },
  { id: 'poiesz', name: 'Poiesz', color: '#E3000F' },
  { id: 'ekoplaza', name: 'Ekoplaza', color: '#00A650' },
  { id: 'amazingoriental', name: 'Amazing Oriental', color: '#E3000F' },
];

export function getSupermarketById(id) {
  return SUPERMARKETS.find(s => s.id === id) || null;
}
