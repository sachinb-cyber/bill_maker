const MD = [31,28,31,30,31,30,31,31,30,31,30,31];
const MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const FS = [4.1,4.2,4.3,4.4,4.5,4.6,4.7,4.8,4.9];

function sRng(seed) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xFFFFFFFF; };
}

function calcAmt(l, fat) {
  return Math.round(l * (fat * 5 + 22.5) * 100) / 100;
}

function mkBillId(code, mi, yr) {
  const base = code + String(mi + 1).padStart(2, '0') + yr;
  let h = 5381;
  for (const c of base) h = ((h << 5) + h) + c.charCodeAt(0);
  return `DMS-${code}-${String(mi + 1).padStart(2, '0')}${yr}-${Math.abs(h).toString(16).toUpperCase().slice(0, 4)}`;
}

function generateMonth(mi, yr, cfg) {
  const { lMin, lMax, fMin, fMax, target } = cfg;
  const days = MD[mi];
  const vF = FS.filter(f => f >= fMin - 0.005 && f <= fMax + 0.005);
  if (!vF.length) vF.push(4.5);
  const seed = (parseInt(yr) * 1000 + mi + 1) * 7919 + (mi + 1) * 31337;
  const rng = sRng(seed);

  let recs = [];
  for (let d = 1; d <= days; d++) {
    for (const sh of ['M', 'E']) {
      const l = Math.round((lMin + rng() * (lMax - lMin)) * 10) / 10;
      const fat = vF[Math.floor(rng() * vF.length)];
      recs.push({ day: d, shift: sh, litre: l, fat, amount: calcAmt(l, fat) });
    }
  }

  // Scale to target
  const raw = recs.reduce((s, r) => s + r.amount, 0);
  const scale = target / raw;
  recs.forEach(r => {
    let nl = Math.round(r.litre * scale * 10) / 10;
    nl = Math.max(lMin * 0.88, Math.min(lMax * 1.12, nl));
    r.litre = nl; r.amount = calcAmt(nl, r.fat);
  });

  // Uniqueness nudge
  const seen = new Set();
  recs.forEach(r => {
    const rng2 = sRng(seed + r.day * 200 + r.shift.charCodeAt(0));
    let key = `${r.day}${r.shift}${r.litre}${r.fat}`;
    let t = 0;
    while (seen.has(key) && t < 20) {
      r.litre = Math.round((r.litre + (rng2() > 0.5 ? 0.1 : -0.1)) * 10) / 10;
      r.litre = Math.max(lMin * 0.88, Math.min(lMax * 1.12, r.litre));
      r.amount = calcAmt(r.litre, r.fat);
      key = `${r.day}${r.shift}${r.litre}${r.fat}`; t++;
    }
    seen.add(key);
  });

  const tL = Math.round(recs.reduce((s, r) => s + r.litre, 0) * 10) / 10;
  const aF = Math.round(recs.reduce((s, r) => s + r.fat, 0) / recs.length * 10) / 10;
  const tA = Math.round(recs.reduce((s, r) => s + r.amount, 0) * 100) / 100;
  return { records: recs, totalEntries: recs.length, totalLitre: tL, avgFat: aF, totalAmount: tA, days };
}

module.exports = { generateMonth, mkBillId, calcAmt, MN, MD };
