// Gürültü Haritası: bir alandaki ses kaynaklarından her noktadaki ses seviyesi.
// Basit model: açık alanda nokta kaynak, uzaklık iki katına çıkınca ses 6 dB düşer (ters kare yasası).
// Birden fazla kaynak enerji olarak toplanır (desibeller doğrudan toplanmaz!).

export const EN_YAKIN = 0.5;      // metre: kaynağın dibinde sonsuz ses çıkmasın

// 1 m'de L1 dB olan bir kaynağın r metredeki seviyesi
export function mesafede(L1, r) {
  return L1 - 20 * Math.log10(Math.max(r, EN_YAKIN));
}

// Desibelleri topla: 10·log10(Σ 10^(L/10))
export function topla(seviyeler) {
  const e = seviyeler.reduce((s, L) => s + (Number.isFinite(L) ? 10 ** (L / 10) : 0), 0);
  return e > 0 ? 10 * Math.log10(e) : -Infinity;
}

// Bir kaynağın bir noktada istenen seviyenin altına inmesi için en az uzaklık
export const gerekenMesafe = (L1, hedef) => 10 ** ((L1 - hedef) / 20);

const uzak = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Bir noktada toplam seviye ve her kaynağın payı
export function noktada(nokta, kaynaklar, arkaPlan = -Infinity) {
  const acik = kaynaklar.filter(k => k.acik !== false);
  const parcalar = acik.map(k => ({ kaynak: k, seviye: mesafede(k.db, uzak(nokta, k)) }));
  const toplam = topla([...parcalar.map(p => p.seviye), arkaPlan]);
  const enerji = 10 ** (toplam / 10);
  for (const p of parcalar) p.pay = enerji > 0 ? 10 ** (p.seviye / 10) / enerji : 0;
  parcalar.sort((a, b) => b.seviye - a.seviye);
  const arkaPay = Number.isFinite(arkaPlan) && enerji > 0 ? 10 ** (arkaPlan / 10) / enerji : 0;
  return { toplam, parcalar, baskin: parcalar[0] || null, arkaPay };
}

// Alanı ızgaraya böl, her hücrede seviye
export function izgara(alan, kaynaklar, arkaPlan = -Infinity, adim = 0.5) {
  const nx = Math.max(1, Math.round(alan.en / adim)), ny = Math.max(1, Math.round(alan.boy / adim));
  const deger = new Float32Array(nx * ny);
  let en = Infinity, enYer = null, ec = -Infinity;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const p = { x: (i + 0.5) * alan.en / nx, y: (j + 0.5) * alan.boy / ny };
    const L = noktada(p, kaynaklar, arkaPlan).toplam;
    deger[j * nx + i] = L;
    if (L < en) { en = L; enYer = p; }
    if (L > ec) ec = L;
  }
  return { nx, ny, deger, enSessiz: { ...enYer, seviye: en }, enYuksek: ec };
}

// Bir noktada istenen seviyenin altına inmek için baskın kaynağın kaç metre uzaklaşması lazım?
// Diğer kaynaklar yerinde kalırsa; o kaynak tamamen sussa bile yetmiyorsa null.
export function nekadarUzaklassin(nokta, kaynaklar, arkaPlan, hedef, kaynak) {
  const digerleri = kaynaklar.filter(k => k !== kaynak && k.acik !== false);
  const kalan = topla([...digerleri.map(k => mesafede(k.db, uzak(nokta, k))), arkaPlan]);
  if (kalan >= hedef) return null;
  // Kaynağın payı en fazla: 10^(hedef/10) − 10^(kalan/10)
  const izin = 10 * Math.log10(10 ** (hedef / 10) - (Number.isFinite(kalan) ? 10 ** (kalan / 10) : 0));
  const r = gerekenMesafe(kaynak.db, izin);
  return { mesafe: r, simdi: uzak(nokta, kaynak), ek: Math.max(0, r - uzak(nokta, kaynak)) };
}

// Kabaca ne kadar yüksek?
export const SEVIYELER = [
  { alt: 85, ad: 'Çok yüksek', ornek: 'uzun süre kalınırsa kulağa zarar verebilir', renk: '#c8322b' },
  { alt: 70, ad: 'Yüksek', ornek: 'elektrik süpürgesinin yanı gibi', renk: '#ff8a3d' },
  { alt: 60, ad: 'Rahatsız edici', ornek: 'yanında yüksek sesle konuşma', renk: '#ffcf3a' },
  { alt: 50, ad: 'Orta', ornek: 'sakin bir ofis', renk: '#b8e36b' },
  { alt: 40, ad: 'Sakin', ornek: 'kütüphane', renk: '#5fcf7a' },
  { alt: -Infinity, ad: 'Çok sessiz', ornek: 'fısıltı ve altı', renk: '#5fd7ff' },
];
export const seviyeAdi = L => SEVIYELER.find(s => L >= s.alt);

// Hazır kaynaklar: 1 metredeki yaklaşık ses seviyesi (dB)
export const HAZIR = [
  { tur: 'konusma', ad: 'Normal konuşma', db: 60, simge: '🗣️' },
  { tur: 'telefon', ad: 'Hoparlörden toplantı', db: 72, simge: '💻' },
  { tur: 'cocuk', ad: 'Bağırarak oynayan çocuklar', db: 82, simge: '🧒' },
  { tur: 'muzik', ad: 'Hoparlörde müzik', db: 85, simge: '🔊' },
  { tur: 'pompa', ad: 'Pompa / motor', db: 70, simge: '⚙️' },
  { tur: 'klima', ad: 'Klima dış ünitesi', db: 60, simge: '❄️' },
];

// --- Uydurma örnek: site havuzu ---
export const ORNEK = {
  alan: { en: 25, boy: 15, ad: 'Site havuzu' },
  arkaPlan: 40,
  hedef: 55,
  kaynaklar: [
    { id: 1, tur: 'telefon', ad: 'Hoparlörden toplantı', db: 72, x: 5, y: 4 },
    { id: 2, tur: 'cocuk', ad: 'Oynayan çocuklar', db: 76, x: 20, y: 12 },
    { id: 3, tur: 'pompa', ad: 'Pompa / motor', db: 70, x: 24, y: 1 },
    { id: 4, tur: 'konusma', ad: 'Normal konuşma', db: 60, x: 10, y: 13 },
  ],
  dinleyici: { x: 7, y: 6 },
};

export function yedekAl(v) { return JSON.stringify({ tur: 'gurultu-haritasi', surum: 1, ...v }, null, 2); }
export function yedekOku(metin) {
  const d = JSON.parse(metin);
  if (d?.tur !== 'gurultu-haritasi' || !Array.isArray(d.kaynaklar)) throw new Error('Bu dosya bir Gürültü Haritası yedeği değil.');
  const s = (x, a, b, v) => (typeof x === 'number' && Number.isFinite(x) && x >= a && x <= b ? x : v);
  const alan = { en: s(d.alan?.en, 2, 500, 25), boy: s(d.alan?.boy, 2, 500, 15), ad: String(d.alan?.ad || 'Alan').slice(0, 40) };
  return {
    alan,
    arkaPlan: s(d.arkaPlan, 0, 90, 40),
    hedef: s(d.hedef, 20, 100, 50),
    kaynaklar: d.kaynaklar.slice(0, 20).map((k, i) => ({
      id: i + 1, tur: HAZIR.some(h => h.tur === k?.tur) ? k.tur : 'konusma', ad: String(k?.ad || 'Kaynak').slice(0, 40),
      db: s(k?.db, 0, 140, 60), x: s(k?.x, 0, alan.en, alan.en / 2), y: s(k?.y, 0, alan.boy, alan.boy / 2), acik: k?.acik !== false,
    })),
    dinleyici: { x: s(d.dinleyici?.x, 0, alan.en, alan.en / 2), y: s(d.dinleyici?.y, 0, alan.boy, alan.boy / 2) },
  };
}
