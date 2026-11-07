import { noktada, izgara, nekadarUzaklassin, seviyeAdi, HAZIR, ORNEK, yedekAl, yedekOku } from './core.mjs';

const $ = id => document.getElementById(id);
const ANAHTAR = 'gurultu-haritasi-v1';
let veri = structuredClone(ORNEK);

function kaydet() { try { localStorage.setItem(ANAHTAR, yedekAl(veri)); } catch { /* özel pencere */ } }
function yukle() { try { const m = localStorage.getItem(ANAHTAR); if (m) veri = yedekOku(m); } catch { /* bozuk */ } }

const kacama = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sayi = (n, d = 1) => n.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
const simge = tur => (HAZIR.find(h => h.tur === tur) || HAZIR[0]).simge;

// ---------- Renk ölçeği: 35 dB mavi -> 95 dB kırmızı ----------
const DURAKLAR = [[35, [40, 120, 160]], [45, [60, 190, 140]], [55, [170, 220, 90]], [65, [255, 207, 58]], [75, [255, 138, 61]], [85, [200, 50, 43]], [95, [120, 20, 40]]];
function renk(L) {
  if (!(L > DURAKLAR[0][0])) return DURAKLAR[0][1];
  for (let i = 1; i < DURAKLAR.length; i++) {
    const [a, ra] = DURAKLAR[i - 1], [b, rb] = DURAKLAR[i];
    if (L <= b) { const t = (L - a) / (b - a); return ra.map((v, k) => Math.round(v + (rb[k] - v) * t)); }
  }
  return DURAKLAR[DURAKLAR.length - 1][1];
}
$('olcek').innerHTML = Array.from({ length: 30 }, (_, i) => `<i style="background:rgb(${renk(35 + i * 2).join(',')})"></i>`).join('');
$('olcek').insertAdjacentHTML('afterend', '<div class="olcek-yazi"><span>35 dB</span><span>55</span><span>75</span><span>95 dB</span></div>');

// ---------- Plan çizimi ----------
const tuval = $('plan');
let olc = 1, sonIzgara = null;
const ekran = p => ({ x: p.x * olc, y: p.y * olc });
const alana = (cx, cy) => ({ x: Math.min(veri.alan.en, Math.max(0, cx / olc)), y: Math.min(veri.alan.boy, Math.max(0, cy / olc)) });

function planCiz() {
  const { en, boy } = veri.alan;
  // Tuvalin oranı alanın oranına uysun: geniş alanda 1000 px en, uzun alanda 800 px boy
  let W = 1000, H = Math.round(1000 * boy / en);
  if (H > 800) { H = 800; W = Math.max(320, Math.round(800 * en / boy)); }
  H = Math.max(240, H);
  if (tuval.width !== W || tuval.height !== H) { tuval.width = W; tuval.height = H; }
  olc = Math.min(W / en, H / boy);
  const g = tuval.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const adim = Math.max(en, boy) / 140;
  const iz = izgara(veri.alan, veri.kaynaklar, veri.arkaPlan, adim);
  sonIzgara = iz;
  // Isı haritası
  const resim = g.createImageData(iz.nx, iz.ny);
  for (let i = 0; i < iz.nx * iz.ny; i++) { const [r, gg, b] = renk(iz.deger[i]); resim.data.set([r, gg, b, 255], i * 4); }
  const ara = document.createElement('canvas'); ara.width = iz.nx; ara.height = iz.ny;
  ara.getContext('2d').putImageData(resim, 0, 0);
  g.imageSmoothingEnabled = true;
  g.drawImage(ara, 0, 0, en * olc, boy * olc);
  // Hedef sınırı: hedefin altıyla üstü arasındaki çizgi
  g.fillStyle = 'rgba(255,241,210,0.95)';
  const cw = en * olc / iz.nx, ch = boy * olc / iz.ny, h = veri.hedef;
  for (let j = 0; j < iz.ny; j++) for (let i = 0; i < iz.nx; i++) {
    const a = iz.deger[j * iz.nx + i] <= h;
    if (i + 1 < iz.nx && a !== (iz.deger[j * iz.nx + i + 1] <= h)) g.fillRect((i + 1) * cw - 1, j * ch, 2, ch);
    if (j + 1 < iz.ny && a !== (iz.deger[(j + 1) * iz.nx + i] <= h)) g.fillRect(i * cw, (j + 1) * ch - 1, cw, 2);
  }
  // Ölçek çubuğu
  const m = [1, 2, 5, 10, 20, 50, 100].find(x => x * olc > 70) || 100;
  const sx = en * olc - m * olc - 30;
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(sx, boy * olc - 34, m * olc + 20, 26);
  g.fillStyle = '#fff1d2'; g.fillRect(sx + 10, boy * olc - 18, m * olc, 4);
  g.font = '600 13px Rubik, sans-serif'; g.fillText(`${m} m`, sx + 10, boy * olc - 22);
  // En sessiz yer
  const es0 = ekran(iz.enSessiz);
  const es = { x: Math.min(en * olc - 16, Math.max(16, es0.x)), y: Math.min(boy * olc - 16, Math.max(16, es0.y)) };
  g.font = '24px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('⭐', es.x, es.y);
  // Kaynaklar
  for (const k of veri.kaynaklar) {
    const p = ekran(k);
    g.globalAlpha = k.acik === false ? 0.4 : 1;
    g.fillStyle = 'rgba(13,7,9,0.85)'; g.beginPath(); g.arc(p.x, p.y, 21, 0, 7); g.fill();
    g.strokeStyle = '#fff1d2'; g.lineWidth = 2; g.stroke();
    g.font = '22px sans-serif'; g.fillStyle = '#fff'; g.fillText(simge(k.tur), p.x, p.y + 1);
    g.font = '700 13px Rubik, sans-serif'; g.fillStyle = '#fff1d2';
    g.strokeStyle = '#0d0709'; g.lineWidth = 4; g.strokeText(`${k.db} dB`, p.x, p.y + 33); g.fillText(`${k.db} dB`, p.x, p.y + 33);
    g.globalAlpha = 1;
  }
  // Dinleyici
  const d = ekran(veri.dinleyici);
  g.fillStyle = '#fff1d2'; g.beginPath(); g.arc(d.x, d.y, 19, 0, 7); g.fill();
  g.font = '22px sans-serif'; g.fillText('🎧', d.x, d.y + 1);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';

  const sesiz = seviyeAdi(iz.enSessiz.seviye);
  $('planNot').innerHTML = `⭐ En sessiz yer: ${sayi(iz.enSessiz.seviye)} dB (${sesiz.ad.toLocaleLowerCase('tr')}). Beyaz çizgi ${veri.hedef} dB hedefimin sınırı; çizginin ${iz.enSessiz.seviye <= veri.hedef ? 'serin tarafı hedefin altında' : 'hiçbir yerinde hedefin altına inilemiyor'}.`;
  $('alanBaslik').textContent = `${veri.alan.ad} · ${veri.alan.en} × ${veri.alan.boy} m`;
}

// ---------- Dinleyici paneli ----------
function dinleCiz() {
  const n = noktada(veri.dinleyici, veri.kaynaklar, veri.arkaPlan);
  const s = seviyeAdi(n.toplam);
  let oneri = '';
  if (n.toplam <= veri.hedef) oneri = `<div class="oneri iyi">Burada ses ${veri.hedef} dB hedefimin altında. 👍</div>`;
  else if (n.baskin) {
    const u = nekadarUzaklassin(veri.dinleyici, veri.kaynaklar, veri.arkaPlan, veri.hedef, n.baskin.kaynak);
    oneri = u
      ? `<div class="oneri">Burada ${veri.hedef} dB için <b>${kacama(n.baskin.kaynak.ad)}</b> bana en az <b>${sayi(u.mesafe)} m</b> uzakta olmalı. Şimdi ${sayi(u.simdi)} m; yani <b>${sayi(u.ek)} m</b> daha uzaklaşmalı.</div>`
      : `<div class="oneri">${kacama(n.baskin.kaynak.ad)} tamamen sussa bile diğer sesler yüzünden burada ${veri.hedef} dB'in altına inilemiyor. Ya ben ⭐ tarafına gitmeliyim ya da başka kaynaklar da kısılmalı.</div>`;
  }
  const satirlar = n.parcalar.map(p => ({ ad: `${simge(p.kaynak.tur)} ${kacama(p.kaynak.ad)}`, db: p.seviye, pay: p.pay }));
  if (n.arkaPay > 0) satirlar.push({ ad: '🌫️ Arka plan', db: veri.arkaPlan, pay: n.arkaPay });
  satirlar.sort((a, b) => b.pay - a.pay);
  $('dinle').innerHTML = `<div class="dev" style="color:${s.renk}">${sayi(n.toplam)} <small>dB</small></div>
    <p class="seviye-ad" style="color:${s.renk}">${s.ad} <span class="not">— ${s.ornek}</span></p>
    <ul class="paylar">${satirlar.map(r => `<li><span>${r.ad}</span><span class="db">${sayi(r.db)} dB</span><span class="yuzde">%${Math.round(r.pay * 100)}</span><span class="bar"><i style="width:${r.pay * 100}%"></i></span></li>`).join('')}</ul>
    ${oneri}`;
}

// ---------- Kaynak listesi ----------
function kaynaklariCiz() {
  const ol = $('kaynaklar');
  ol.innerHTML = '';
  veri.kaynaklar.forEach((k, i) => {
    const li = document.createElement('li');
    li.className = k.acik === false ? 'kapali' : '';
    li.innerHTML = `<span class="simge">${simge(k.tur)}</span>
      <input maxlength="40" value="${kacama(k.ad)}" aria-label="${i + 1}. kaynağın adı">
      <input type="number" min="0" max="140" step="1" value="${k.db}" aria-label="${i + 1}. kaynağın 1 m'deki dB değeri">
      <input type="checkbox" ${k.acik === false ? '' : 'checked'} title="Açık mı?" aria-label="${i + 1}. kaynak açık">
      <button class="sil" aria-label="${i + 1}. kaynağı sil">×</button>`;
    const [ad, db, acik] = li.querySelectorAll('input');
    ad.oninput = () => { k.ad = ad.value.trim() || 'Kaynak'; kaydet(); dinleCiz(); };
    db.oninput = () => { const v = +db.value, iyi = db.value !== '' && v >= 0 && v <= 140; db.classList.toggle('hatali', !iyi); if (iyi) { k.db = v; kaydet(); hepsiniCiz(false); } };
    acik.onchange = () => { k.acik = acik.checked; li.className = k.acik ? '' : 'kapali'; kaydet(); hepsiniCiz(false); };
    li.querySelector('.sil').onclick = () => { veri.kaynaklar.splice(i, 1); kaydet(); hepsiniCiz(); };
    ol.append(li);
  });
}
$('yeniTur').innerHTML = HAZIR.map(h => `<option value="${h.tur}">${h.simge} ${h.ad} (${h.db} dB)</option>`).join('');
$('ekle').onclick = () => {
  if (veri.kaynaklar.length >= 20) return;
  const h = HAZIR.find(x => x.tur === $('yeniTur').value);
  veri.kaynaklar.push({ id: Date.now(), tur: h.tur, ad: h.ad, db: h.db, x: veri.alan.en / 2, y: veri.alan.boy / 2, acik: true });
  kaydet(); hepsiniCiz();
};

// ---------- Alan ayarları ----------
function alanDoldur() { $('en').value = veri.alan.en; $('boy').value = veri.alan.boy; $('arkaPlan').value = veri.arkaPlan; $('hedef').value = veri.hedef; }
for (const [id, alt, ust, yaz] of [['en', 2, 500, v => { veri.alan.en = v; }], ['boy', 2, 500, v => { veri.alan.boy = v; }], ['arkaPlan', 0, 90, v => { veri.arkaPlan = v; }], ['hedef', 20, 100, v => { veri.hedef = v; }]]) {
  $(id).oninput = () => {
    const v = +$(id).value, iyi = $(id).value !== '' && v >= alt && v <= ust;
    $(id).classList.toggle('hatali', !iyi);
    if (!iyi) return;
    yaz(v);
    // Alan küçülünce dışarıda kalanları içeri al
    for (const o of [...veri.kaynaklar, veri.dinleyici]) { o.x = Math.min(o.x, veri.alan.en); o.y = Math.min(o.y, veri.alan.boy); }
    kaydet(); hepsiniCiz(false);
  };
}

// ---------- Sürükleme ----------
let tutulan = null, bekleyen = false;
function tuvalNokta(e) {
  const r = tuval.getBoundingClientRect();
  return { x: (e.clientX - r.left) * tuval.width / r.width, y: (e.clientY - r.top) * tuval.height / r.height };
}
tuval.addEventListener('pointerdown', e => {
  const p = tuvalNokta(e);
  const adaylar = [{ o: veri.dinleyici }, ...veri.kaynaklar.map(k => ({ o: k }))];
  let en = null, enD = 34;
  for (const a of adaylar) { const s = ekran(a.o), d = Math.hypot(s.x - p.x, s.y - p.y); if (d < enD) { enD = d; en = a.o; } }
  if (!en) { const a = alana(p.x, p.y); veri.dinleyici.x = a.x; veri.dinleyici.y = a.y; en = veri.dinleyici; ciz(); }
  tutulan = en; tuval.setPointerCapture(e.pointerId); tuval.classList.add('tutuyor');
});
tuval.addEventListener('pointermove', e => {
  if (!tutulan) return;
  const p = tuvalNokta(e), a = alana(p.x, p.y);
  tutulan.x = Math.round(a.x * 10) / 10; tutulan.y = Math.round(a.y * 10) / 10;
  if (!bekleyen) { bekleyen = true; requestAnimationFrame(() => { bekleyen = false; ciz(); }); }
});
const birak = () => { if (tutulan) { tutulan = null; tuval.classList.remove('tutuyor'); kaydet(); } };
tuval.addEventListener('pointerup', birak);
tuval.addEventListener('pointercancel', birak);

// ---------- Hepsi ----------
function ciz() { planCiz(); dinleCiz(); }
function hepsiniCiz(liste = true) { if (liste) kaynaklariCiz(); ciz(); }

$('ornek').onclick = () => { veri = structuredClone(ORNEK); kaydet(); alanDoldur(); hepsiniCiz(); $('islemYazi').textContent = 'Örnek yüklendi. Kaynaklar ve yerleri uydurma.'; };
$('yedekAl').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([yedekAl(veri)], { type: 'application/json' }));
  a.download = 'gurultu-haritasi-yedek.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('yedekYukle').onchange = async ev => {
  const f = ev.target.files[0];
  if (!f) return;
  try { veri = yedekOku(await f.text()); kaydet(); alanDoldur(); hepsiniCiz(); $('islemYazi').textContent = `Yedek yüklendi: ${veri.kaynaklar.length} kaynak.`; }
  catch (err) { $('islemYazi').textContent = err instanceof SyntaxError ? 'Bu dosyayı okuyamadım.' : err.message; }
  ev.target.value = '';
};

if (!new URLSearchParams(location.search).has('ornek')) yukle();
alanDoldur();
hepsiniCiz();
