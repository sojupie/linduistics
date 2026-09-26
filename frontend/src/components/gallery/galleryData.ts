/**
 * Comprehensive linguistic dataset for Visualization Lab prototypes.
 * Encodes authentic Proto-Germanic roots, phonological isogloss waves,
 * lexical stratigraphy layers, and cross-linguistic pairwise coefficients.
 */

export interface LanguageMeta {
  code: string;
  name: string;
  nativeName: string;
  branch: 'North Germanic' | 'West Germanic';
  subbranch: 'Continental Scandinavian' | 'Insular Scandinavian' | 'Anglo-Frisian' | 'Continental West Germanic';
  approxLexiconSize: number;
  // Intrinsic 2D coordinates in linguistic space (-100 to 100)
  linguisticPos: { x: number; y: number; z: number };
}

export const GALLERY_LANGUAGES: LanguageMeta[] = [
  {
    code: 'sv',
    name: 'Swedish',
    nativeName: 'Svenska',
    branch: 'North Germanic',
    subbranch: 'Continental Scandinavian',
    approxLexiconSize: 125000,
    linguisticPos: { x: 38, y: -45, z: 15 },
  },
  {
    code: 'da',
    name: 'Danish',
    nativeName: 'Dansk',
    branch: 'North Germanic',
    subbranch: 'Continental Scandinavian',
    approxLexiconSize: 110000,
    linguisticPos: { x: 22, y: -25, z: -10 },
  },
  {
    code: 'no',
    name: 'Norwegian',
    nativeName: 'Norsk (Bokmål)',
    branch: 'North Germanic',
    subbranch: 'Continental Scandinavian',
    approxLexiconSize: 115000,
    linguisticPos: { x: 30, y: -55, z: 20 },
  },
  {
    code: 'is',
    name: 'Icelandic',
    nativeName: 'Íslenska',
    branch: 'North Germanic',
    subbranch: 'Insular Scandinavian',
    approxLexiconSize: 95000,
    linguisticPos: { x: 80, y: -80, z: 65 },
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    branch: 'West Germanic',
    subbranch: 'Continental West Germanic',
    approxLexiconSize: 145000,
    linguisticPos: { x: -35, y: 40, z: -35 },
  },
  {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    branch: 'West Germanic',
    subbranch: 'Continental West Germanic',
    approxLexiconSize: 120000,
    linguisticPos: { x: -18, y: 15, z: -15 },
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    branch: 'West Germanic',
    subbranch: 'Anglo-Frisian',
    approxLexiconSize: 170000,
    linguisticPos: { x: -55, y: -10, z: -40 },
  },
];

// ---------------------------------------------------------------------------
// 1. Proto-Germanic Celestial Roots Dataset
// ---------------------------------------------------------------------------

export type RootConstellation =
  | 'Cosmos & Elements'
  | 'Kinship & Person'
  | 'Living World & Body'
  | 'Vital Action'
  | 'Material & Craft';

export interface DaughterWord {
  word: string;
  ipa: string;
  gloss: string;
  status: 'cognate' | 'shifted' | 'archaic_loss';
  shiftNote?: string;
}

export interface ProtoRootStar {
  id: string;
  root: string;
  reconstructedMeaning: string;
  constellation: RootConstellation;
  // Spherical celestial coordinates (angles in degrees: ra 0-360, dec -90 to +90)
  celestial: { ra: number; dec: number; magnitude: number };
  daughters: Record<string, DaughterWord>;
  etymologicalNote: string;
}

export const PROTO_ROOT_STARS: ProtoRootStar[] = [
  {
    id: 'root-dagaz',
    root: '*dagaz',
    reconstructedMeaning: 'day, daylight, time of sun',
    constellation: 'Cosmos & Elements',
    celestial: { ra: 45, dec: 28, magnitude: 1.1 },
    daughters: {
      sv: { word: 'dag', ipa: '/dɑːɡ/', gloss: 'day', status: 'cognate' },
      da: { word: 'dag', ipa: '/dæː/', gloss: 'day', status: 'cognate' },
      no: { word: 'dag', ipa: '/dɑːɡ/', gloss: 'day', status: 'cognate' },
      is: { word: 'dagur', ipa: '/ˈtaːɣʏr/', gloss: 'day', status: 'cognate' },
      de: { word: 'Tag', ipa: '/taːk/', gloss: 'day', status: 'cognate' },
      nl: { word: 'dag', ipa: '/dɑx/', gloss: 'day', status: 'cognate' },
      en: { word: 'day', ipa: '/deɪ/', gloss: 'day', status: 'cognate' },
    },
    etymologicalNote: 'Universally conserved Proto-Germanic daylight root. Direct cognate across all living branches.',
  },
  {
    id: 'root-stainaz',
    root: '*stainaz',
    reconstructedMeaning: 'stone, rock, solid mineral',
    constellation: 'Cosmos & Elements',
    celestial: { ra: 62, dec: 18, magnitude: 1.2 },
    daughters: {
      sv: { word: 'sten', ipa: '/steːn/', gloss: 'stone', status: 'cognate' },
      da: { word: 'sten', ipa: '/steːn/', gloss: 'stone', status: 'cognate' },
      no: { word: 'stein', ipa: '/stæɪn/', gloss: 'stone', status: 'cognate' },
      is: { word: 'steinn', ipa: '/steitn/', gloss: 'stone', status: 'cognate' },
      de: { word: 'Stein', ipa: '/ʃtaɪn/', gloss: 'stone', status: 'cognate' },
      nl: { word: 'steen', ipa: '/steːn/', gloss: 'stone, brick', status: 'cognate' },
      en: { word: 'stone', ipa: '/stoʊn/', gloss: 'stone', status: 'cognate' },
    },
    etymologicalNote: 'Exhibits vowel monophthongization in Swedish/Danish (*ai -> e) vs diphthong preservation in German/Norwegian/Icelandic.',
  },
  {
    id: 'root-watan',
    root: '*watōr / *watn̥',
    reconstructedMeaning: 'water (wet substance)',
    constellation: 'Cosmos & Elements',
    celestial: { ra: 75, dec: 42, magnitude: 1.0 },
    daughters: {
      sv: { word: 'vatten', ipa: '/ˈvatːɛn/', gloss: 'water', status: 'cognate' },
      da: { word: 'vand', ipa: '/vanˀ/', gloss: 'water', status: 'cognate' },
      no: { word: 'vann', ipa: '/vɑnː/', gloss: 'water', status: 'cognate' },
      is: { word: 'vatn', ipa: '/vahtn/', gloss: 'water, lake', status: 'cognate' },
      de: { word: 'Wasser', ipa: '/ˈvasɐ/', gloss: 'water', status: 'cognate', shiftNote: 'High German consonant shift t -> ss' },
      nl: { word: 'water', ipa: '/ˈʋaːtər/', gloss: 'water', status: 'cognate' },
      en: { word: 'water', ipa: '/ˈwɔːtər/', gloss: 'water', status: 'cognate' },
    },
    etymologicalNote: 'PIE r/n-heteroclitic stem preserved. German showcases High German shift t -> ss.',
  },
  {
    id: 'root-sunno',
    root: '*sunnǭ / *sōwul',
    reconstructedMeaning: 'the sun, celestial luminary',
    constellation: 'Cosmos & Elements',
    celestial: { ra: 90, dec: 34, magnitude: 1.3 },
    daughters: {
      sv: { word: 'sol', ipa: '/suːl/', gloss: 'sun', status: 'cognate' },
      da: { word: 'sol', ipa: '/soːˀl/', gloss: 'sun', status: 'cognate' },
      no: { word: 'sol', ipa: '/suːl/', gloss: 'sun', status: 'cognate' },
      is: { word: 'sól', ipa: '/souːl/', gloss: 'sun', status: 'cognate' },
      de: { word: 'Sonne', ipa: '/ˈzɔnə/', gloss: 'sun', status: 'cognate' },
      nl: { word: 'zon', ipa: '/zɔn/', gloss: 'sun', status: 'cognate' },
      en: { word: 'sun', ipa: '/sʌn/', gloss: 'sun', status: 'cognate' },
    },
    etymologicalNote: 'North Germanic conserved the *sōwul- variant, while West Germanic uniformly adopted *sunnǭ.',
  },
  {
    id: 'root-nahts',
    root: '*nahts',
    reconstructedMeaning: 'night, dark period',
    constellation: 'Cosmos & Elements',
    celestial: { ra: 110, dec: 12, magnitude: 1.4 },
    daughters: {
      sv: { word: 'natt', ipa: '/natː/', gloss: 'night', status: 'cognate' },
      da: { word: 'nat', ipa: '/nad/', gloss: 'night', status: 'cognate' },
      no: { word: 'natt', ipa: '/nɑtː/', gloss: 'night', status: 'cognate' },
      is: { word: 'nótt', ipa: '/nouht/', gloss: 'night', status: 'cognate' },
      de: { word: 'Nacht', ipa: '/naxt/', gloss: 'night', status: 'cognate' },
      nl: { word: 'nacht', ipa: '/nɑxt/', gloss: 'night', status: 'cognate' },
      en: { word: 'night', ipa: '/naɪt/', gloss: 'night', status: 'cognate' },
    },
    etymologicalNote: 'North Germanic assimilates -ht- -> -tt-. English retains silent -gh- spelling representing historical velar fricative [x].',
  },
  {
    id: 'root-fader',
    root: '*fadēr',
    reconstructedMeaning: 'father, male progenitor',
    constellation: 'Kinship & Person',
    celestial: { ra: 160, dec: 55, magnitude: 1.0 },
    daughters: {
      sv: { word: 'far / fader', ipa: '/fɑːr/', gloss: 'father', status: 'cognate' },
      da: { word: 'far / fader', ipa: '/fɑː/', gloss: 'father', status: 'cognate' },
      no: { word: 'far / fader', ipa: '/fɑːr/', gloss: 'father', status: 'cognate' },
      is: { word: 'faðir', ipa: '/ˈfaːðɪr/', gloss: 'father', status: 'cognate' },
      de: { word: 'Vater', ipa: '/ˈfaːtɐ/', gloss: 'father', status: 'cognate' },
      nl: { word: 'vader', ipa: '/ˈvaːdər/', gloss: 'father', status: 'cognate' },
      en: { word: 'father', ipa: '/ˈfɑːðər/', gloss: 'father', status: 'cognate' },
    },
    etymologicalNote: 'Grimm’s Law shifts PIE *p -> Proto-Germanic *f (*ph₂tḗr -> *fadēr). Scandinavian contracts medial -d- to short forms.',
  },
  {
    id: 'root-moder',
    root: '*mōdēr',
    reconstructedMeaning: 'mother, female progenitor',
    constellation: 'Kinship & Person',
    celestial: { ra: 175, dec: 62, magnitude: 1.1 },
    daughters: {
      sv: { word: 'mor / moder', ipa: '/muːr/', gloss: 'mother', status: 'cognate' },
      da: { word: 'mor / moder', ipa: '/moː/', gloss: 'mother', status: 'cognate' },
      no: { word: 'mor / moder', ipa: '/muːr/', gloss: 'mother', status: 'cognate' },
      is: { word: 'móðir', ipa: '/ˈmouːðɪr/', gloss: 'mother', status: 'cognate' },
      de: { word: 'Mutter', ipa: '/ˈmʊtɐ/', gloss: 'mother', status: 'cognate' },
      nl: { word: 'moeder', ipa: '/ˈmudər/', gloss: 'mother', status: 'cognate' },
      en: { word: 'mother', ipa: '/ˈmʌðər/', gloss: 'mother', status: 'cognate' },
    },
    etymologicalNote: 'Direct archaic kinship conservation. German shows medial d -> tt shift.',
  },
  {
    id: 'root-brother',
    root: '*brōþēr',
    reconstructedMeaning: 'brother, male sibling',
    constellation: 'Kinship & Person',
    celestial: { ra: 190, dec: 48, magnitude: 1.2 },
    daughters: {
      sv: { word: 'bror / broder', ipa: '/bruːr/', gloss: 'brother', status: 'cognate' },
      da: { word: 'bror / broder', ipa: '/bʁoː/', gloss: 'brother', status: 'cognate' },
      no: { word: 'bror / broder', ipa: '/bruːr/', gloss: 'brother', status: 'cognate' },
      is: { word: 'bróðir', ipa: '/ˈprouːðɪr/', gloss: 'brother', status: 'cognate' },
      de: { word: 'Bruder', ipa: '/ˈbʁuːdɐ/', gloss: 'brother', status: 'cognate' },
      nl: { word: 'broer / broeder', ipa: '/brur/', gloss: 'brother', status: 'cognate' },
      en: { word: 'brother', ipa: '/ˈbrʌðər/', gloss: 'brother', status: 'cognate' },
    },
    etymologicalNote: 'Archaic dental fricative *þ preserved as /ð/ in English and Icelandic, hardened to /d/ in German and Dutch.',
  },
  {
    id: 'root-barnan',
    root: '*barną',
    reconstructedMeaning: 'child, offspring (that which is borne)',
    constellation: 'Kinship & Person',
    celestial: { ra: 205, dec: 30, magnitude: 1.8 },
    daughters: {
      sv: { word: 'barn', ipa: '/bɑːɳ/', gloss: 'child', status: 'cognate' },
      da: { word: 'barn', ipa: '/bɑːn/', gloss: 'child', status: 'cognate' },
      no: { word: 'barn', ipa: '/bɑːrn/', gloss: 'child', status: 'cognate' },
      is: { word: 'barn', ipa: '/patn/', gloss: 'child', status: 'cognate' },
      de: { word: 'Kind', ipa: '/kɪnt/', gloss: 'child', status: 'archaic_loss', shiftNote: 'Replaced by *kindą; *barn survives only in archaisms' },
      nl: { word: 'kind', ipa: '/kɪnt/', gloss: 'child', status: 'archaic_loss', shiftNote: 'Replaced by *kindą' },
      en: { word: 'bairn / child', ipa: '/bɛərn/', gloss: 'child (dialectal / Scots)', status: 'shifted', shiftNote: 'Standard English replaced with "child" (*kildą)' },
    },
    etymologicalNote: 'Major North vs West Germanic schism. Derived from *beraną (to bear). Universal in Scandinavian; supplanted by *kindą in West Germanic.',
  },
  {
    id: 'root-hundaz',
    root: '*hundaz',
    reconstructedMeaning: 'dog, canine',
    constellation: 'Living World & Body',
    celestial: { ra: 240, dec: -10, magnitude: 1.3 },
    daughters: {
      sv: { word: 'hund', ipa: '/hɵnd/', gloss: 'dog (general)', status: 'cognate' },
      da: { word: 'hund', ipa: '/hunˀ/', gloss: 'dog (general)', status: 'cognate' },
      no: { word: 'hund', ipa: '/hʉnd/', gloss: 'dog (general)', status: 'cognate' },
      is: { word: 'hundur', ipa: '/ˈhʏntʏr/', gloss: 'dog (general)', status: 'cognate' },
      de: { word: 'Hund', ipa: '/hʊnt/', gloss: 'dog (general)', status: 'cognate' },
      nl: { word: 'hond', ipa: '/hɔnt/', gloss: 'dog (general)', status: 'cognate' },
      en: { word: 'hound', ipa: '/haʊnd/', gloss: 'hunting dog (narrowed)', status: 'shifted', shiftNote: 'Narrowed semantically in Middle English; generic dog replaced by "dog"' },
    },
    etymologicalNote: 'Classical semantic drift specimen. Conserved as generic "canine" everywhere except standard English, where it narrowed to hunting breeds.',
  },
  {
    id: 'root-sterbanan',
    root: '*sterbaną',
    reconstructedMeaning: 'to become stiff, to perish, die',
    constellation: 'Living World & Body',
    celestial: { ra: 260, dec: -25, magnitude: 1.6 },
    daughters: {
      sv: { word: 'svälta / dö', ipa: '/ˈsvɛlta/', gloss: 'die of hunger (svälta)', status: 'shifted', shiftNote: 'Scandinavian preserved *sterbaną only dialectally; "svälta" from *sweltaną' },
      da: { word: 'sulte / dø', ipa: '/ˈsuldə/', gloss: 'starve (sulte)', status: 'shifted' },
      no: { word: 'sulte / dø', ipa: '/ˈsʉltə/', gloss: 'starve (sulte)', status: 'shifted' },
      is: { word: 'svelta / deyja', ipa: '/ˈsvɛl̥ta/', gloss: 'starve / die', status: 'shifted' },
      de: { word: 'sterben', ipa: '/ˈʃtɛʁbn̩/', gloss: 'to die (general)', status: 'cognate' },
      nl: { word: 'sterven', ipa: '/ˈstɛrvə(n)/', gloss: 'to die (general)', status: 'cognate' },
      en: { word: 'starve', ipa: '/stɑːrv/', gloss: 'to suffer/die from hunger (narrowed)', status: 'shifted', shiftNote: 'Narrowed from generic "to die" to "to die of hunger"' },
    },
    etymologicalNote: 'Famous Germanic semantic drift. German/Dutch kept original generic "to die". English narrowed to hunger death. Scandinavian shifted to *sweltaną.',
  },
  {
    id: 'root-werdana',
    root: '*werþaną',
    reconstructedMeaning: 'to turn, to become, to come to pass',
    constellation: 'Vital Action',
    celestial: { ra: 300, dec: 15, magnitude: 1.1 },
    daughters: {
      sv: { word: 'varda / bli', ipa: '/ˈvɑːɖa/', gloss: 'to become (archaic/biblical)', status: 'shifted', shiftNote: 'Replaced in colloquial speech by Middle Low German "bli(va)"' },
      da: { word: 'vorde / blive', ipa: '/ˈvɒːðə/', gloss: 'to become (archaic)', status: 'shifted', shiftNote: 'Replaced by Low German "blive"' },
      no: { word: 'vorde / bli', ipa: '/ˈvʊrdə/', gloss: 'to become (archaic)', status: 'shifted', shiftNote: 'Replaced by Low German "bli"' },
      is: { word: 'verða', ipa: '/ˈvɛrða/', gloss: 'to become, will (fully alive)', status: 'cognate' },
      de: { word: 'werden', ipa: '/ˈveːɐ̯dn̩/', gloss: 'to become, future auxiliary', status: 'cognate' },
      nl: { word: 'worden', ipa: '/ˈʋɔrdə(n)/', gloss: 'to become, passive auxiliary', status: 'cognate' },
      en: { word: 'worth (woe worth the day)', ipa: '/wɜːrθ/', gloss: 'to betide (archaic)', status: 'archaic_loss', shiftNote: 'Extinct in Modern English grammar; replaced by "become"' },
    },
    etymologicalNote: 'Vital Proto-Germanic auxiliary. Fully active in German/Dutch/Icelandic. Replaced by Low German *blīwaną in Scandinavian and *bicoman in English.',
  },
  {
    id: 'root-husan',
    root: '*hūsą',
    reconstructedMeaning: 'house, shelter, dwelling',
    constellation: 'Material & Craft',
    celestial: { ra: 330, dec: 48, magnitude: 1.0 },
    daughters: {
      sv: { word: 'hus', ipa: '/hʉːs/', gloss: 'house, building', status: 'cognate' },
      da: { word: 'hus', ipa: '/huːˀs/', gloss: 'house', status: 'cognate' },
      no: { word: 'hus', ipa: '/hʉːs/', gloss: 'house', status: 'cognate' },
      is: { word: 'hús', ipa: '/huːs/', gloss: 'house', status: 'cognate' },
      de: { word: 'Haus', ipa: '/haʊs/', gloss: 'house, home', status: 'cognate' },
      nl: { word: 'huis', ipa: '/hœy̯s/', gloss: 'house', status: 'cognate' },
      en: { word: 'house', ipa: '/haʊs/', gloss: 'house, dwelling', status: 'cognate' },
    },
    etymologicalNote: 'Pan-Germanic settlement bedrock. High German and English show parallel independent Great Vowel Shift diphthongization /uː/ -> /aʊ/.',
  },
  {
    id: 'root-landan',
    root: '*landą',
    reconstructedMeaning: 'land, defined earth, territory',
    constellation: 'Material & Craft',
    celestial: { ra: 345, dec: 22, magnitude: 1.1 },
    daughters: {
      sv: { word: 'land', ipa: '/land/', gloss: 'land, country', status: 'cognate' },
      da: { word: 'land', ipa: '/lanˀ/', gloss: 'country, land', status: 'cognate' },
      no: { word: 'land', ipa: '/lɑnː/', gloss: 'land, country', status: 'cognate' },
      is: { word: 'land', ipa: '/lant/', gloss: 'land, country', status: 'cognate' },
      de: { word: 'Land', ipa: '/lant/', gloss: 'land, state, countryside', status: 'cognate' },
      nl: { word: 'land', ipa: '/lɑnt/', gloss: 'land, country', status: 'cognate' },
      en: { word: 'land', ipa: '/lænd/', gloss: 'land, country, ground', status: 'cognate' },
    },
    etymologicalNote: 'Perfect structural cognate with identical semantics across every single Germanic daughter language.',
  },
  {
    id: 'root-etan',
    root: '*etaną',
    reconstructedMeaning: 'to eat, consume food',
    constellation: 'Vital Action',
    celestial: { ra: 15, dec: 60, magnitude: 1.2 },
    daughters: {
      sv: { word: 'äta', ipa: '/ˈɛːta/', gloss: 'to eat', status: 'cognate' },
      da: { word: 'æde / spise', ipa: '/ˈɛːðə/', gloss: 'to eat (animals) / spise', status: 'shifted', shiftNote: 'æde narrowed to animal consumption; "spise" adopted from Low German' },
      no: { word: 'ete / spise', ipa: '/ˈeːtə/', gloss: 'to eat (dialectal/nynorsk)', status: 'cognate' },
      is: { word: 'éta', ipa: '/ˈjeːta/', gloss: 'to eat (animals or voraciously)', status: 'shifted', shiftNote: 'Neutral eating replaced by "borða"' },
      de: { word: 'essen / fressen', ipa: '/ˈɛsn̩/', gloss: 'to eat (human)', status: 'cognate', shiftNote: 'High German shift t -> ss; *fretaną reserved for beasts' },
      nl: { word: 'eten', ipa: '/ˈeːtə(n)/', gloss: 'to eat', status: 'cognate' },
      en: { word: 'eat', ipa: '/iːt/', gloss: 'to eat', status: 'cognate' },
    },
    etymologicalNote: 'Archaic PIE verb *h₁ed-. Danish and Icelandic developed human/animal semantic rifts, while English and Dutch conserved neutral usage.',
  },
  {
    id: 'root-drinkan',
    root: '*drinkaną',
    reconstructedMeaning: 'to drink, swallow liquid',
    constellation: 'Vital Action',
    celestial: { ra: 25, dec: 50, magnitude: 1.1 },
    daughters: {
      sv: { word: 'dricka', ipa: '/ˈdrɪkːa/', gloss: 'to drink', status: 'cognate' },
      da: { word: 'drikke', ipa: '/ˈd̥ʁekə/', gloss: 'to drink', status: 'cognate' },
      no: { word: 'drikke', ipa: '/ˈdrɪkːə/', gloss: 'to drink', status: 'cognate' },
      is: { word: 'drekka', ipa: '/ˈtrɛhka/', gloss: 'to drink', status: 'cognate' },
      de: { word: 'trinken', ipa: '/ˈtʁɪŋkn̩/', gloss: 'to drink', status: 'cognate', shiftNote: 'High German shift d -> t' },
      nl: { word: 'drinken', ipa: '/ˈdrɪŋkə(n)/', gloss: 'to drink', status: 'cognate' },
      en: { word: 'drink', ipa: '/drɪŋk/', gloss: 'to drink', status: 'cognate' },
    },
    etymologicalNote: 'Primary strong verb. German shows High German shift d -> t (*drinkan -> trinken).',
  },
  {
    id: 'root-giftiz',
    root: '*giftiz',
    reconstructedMeaning: 'giving, that which is given, marriage payment',
    constellation: 'Material & Craft',
    celestial: { ra: 135, dec: -15, magnitude: 1.5 },
    daughters: {
      sv: { word: 'gift', ipa: '/jɪft/', gloss: 'poison (noun) / married (adj)', status: 'shifted', shiftNote: 'Classical false friend: "gift" = poison / married; "gåva" = present' },
      da: { word: 'gift', ipa: '/ɡ̊ib̥d̥/', gloss: 'poison / married', status: 'shifted', shiftNote: 'Same semantic shift as Swedish' },
      no: { word: 'gift', ipa: '/jɪft/', gloss: 'poison / married', status: 'shifted' },
      is: { word: 'gift / eitur', ipa: '/cɪft/', gloss: 'married / present', status: 'shifted' },
      de: { word: 'Gift', ipa: '/ɡɪft/', gloss: 'poison, venom', status: 'shifted', shiftNote: 'Euphemistic shift from "dose given" to lethal poison' },
      nl: { word: 'gift', ipa: '/ɣɪft/', gloss: 'gift, donation, venom (vergif)', status: 'shifted' },
      en: { word: 'gift', ipa: '/ɡɪft/', gloss: 'present, donation', status: 'cognate', shiftNote: 'Old English had *ġift (marriage price); modern hard /ɡ/ borrowed from Old Norse' },
    },
    etymologicalNote: 'The canonical Germanic false friend. Originally "that which is given" (from *gebaną). Shifted euphemistically to "lethal dose/poison" in German/Scandinavian, while English retained the positive meaning under Old Norse influence.',
  },
];

// ---------------------------------------------------------------------------
// 2. Lexical Stratigraphy Dataset
// ---------------------------------------------------------------------------

export interface StratumLayer {
  id: string;
  name: string;
  era: string;
  depthRank: number; // 1 (deepest/oldest) to 5 (surface/modern)
  description: string;
  linguisticSignificance: string;
  // Estimated percentage volume in modern general lexicon
  volumes: Record<string, number>;
  specimens: {
    protoOrOrigin: string;
    examples: Record<string, string>;
    note: string;
  }[];
}

export const STRATIGRAPHY_LAYERS: StratumLayer[] = [
  {
    id: 'stratum-bedrock',
    name: 'Proto-Germanic Archaic Bedrock',
    era: 'c. 500 BCE – 200 CE',
    depthRank: 1,
    description: 'The primordial inherited core vocabulary of Common Germanic. Primary kin, anatomical parts, elements, vital verbs, and closed-class pronouns.',
    linguisticSignificance: 'Virtually 100% cognate conservation across all daughter languages; the grammatical and lexical skeleton.',
    volumes: {
      is: 68,
      sv: 46,
      no: 45,
      da: 44,
      de: 42,
      nl: 43,
      en: 26, // Drastically reduced relative share due to Romance borrowing, but still forms 85% of spoken frequency!
    },
    specimens: [
      {
        protoOrOrigin: '*fadēr, *mōdēr, *brōþēr',
        examples: { sv: 'far, mor, bror', is: 'faðir, móðir, bróðir', de: 'Vater, Mutter, Bruder', nl: 'vader, moeder, broeder', en: 'father, mother, brother' },
        note: 'Kinship bedrock unbroken across 2,500 years.',
      },
      {
        protoOrOrigin: '*hūsan, *landą, *watan',
        examples: { sv: 'hus, land, vatten', is: 'hús, land, vatn', de: 'Haus, Land, Wasser', nl: 'huis, land, water', en: 'house, land, water' },
        note: 'Primary ecological and settlement terms.',
      },
      {
        protoOrOrigin: '*etaną, *drinkaną, *sehwana',
        examples: { sv: 'äta, dricka, se', is: 'éta, drekka, sjá', de: 'essen, trinken, sehen', nl: 'eten, drinken, zien', en: 'eat, drink, see' },
        note: 'Strong verbs with conserved ablaut alternations.',
      },
    ],
  },
  {
    id: 'stratum-faults',
    name: 'Phonological Shear Faults (Grimm & High German)',
    era: 'c. 400 – 800 CE',
    depthRank: 2,
    description: 'The monumental sound shifts that cracked the physical appearance of cognates without breaking their underlying root lineage.',
    linguisticSignificance: 'The High German Consonant Shift (p->pf/f, t->z/ss, k->ch) sheared southern West Germanic away from the Lowlands and Scandinavia.',
    volumes: {
      is: 0, // Unaffected by High German shift
      sv: 0,
      no: 0,
      da: 0,
      de: 32, // Huge proportion of German vocabulary altered
      nl: 8,
      en: 4,
    },
    specimens: [
      {
        protoOrOrigin: '*tīdiz (time / tide)',
        examples: { sv: 'tid', is: 'tíð', de: 'Zeit (t -> z)', nl: 'tijd', en: 'tide / time' },
        note: 'High German shifted initial /t/ to affricate /ts/ (written Z).',
      },
      {
        protoOrOrigin: '*pundą (pound / weight)',
        examples: { sv: 'pund', is: 'pund', de: 'Pfund (p -> pf)', nl: 'pond', en: 'pound' },
        note: 'High German shifted initial /p/ to affricate /pf/.',
      },
      {
        protoOrOrigin: '*etaną (to eat)',
        examples: { sv: 'äta', is: 'éta', de: 'essen (t -> ss)', nl: 'eten', en: 'eat' },
        note: 'Medial /t/ became double sibilant /ss/ in German.',
      },
    ],
  },
  {
    id: 'stratum-hanseatic',
    name: 'The Hanseatic / Middle Low German Silt',
    era: 'c. 1250 – 1550 CE',
    depthRank: 3,
    description: 'Massive mercantile language contact layer. Middle Low German (Lübeck trade lingua franca) flooded Scandinavia and the Low Countries.',
    linguisticSignificance: 'Created an artificial secondary bridge between North and West Germanic, injecting thousands of administrative, craft, and abstract words.',
    volumes: {
      is: 2,  // Icelandic famously shielded itself and purged trade loans
      sv: 28, // Up to 30% of standard Swedish vocabulary is Middle Low German!
      no: 27,
      da: 31,
      de: 12,
      nl: 18,
      en: 5,  // English had minimal Hanseatic contact compared to Scandinavia
    },
    specimens: [
      {
        protoOrOrigin: 'MLG betalen / betālen',
        examples: { sv: 'betala', da: 'betale', no: 'betale', is: 'borga (native)', de: 'bezahlen', nl: 'betalen', en: 'pay (Romance loan)' },
        note: 'Completely replaced the native Old Norse word *gjalda / borga in Mainland Scandinavia.',
      },
      {
        protoOrOrigin: 'MLG blīven (to remain)',
        examples: { sv: 'bliva / bli', da: 'blive', no: 'bli', is: 'verða (native)', de: 'bleiben', nl: 'blijven', en: 'remain (Romance loan)' },
        note: 'Suppplanted native *werþaną auxiliary in everyday Scandinavian speech.',
      },
      {
        protoOrOrigin: 'Prefixes be-, ge-, för- (ver-)',
        examples: { sv: 'beskriva, förstå', da: 'beskrive, forstå', is: 'lýsa, skilja (native)', de: 'beschreiben, verstehen', nl: 'beschrijven, verstaan', en: 'describe, understand' },
        note: 'Reshaped Scandinavian morphological derivation patterns completely.',
      },
    ],
  },
  {
    id: 'stratum-drift',
    name: 'Modern Semantic Drift & False Friend Divergence',
    era: 'c. 1500 – 1900 CE',
    depthRank: 4,
    description: 'Centuries of cultural separation where identical inherited forms drifted into contradictory or specialized meanings.',
    linguisticSignificance: 'The core subject matter of the False Friends Quiz: lexical deception hiding beneath morphological familiarity.',
    volumes: {
      is: 12,
      sv: 14,
      no: 13,
      da: 14,
      de: 15,
      nl: 16,
      en: 18,
    },
    specimens: [
      {
        protoOrOrigin: '*kunnaną (to know / can)',
        examples: { sv: 'känna (feel/know person)', de: 'kennen (know person)', nl: 'kennen', en: 'can (ability) / ken (archaic)' },
        note: 'Divergence between epistemic knowledge, mental acquaintance, and raw physical ability.',
      },
      {
        protoOrOrigin: '*tūnaz (enclosure -> town / garden)',
        examples: { sv: 'tun (farmyard enclosure)', is: 'tún (hayfield/home meadow)', de: 'Zaun (hedge, fence)', nl: 'tuin (garden)', en: 'town (urban settlement)' },
        note: 'From Celtic *dūnom (fort). Staggering semantic spread: English grew to city, German shrank to fence, Dutch became garden!',
      },
    ],
  },
  {
    id: 'stratum-romance',
    name: 'The Romance & Latinate Overburden',
    era: 'c. 1066 – 1800 CE',
    depthRank: 5,
    description: 'Post-Conquest Norman French, Church Latin, and Renaissance Greek academic borrowings deposited atop the Germanic core.',
    linguisticSignificance: 'English became a hybrid double-register language (Germanic concrete vs Latinate abstract). Icelandic near-zero via purism.',
    volumes: {
      is: 3,  // Strict linguistic purism replaced international loans with native coinages
      sv: 10, // French 18th century court loans (fåtölj, trottoar) + Latin
      no: 11,
      da: 10,
      de: 12,
      nl: 14,
      en: 58, // Almost 60% of total English lexicon is French/Latin!
    },
    specimens: [
      {
        protoOrOrigin: 'Law, Justice, Statecraft',
        examples: { sv: 'lag, rättvisa, domstol', is: 'lög, réttlæti, dómstóll', de: 'Gesetz, Gerechtigkeit, Gericht', nl: 'wet, gerechtigheid, rechtbank', en: 'law (Norse!), justice (French), court (French)' },
        note: 'English layered French terms over native Germanic concepts, creating the famous dual-register vocabulary.',
      },
      {
        protoOrOrigin: 'Meat vs Living Animal',
        examples: { sv: 'oxe / nötkött', is: 'uxi / nautakjöt', de: 'Rind / Rindfleisch', nl: 'rund / rundvlees', en: 'cow (Germanic) vs beef (Norman bœuf)' },
        note: 'Iconic English sociological register split between Saxon field labor and Norman dining tables.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// 3. Johannes Schmidt Wave Topography (Wellentheorie)
// ---------------------------------------------------------------------------

export interface IsoglossWave {
  id: string;
  name: string;
  historicalPeriod: string;
  epicenter: string;
  epicenterCoord: { x: number; y: number };
  radius: number; // visual propagation reach
  affectedLanguages: string[];
  marginalLanguages: string[];
  description: string;
  phonologicalRule: string;
  specimenPairs: { word: string; shifted: string; unshifted: string; note: string }[];
}

export const ISOGLOSS_WAVES: IsoglossWave[] = [
  {
    id: 'wave-high-german',
    name: 'Second (High German) Consonant Shift',
    historicalPeriod: 'c. 500 – 750 CE',
    epicenter: 'Alpine Highlands (Southern Germany / Austria / Switzerland)',
    epicenterCoord: { x: -35, y: 70 },
    radius: 55,
    affectedLanguages: ['de'],
    marginalLanguages: ['nl'],
    description: 'The monumental wave that severed High German from the remaining Germanic continuum. Voiceless stops became affricates or fricatives, halting at the Benrath Line (*maken* vs *machen*).',
    phonologicalRule: 'p -> pf / f,  t -> ts (z) / ss,  k -> ch,  d -> t',
    specimenPairs: [
      { word: 'apple / Apfel', shifted: 'Apfel (de)', unshifted: 'äpple (sv), æble (da), eple (no), epli (is), appel (nl), apple (en)', note: 'p -> pf initial shift' },
      { word: 'water / Wasser', shifted: 'Wasser (de)', unshifted: 'vatten (sv), vand (da), vann (no), vatn (is), water (nl), water (en)', note: 't -> ss medial shift' },
      { word: 'two / zwei', shifted: 'zwei / zwo (de)', unshifted: 'två (sv), to (da/no), tveir (is), twee (nl), two (en)', note: 't -> ts (z) initial affrication' },
    ],
  },
  {
    id: 'wave-ingvaeonic',
    name: 'Ingvaeonic (North Sea) Nasal Spirant Law',
    historicalPeriod: 'c. 400 – 600 CE',
    epicenter: 'North Sea Littoral (Frisia, Low Saxony, Eastern Britain)',
    epicenterCoord: { x: -40, y: 5 },
    radius: 48,
    affectedLanguages: ['en', 'nl'],
    marginalLanguages: ['de'],
    description: 'Nasal consonants (/m/, /n/) dropped before voiceless fricatives (/f/, /s/, /θ/), producing lengthening of the preceding vowel across Anglo-Frisian and Old Saxon.',
    phonologicalRule: 'V + [n,m] + [f,s,θ]  ->  V̄ + [f,s,θ]',
    specimenPairs: [
      { word: 'five / fünf', shifted: 'five (en), vijf (nl)', unshifted: 'fünf (de), fem (sv/da/no), fimm (is)', note: 'Loss of /n/ before /f/ with compensatory vowel lengthening' },
      { word: 'goose / Gans', shifted: 'goose (en), gans/does (nl)', unshifted: 'Gans (de), gås (sv/da/no), gæs (is)', note: 'Loss of /n/ before /s/' },
      { word: 'mouth / Mund', shifted: 'mouth (en), mond (nl - analogical)', unshifted: 'Mund (de), mun (sv/no/da), munnur (is)', note: 'Loss of /n/ before dental fricative /θ/' },
    ],
  },
  {
    id: 'wave-syncope',
    name: 'North Germanic Syncope & Vowel Fracture',
    historicalPeriod: 'c. 600 – 850 CE',
    epicenter: 'Scandinavia (Kattegat / Skagerrak)',
    epicenterCoord: { x: 35, y: -45 },
    radius: 52,
    affectedLanguages: ['sv', 'da', 'no', 'is'],
    marginalLanguages: [],
    description: 'Violent contraction wave that deleted short unaccented vowels in medial/final syllables and caused extensive u-umlaut and breaking, radically shortening Scandinavian headwords.',
    phonologicalRule: 'Unaccented V -> ∅; root vowels fracture before back vowels (e -> ja, io)',
    specimenPairs: [
      { word: 'arm / ear', shifted: 'arm, öra (sv), øre (da/no), eyra (is)', unshifted: 'Ohr (de), oor (nl), ear (en)', note: 'Diphthongal mutations and r-hotacism' },
      { word: 'heart / hjärta', shifted: 'hjärta (sv), hjerte (da/no), hjarta (is)', unshifted: 'Herz (de), hart (nl), heart (en)', note: 'Fracture of Proto-Germanic *hertô into /hj-/' },
    ],
  },
  {
    id: 'wave-clitic-article',
    name: 'Continental Scandinavian Postposed Definite Article',
    historicalPeriod: 'c. 900 – 1200 CE',
    epicenter: 'Central Scandinavia',
    epicenterCoord: { x: 35, y: -40 },
    radius: 46,
    affectedLanguages: ['sv', 'da', 'no', 'is'],
    marginalLanguages: [],
    description: 'The demonstrative pronoun *hinn fused onto the rear of nouns as an enclitic suffix (-en, -et, -na), creating a synthetic definite noun form unique to North Germanic.',
    phonologicalRule: 'Noun + *hinn  ->  Noun-en / Noun-et',
    specimenPairs: [
      { word: 'the house', shifted: 'huset (sv/da/no/is)', unshifted: 'das Haus (de), het huis (nl), the house (en)', note: 'Fused enclitic suffix vs West Germanic preposed independent article' },
      { word: 'the day', shifted: 'dagen (sv/da/no/is)', unshifted: 'der Tag (de), de dag (nl), the day (en)', note: 'Complete morphological divide across the Germanic family' },
    ],
  },
  {
    id: 'wave-hanseatic-trade',
    name: 'Middle Low German Mercantile Diffusion Wave',
    historicalPeriod: 'c. 1300 – 1550 CE',
    epicenter: 'Lübeck / Baltic Sea Coast',
    epicenterCoord: { x: -10, y: 5 },
    radius: 68,
    affectedLanguages: ['sv', 'da', 'no', 'nl'],
    marginalLanguages: ['de'],
    description: 'A socio-economic lexical tsunami. Hanseatic merchants dominated Nordic ports, forcing Low German vocabulary into every sector of Scandinavian urban life.',
    phonologicalRule: 'Direct lexical borrowing of prefixes (be-, ge-, för-), craft, trade, and legal terms',
    specimenPairs: [
      { word: 'to question / ask', shifted: 'fråga (sv), spørge (da), spørre (no)', unshifted: 'spørja (is - native), fragen (de), vragen (nl), ask (en)', note: 'Low German *vrāgen supplanted native Nordic *fregna' },
      { word: 'language / speech', shifted: 'språk (sv/no), sprog (da)', unshifted: 'tunga/mál (is - native), Sprache (de), spraak (nl), speech/language (en)', note: 'Low German *sprāke replaced native Nordic *mál' },
    ],
  },
];

// ---------------------------------------------------------------------------
// 4. Pairwise Mutual Friction & Intelligibility Matrix
// ---------------------------------------------------------------------------

export interface PairwiseCell {
  source: string;
  target: string;
  phoneticSim: number;       // 0 to 1
  orthographicSim: number;   // 0 to 1
  semanticSim: number;       // 0 to 1
  pairCount: number;
  falseFriendRatio: number;  // 0 to 1
  trueCognateRatio: number;  // 0 to 1
  riftIndex: number;         // |orthographicSim - phoneticSim| -> divergence gap
  asymmetryNote?: string;
}

export const PAIRWISE_FRICTION_MATRIX: PairwiseCell[] = [
  // Swedish comparisons
  { source: 'sv', target: 'da', phoneticSim: 0.62, orthographicSim: 0.89, semanticSim: 0.88, pairCount: 1840, falseFriendRatio: 0.12, trueCognateRatio: 0.68, riftIndex: 0.27, asymmetryNote: 'The classic Danish Rift: written text is near-transparent, but Danish glottal stød and vowel reduction severely impede acoustic recognition.' },
  { source: 'sv', target: 'no', phoneticSim: 0.86, orthographicSim: 0.84, semanticSim: 0.91, pairCount: 1920, falseFriendRatio: 0.08, trueCognateRatio: 0.76, riftIndex: 0.02, asymmetryNote: 'Highest mutual intelligibility in the Germanic family. Symmetric spoken and written transparency.' },
  { source: 'sv', target: 'is', phoneticSim: 0.44, orthographicSim: 0.58, semanticSim: 0.72, pairCount: 980, falseFriendRatio: 0.19, trueCognateRatio: 0.48, riftIndex: 0.14, asymmetryNote: 'Icelandic archaisms and purisms shield it from mainland Hanseatic loans, but bedrock strong verbs remain visible.' },
  { source: 'sv', target: 'de', phoneticSim: 0.58, orthographicSim: 0.64, semanticSim: 0.78, pairCount: 2150, falseFriendRatio: 0.24, trueCognateRatio: 0.42, riftIndex: 0.06, asymmetryNote: 'High semantic overlap due to shared Hanseatic layer, but riddled with deceptive false friends (*gift*, *rolig*, *art*, *semester*).' },
  { source: 'sv', target: 'nl', phoneticSim: 0.54, orthographicSim: 0.61, semanticSim: 0.75, pairCount: 1650, falseFriendRatio: 0.18, trueCognateRatio: 0.46, riftIndex: 0.07, asymmetryNote: 'Close lexical sisterhood mediated by Low German maritime terminology.' },
  { source: 'sv', target: 'en', phoneticSim: 0.48, orthographicSim: 0.52, semanticSim: 0.68, pairCount: 2450, falseFriendRatio: 0.21, trueCognateRatio: 0.38, riftIndex: 0.04, asymmetryNote: 'Bedrock cognates plus Danelaw Old Norse imports into Northern English.' },

  // Danish comparisons
  { source: 'da', target: 'no', phoneticSim: 0.72, orthographicSim: 0.93, semanticSim: 0.92, pairCount: 1980, falseFriendRatio: 0.07, trueCognateRatio: 0.81, riftIndex: 0.21, asymmetryNote: 'Bokmål is historically Dano-Norwegian; written forms are almost identical, while phonetics split along Norwegian musical pitch.' },
  { source: 'da', target: 'is', phoneticSim: 0.42, orthographicSim: 0.56, semanticSim: 0.70, pairCount: 940, falseFriendRatio: 0.17, trueCognateRatio: 0.46, riftIndex: 0.14 },
  { source: 'da', target: 'de', phoneticSim: 0.56, orthographicSim: 0.63, semanticSim: 0.76, pairCount: 2050, falseFriendRatio: 0.22, trueCognateRatio: 0.44, riftIndex: 0.07 },
  { source: 'da', target: 'nl', phoneticSim: 0.52, orthographicSim: 0.60, semanticSim: 0.74, pairCount: 1580, falseFriendRatio: 0.17, trueCognateRatio: 0.47, riftIndex: 0.08 },
  { source: 'da', target: 'en', phoneticSim: 0.47, orthographicSim: 0.51, semanticSim: 0.67, pairCount: 2380, falseFriendRatio: 0.19, trueCognateRatio: 0.39, riftIndex: 0.04 },

  // Norwegian comparisons
  { source: 'no', target: 'is', phoneticSim: 0.49, orthographicSim: 0.61, semanticSim: 0.74, pairCount: 1020, falseFriendRatio: 0.16, trueCognateRatio: 0.51, riftIndex: 0.12, asymmetryNote: 'Old Norse ancestor link: Western Norwegian dialects still mirror Icelandic phonology.' },
  { source: 'no', target: 'de', phoneticSim: 0.57, orthographicSim: 0.62, semanticSim: 0.77, pairCount: 2010, falseFriendRatio: 0.23, trueCognateRatio: 0.43, riftIndex: 0.05 },
  { source: 'no', target: 'nl', phoneticSim: 0.53, orthographicSim: 0.59, semanticSim: 0.73, pairCount: 1520, falseFriendRatio: 0.18, trueCognateRatio: 0.45, riftIndex: 0.06 },
  { source: 'no', target: 'en', phoneticSim: 0.49, orthographicSim: 0.53, semanticSim: 0.69, pairCount: 2400, falseFriendRatio: 0.20, trueCognateRatio: 0.40, riftIndex: 0.04 },

  // Icelandic comparisons
  { source: 'is', target: 'de', phoneticSim: 0.38, orthographicSim: 0.46, semanticSim: 0.62, pairCount: 880, falseFriendRatio: 0.25, trueCognateRatio: 0.35, riftIndex: 0.08, asymmetryNote: 'Archaic morphology parallels (4 cases, strong noun declensions) despite wide phonetic distance.' },
  { source: 'is', target: 'nl', phoneticSim: 0.36, orthographicSim: 0.44, semanticSim: 0.60, pairCount: 810, falseFriendRatio: 0.22, trueCognateRatio: 0.36, riftIndex: 0.08 },
  { source: 'is', target: 'en', phoneticSim: 0.39, orthographicSim: 0.43, semanticSim: 0.58, pairCount: 1100, falseFriendRatio: 0.26, trueCognateRatio: 0.32, riftIndex: 0.04 },

  // German comparisons
  { source: 'de', target: 'nl', phoneticSim: 0.74, orthographicSim: 0.78, semanticSim: 0.89, pairCount: 2600, falseFriendRatio: 0.28, trueCognateRatio: 0.58, riftIndex: 0.04, asymmetryNote: 'Highest mutual intelligibility in West Germanic, but the dense false-friend minefield (*bellen*, *monster*, *slim*, *zee/See*).' },
  { source: 'de', target: 'en', phoneticSim: 0.49, orthographicSim: 0.55, semanticSim: 0.66, pairCount: 2950, falseFriendRatio: 0.29, trueCognateRatio: 0.34, riftIndex: 0.06, asymmetryNote: 'Heaviest cognitive trap pair (*gift*, *become/bekommen*, *eventually/eventuell*, *aktuell/actual*).' },

  // Dutch comparisons
  { source: 'nl', target: 'en', phoneticSim: 0.61, orthographicSim: 0.64, semanticSim: 0.74, pairCount: 2700, falseFriendRatio: 0.22, trueCognateRatio: 0.47, riftIndex: 0.03, asymmetryNote: 'Dutch is the closest major relative to English after Frisian. High structural and lexical transparency.' },
];
