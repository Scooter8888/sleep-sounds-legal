/*
 * guidance.js — paralēlās braukšanas ģeometrija (tīras funkcijas, bez DOM).
 *
 * Koordinātas: lokāla plakne metros, x = austrumi, y = ziemeļi.
 * Kurss (heading): grādi no ziemeļiem pulksteņrādītāja virzienā (0 = N, 90 = E).
 * Līnija: { ax, ay, bx, by } — A un B punkts lokālajā plaknē.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Guidance = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEG = Math.PI / 180;
  var WGS_A = 6378137.0;
  var WGS_F = 1 / 298.257223563;
  var WGS_E2 = WGS_F * (2 - WGS_F);

  function llaToEcef(lat, lon) {
    var sLat = Math.sin(lat * DEG), cLat = Math.cos(lat * DEG);
    var sLon = Math.sin(lon * DEG), cLon = Math.cos(lon * DEG);
    var n = WGS_A / Math.sqrt(1 - WGS_E2 * sLat * sLat);
    return { x: n * cLat * cLon, y: n * cLat * sLon, z: n * (1 - WGS_E2) * sLat };
  }

  /**
   * Lokāla ENU (east/north) plakne ap sākumpunktu (lat0, lon0).
   * Lauka mērogā (daži km) kļūda ir centimetru līmenī.
   */
  function makeProjection(lat0, lon0) {
    var o = llaToEcef(lat0, lon0);
    var sLat = Math.sin(lat0 * DEG), cLat = Math.cos(lat0 * DEG);
    var sLon = Math.sin(lon0 * DEG), cLon = Math.cos(lon0 * DEG);
    return {
      lat0: lat0,
      lon0: lon0,
      toXY: function (lat, lon) {
        var p = llaToEcef(lat, lon);
        var dx = p.x - o.x, dy = p.y - o.y, dz = p.z - o.z;
        return {
          x: -sLon * dx + cLon * dy,
          y: -sLat * cLon * dx - sLat * sLon * dy + cLat * dz
        };
      }
    };
  }

  function bearing(from, to) {
    return (Math.atan2(to.x - from.x, to.y - from.y) / DEG + 360) % 360;
  }

  function headingVector(deg) {
    return { x: Math.sin(deg * DEG), y: Math.cos(deg * DEG) };
  }

  /** Īsākā leņķa starpība no a uz b, diapazonā (-180, 180]. */
  function angleDiff(a, b) {
    return ((b - a + 540) % 360) - 180;
  }

  /** Eksponenciāla kursa izlīdzināšana, ņemot vērā 0/360 pāreju. */
  function smoothHeading(prev, next, alpha) {
    if (prev == null) return next;
    return (prev + alpha * angleDiff(prev, next) + 360) % 360;
  }

  function lineFromAB(a, b) {
    return { ax: a.x, ay: a.y, bx: b.x, by: b.y };
  }

  function lineFromHeading(a, headingDeg, length) {
    var v = headingVector(headingDeg);
    var L = length || 100;
    return { ax: a.x, ay: a.y, bx: a.x + v.x * L, by: a.y + v.y * L };
  }

  /** Līnijas virziena vektors, kreisā normāle, garums un kurss. */
  function lineFrame(line) {
    var dx = line.bx - line.ax, dy = line.by - line.ay;
    var len = Math.hypot(dx, dy);
    if (!(len > 0)) return null;
    var dir = { x: dx / len, y: dy / len };
    return {
      dir: dir,
      normal: { x: -dir.y, y: dir.x }, // pa kreisi no AB virziena
      length: len,
      headingDeg: bearing({ x: line.ax, y: line.ay }, { x: line.bx, y: line.by })
    };
  }

  /**
   * Aprēķina novirzi no tuvākās paralēlās joslas.
   *
   * Atgriež:
   *   off       — sānu nobīde no AB līnijas (m, + = pa kreisi no AB virziena)
   *   along     — attālums gar līniju no A (m)
   *   lineIndex — tuvākās joslas numurs (0 = AB, +1 pa kreisi, -1 pa labi no AB virziena)
   *   xteAB     — novirze no joslas centra AB koordinātās (m)
   *   forward   — vai traktors brauc AB virzienā
   *   xte       — novirze braukšanas virzienā: + = traktors ir pa kreisi no joslas
   *               (jāstūrē pa labi), - = pa labi no joslas (jāstūrē pa kreisi)
   */
  function computeGuidance(line, pos, headingDeg, width) {
    var f = lineFrame(line);
    if (!f || !(width > 0)) return null;
    var rx = pos.x - line.ax, ry = pos.y - line.ay;
    var off = rx * f.normal.x + ry * f.normal.y;
    var along = rx * f.dir.x + ry * f.dir.y;
    var k = Math.round(off / width);
    var xteAB = off - k * width;
    var forward = true;
    if (headingDeg != null) {
      var h = headingVector(headingDeg);
      forward = (h.x * f.dir.x + h.y * f.dir.y) >= 0;
    }
    return {
      off: off,
      along: along,
      lineIndex: k,
      xteAB: xteAB,
      xte: forward ? xteAB : -xteAB,
      forward: forward,
      frame: f
    };
  }

  /** Pabīda līniju perpendikulāri (+ = pa kreisi no AB virziena). */
  function nudgeLine(line, meters) {
    var f = lineFrame(line);
    if (!f) return line;
    return {
      ax: line.ax + f.normal.x * meters,
      ay: line.ay + f.normal.y * meters,
      bx: line.bx + f.normal.x * meters,
      by: line.by + f.normal.y * meters
    };
  }

  /** Joslu numuru diapazons, kas redzams rādiusā `radius` ap pozīciju ar nobīdi `off`. */
  function visibleLineRange(off, radius, width, maxLines) {
    var min = Math.ceil((off - radius) / width);
    var max = Math.floor((off + radius) / width);
    var limit = maxLines || 400;
    if (max - min + 1 > limit) {
      var c = Math.round(off / width);
      min = c - Math.floor(limit / 2);
      max = min + limit - 1;
    }
    return { min: min, max: max };
  }

  /** Pārklājuma gājienu kopējais garums (m). Gājiens = [[x, y], ...]. */
  function runsLength(runs) {
    var total = 0;
    for (var r = 0; r < runs.length; r++) {
      var run = runs[r];
      for (var i = 1; i < run.length; i++) {
        total += Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]);
      }
    }
    return total;
  }

  /** Aptuvena apstrādātā platība (m²), pārklāšanās netiek atskaitīta. */
  function runsArea(runs, width) {
    return runsLength(runs) * width;
  }

  /** "Skaists" mēroga joslas garums metros, lai tā būtu ap `targetPx` pikseļiem. */
  function niceScaleLength(pxPerMeter, targetPx) {
    var steps = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    var want = targetPx / pxPerMeter;
    var best = steps[0];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] <= want) best = steps[i];
    }
    return best;
  }

  return {
    DEG: DEG,
    llaToEcef: llaToEcef,
    makeProjection: makeProjection,
    bearing: bearing,
    headingVector: headingVector,
    angleDiff: angleDiff,
    smoothHeading: smoothHeading,
    lineFromAB: lineFromAB,
    lineFromHeading: lineFromHeading,
    lineFrame: lineFrame,
    computeGuidance: computeGuidance,
    nudgeLine: nudgeLine,
    visibleLineRange: visibleLineRange,
    runsLength: runsLength,
    runsArea: runsArea,
    niceScaleLength: niceScaleLength
  };
});
