export const cityImages = {
  'london': {
    primary: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad',
    alternatives: [
      'https://images.unsplash.com/photo-1529655683826-aba9b3e77383',
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad'
    ]
  },
  'birmingham': {
    primary: 'https://images.unsplash.com/photo-1626004080175-5982dd2d93db',
    alternatives: [
      'https://images.unsplash.com/photo-1628849207631-c8ea5a67950f',
      'https://images.unsplash.com/photo-1579612380033-3f98e7113619'
    ]
  },
  'manchester': {
    primary: 'https://images.unsplash.com/photo-1581465288252-47c0f400eb10',
    alternatives: [
      'https://images.unsplash.com/photo-1590596413111-a7768f21954f',
      'https://images.unsplash.com/photo-1549981381-6aa621ce0738'
    ]
  },
  'liverpool': {
    primary: 'https://images.unsplash.com/photo-1523906630133-f6934a1ab2b9',
    alternatives: [
      'https://images.unsplash.com/photo-1628921919890-54be55d84e99',
      'https://images.unsplash.com/photo-1589872897516-3c113ff2f98e'
    ]
  },
  'leeds': {
    primary: 'https://images.unsplash.com/photo-1579612354960-ded364ff9471',
    alternatives: [
      'https://images.unsplash.com/photo-1622141268343-9e8f0bad5e53',
      'https://images.unsplash.com/photo-1620586269911-724af0432499'
    ]
  },
  'bristol': {
    primary: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96',
    alternatives: [
      'https://images.unsplash.com/photo-1603384399030-95008ac7425d',
      'https://images.unsplash.com/photo-1603384070859-770c311a7828'
    ]
  },
  'sheffield': {
    primary: 'https://images.unsplash.com/photo-1567557831490-5a5048dd8c6a',
    alternatives: [
      'https://images.unsplash.com/photo-1598971861713-54ad16a7e72e',
      'https://images.unsplash.com/photo-1596468138838-0f59ed2d3e64'
    ]
  },
  'newcastle': {
    primary: 'https://images.unsplash.com/photo-1564058408727-b945ee84e4e5',
    alternatives: [
      'https://images.unsplash.com/photo-1582136112569-7f9c2aa85752',
      'https://images.unsplash.com/photo-1587559045816-8b0a54d0d06e'
    ]
  },
  'nottingham': {
    primary: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96',
    alternatives: [
      'https://images.unsplash.com/photo-1603384399030-95008ac7425d',
      'https://images.unsplash.com/photo-1603384070859-770c311a7828'
    ]
  },
  'cambridge': {
    primary: 'https://images.unsplash.com/photo-1597423498219-04418210827d',
    alternatives: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96',
      'https://images.unsplash.com/photo-1603384399030-95008ac7425d'
    ]
  },
  'oxford': {
    primary: 'https://images.unsplash.com/photo-1581004705471-d5177f2181ab',
    alternatives: [
      'https://images.unsplash.com/photo-1589824783837-6019b30341cf',
      'https://images.unsplash.com/photo-1580420994559-088c9c645e24'
    ]
  },
  'glasgow': {
    primary: 'https://images.unsplash.com/photo-1573294586886-e843657f0a67',
    alternatives: [
      'https://images.unsplash.com/photo-1584477712087-69fa7e911b86',
      'https://images.unsplash.com/photo-1607427293702-036933bbf746'
    ]
  },
  'edinburgh': {
    primary: 'https://images.unsplash.com/photo-1506377585622-bedcbb027afc',
    alternatives: [
      'https://images.unsplash.com/photo-1583425921686-c5daf5f49e4f',
      'https://images.unsplash.com/photo-1582557093038-9e8b0843c162'
    ]
  },
  'cardiff': {
    primary: 'https://images.unsplash.com/photo-1587410131477-367a36c1c296',
    alternatives: [
      'https://images.unsplash.com/photo-1594022681485-810cec06d250',
      'https://images.unsplash.com/photo-1594022681485-810cec06d250'
    ]
  },
  'belfast': {
    primary: 'https://images.unsplash.com/photo-1520862208400-e91ee1664ed7',
    alternatives: [
      'https://images.unsplash.com/photo-1590159929561-2e8dfb7b5921',
      'https://images.unsplash.com/photo-1588607775824-1c694d559c8c'
    ]
  }
};

export const getCityImages = (cityName) => {
  const normalizedCityName = cityName.toLowerCase().trim();
  return cityImages[normalizedCityName] || {
    primary: 'https://images.unsplash.com/photo-1496568816309-51d7c20e3b21', // default city image
    alternatives: []
  };
};
