import assert from 'node:assert/strict';
import { EN_YAKIN, mesafede, topla, gerekenMesafe, noktada, izgara, nekadarUzaklassin, seviyeAdi, HAZIR, ORNEK, yedekAl, yedekOku } from './core.mjs';

let checks = 0;
const ok = fn => { fn(); checks++; };
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} ≠ ${b}`);

// 1. Ters kare yasası
ok(() => near(mesafede(70, 1), 70));
ok(() => near(mesafede(70, 2), 70 - 20 * Math.log10(2)));
ok(() => near(mesafede(70, 2) - mesafede(70, 4), 6.0206, 1e-4));    // her iki katında ~6 dB
ok(() => near(mesafede(70, 10), 50));                               // 10 kat uzakta 20 dB
ok(() => near(mesafede(70, 0), mesafede(70, EN_YAKIN)));            // dibinde sonsuz değil

// 2. Desibel toplama
ok(() => near(topla([60, 60]), 63.0103, 1e-4));                     // iki eşit kaynak: +3 dB
ok(() => near(topla(Array(10).fill(60)), 70, 1e-9));                 // on eşit kaynak: +10 dB
ok(() => near(topla([70, 50]), 70.0432, 1e-4));                     // 20 dB sessiz olan neredeyse fark etmez
ok(() => near(topla([65]), 65));
ok(() => assert.equal(topla([]), -Infinity));
ok(() => near(topla([60, -Infinity]), 60));
ok(() => assert.ok(topla([60, 60]) < 120));                          // desibeller doğrudan toplanmaz!

// 3. Gereken mesafe (mesafede'nin tersi)
ok(() => near(gerekenMesafe(70, 50), 10));
ok(() => near(mesafede(72, gerekenMesafe(72, 55)), 55));

// 4. Bir noktada
const k = [{ x: 0, y: 0, db: 70 }, { x: 10, y: 0, db: 70 }];
const orta = noktada({ x: 5, y: 0 }, k);
ok(() => near(orta.toplam, mesafede(70, 5) + 10 * Math.log10(2)));
ok(() => near(orta.parcalar[0].pay, 0.5));
ok(() => near(orta.parcalar.reduce((s, p) => s + p.pay, 0), 1));
const kapali = noktada({ x: 5, y: 0 }, [k[0], { ...k[1], acik: false }]);
ok(() => near(kapali.toplam, mesafede(70, 5)));
ok(() => assert.equal(kapali.parcalar.length, 1));
const arka = noktada({ x: 5, y: 0 }, [], 40);
ok(() => near(arka.toplam, 40));
ok(() => near(arka.arkaPay, 1));
ok(() => assert.equal(arka.baskin, null));

// 5. Izgara
const g = izgara({ en: 20, boy: 10 }, [{ x: 0, y: 0, db: 80 }], -Infinity, 1);
ok(() => assert.equal(g.nx, 20)); ok(() => assert.equal(g.ny, 10));
ok(() => near(g.enSessiz.x, 19.5)); ok(() => near(g.enSessiz.y, 9.5));     // kaynağa en uzak köşe
ok(() => near(g.enSessiz.seviye, mesafede(80, Math.hypot(19.5, 9.5))));
ok(() => near(g.enYuksek, mesafede(80, Math.hypot(0.5, 0.5))));
// İki eşit kaynak iki uçtaysa en sessiz yer tam ortası
const g2 = izgara({ en: 20, boy: 2 }, [{ x: 0, y: 1, db: 80 }, { x: 20, y: 1, db: 80 }], -Infinity, 0.5);
ok(() => near(g2.enSessiz.x, 10, 0.5));

// 6. Ne kadar uzaklaşmalı?
const o = ORNEK;
const n = noktada(o.dinleyici, o.kaynaklar, o.arkaPlan);
ok(() => assert.equal(n.baskin.kaynak.tur, 'telefon'));
ok(() => assert.ok(n.baskin.pay > 0.8));
const u = nekadarUzaklassin(o.dinleyici, o.kaynaklar, o.arkaPlan, o.hedef, n.baskin.kaynak);
ok(() => assert.ok(u && u.ek > 0));
// O uzaklığa taşınınca seviye tam hedefe iniyor
const yeni = o.kaynaklar.map(x => (x === n.baskin.kaynak ? { ...x, x: o.dinleyici.x + u.mesafe, y: o.dinleyici.y } : x));
ok(() => near(noktada(o.dinleyici, yeni, o.arkaPlan).toplam, o.hedef, 1e-6));
// Diğerleri zaten hedefin üstündeyse: o kaynak sussa bile yetmez
ok(() => assert.equal(nekadarUzaklassin(o.dinleyici, o.kaynaklar, o.arkaPlan, 45, n.baskin.kaynak), null));

// 7. Seviye adları
ok(() => assert.equal(seviyeAdi(90).ad, 'Çok yüksek'));
ok(() => assert.equal(seviyeAdi(63).ad, 'Rahatsız edici'));
ok(() => assert.equal(seviyeAdi(35).ad, 'Çok sessiz'));
ok(() => assert.ok(HAZIR.every(h => h.db > 0 && h.simge)));

// 8. Yedek
const y = yedekOku(yedekAl(ORNEK));
ok(() => assert.equal(y.kaynaklar.length, 4));
ok(() => assert.deepEqual(y.dinleyici, ORNEK.dinleyici));
ok(() => assert.throws(() => yedekOku('{"tur":"x"}')));
const bozuk = yedekOku(JSON.stringify({ tur: 'gurultu-haritasi', alan: { en: 10, boy: 10 }, kaynaklar: [{ db: 999, x: 50, y: -3, tur: 'yok' }] }));
ok(() => assert.equal(bozuk.kaynaklar[0].db, 60));
ok(() => assert.equal(bozuk.kaynaklar[0].x, 5));
ok(() => assert.equal(bozuk.kaynaklar[0].tur, 'konusma'));

console.log(`${checks} kontrol geçti.`);
