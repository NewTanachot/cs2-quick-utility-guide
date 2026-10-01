export const SITE_ZONES = ["A-Site", "B-Site", "Mid"];

const B_PATTERNS = [
  /\bb[\s-]?site\b/i,
  /\bb window\b/i,
  /\bb door\b/i,
  /\bb tunnel\b/i,
  /\bb execute\b/i,
  /\bb lane\b/i,
  /\bb ramp\b/i,
  /banana/i,
  /market/i,
  /coffin/i,
  /\bcave\b/i,
  /sandwich/i,
  /camera\s*&\s*z/i,
  /z\/connector/i,
  /dumpster/i,
  /ivy\b/i,
  /outside b/i,
];

const A_PATTERNS = [
  /\ba[\s-]?site\b/i,
  /palace/i,
  /jungle/i,
  /\bstairs\b/i,
  /ticket/i,
  /temple/i,
  /heaven smoke/i,
  /long cross/i,
  /long corner/i,
  /additional a/i,
  /archer/i,
  /get.?right/i,
  /ct\s*&\s*donut/i,
  /deep donut/i,
  /rail smoke/i,
  /a execute/i,
  /apps/i,
  /pit\b/i,
  /moto/i,
  /library/i,
  /arch\b/i,
];

const MID_PATTERNS = [
  /\bmid\b/i,
  /\bspawn\b/i,
  /window/i,
  /connector/i,
  /xbox/i,
  /red room/i,
  /elbow/i,
  /mid door/i,
  /giant door/i,
  /smoke wall/i,
  /\bcross\b/i,
  /locker/i,
  /garage/i,
  /outside(?! b)/i,
  /main split/i,
  /main smoke/i,
  /bathroom/i,
  /instant red/i,
  /jaguar/i,
  /donut smoke/i,
  /mid donut/i,
  /cat\/short/i,
  /chopper/i,
  /ct.*middle/i,
  /top con/i,
  /inferno.*meta/i,
];

/**
 * @param {{ area?: string, name?: string, zone?: string }} smoke
 */
export function getSmokeZone(smoke) {
  if (smoke.zone && SITE_ZONES.includes(smoke.zone)) {
    return smoke.zone;
  }

  const area = (smoke.area || "").trim();
  const areaL = area.toLowerCase();
  const text = `${area} ${smoke.name || ""}`;

  if (/b[\s-]?site/i.test(area) || areaL === "banana") return "B-Site";
  if (/a[\s-]?site/i.test(area)) return "A-Site";
  if (areaL === "mid" || areaL === "spawn") return "Mid";

  const score = (patterns) =>
    patterns.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);

  const b = score(B_PATTERNS);
  const a = score(A_PATTERNS);
  const m = score(MID_PATTERNS);

  const best = Math.max(b, a, m);
  if (best === 0) return "Mid";
  if (b === best && b >= a && b >= m) return "B-Site";
  if (a === best && a >= b && a >= m) return "A-Site";
  return "Mid";
}
