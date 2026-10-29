/* Seeded decoration keeps the galaxy composition stable on every visit.
   Only the floating stars and the flame animate; the cake stays still. */
(() => {
  'use strict';
  const ns = 'http://www.w3.org/2000/svg';
  const colors = ['#ffe578', '#ffcc38', '#78dcff', '#238dec', '#f886ce', '#fff6ed', '#f74261', '#62e0cf'];
  let seed = 713;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const between = (min, max) => min + random() * (max - min);
  function element(tag, attributes) {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }
  function fleck(parent, x, y, size, color, shape = random()) {
    const group = element('g', { transform: `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${between(-40, 40).toFixed(1)})` });
    if (shape > .82) {
      group.append(element('use', { href: '#star', fill: color, transform: `scale(${size / 5})` }));
    } else if (shape > .64) {
      group.append(element('rect', { x: -size / 2, y: -size, width: size, height: size * 1.6, rx: size * .18, fill: color }));
    } else {
      group.append(element('circle', { r: size * .58, fill: color }));
    }
    parent.append(group);
    return group;
  }
  const dome = document.getElementById('dome-stars');
  for (let i = 0; i < 118; i++) {
    // Uniform elliptical sampling avoids a rectangular particle cloud.
    const angle = between(0, Math.PI * 2);
    const radius = Math.sqrt(random()) * .94;
    const x = 300 + Math.cos(angle) * 224 * radius;
    const y = 278 + Math.sin(angle) * 222 * radius;
    const drift = element('g', { class: 'drifting-star' });
    drift.style.cssText = `--duration:${between(6, 13)}s;--delay:-${between(0, 14)}s;--dx:${between(-6, 6)}px;--dy:${between(-9, 3)}px`;
    const star = fleck(drift, x, y, i < 22 ? between(3.5, 7) : between(.6, 2.6), colors[i % colors.length]);
    star.classList.add('twinkle');
    star.style.cssText = `--twinkle-duration:${between(1.8, 4.6)}s;--delay:-${between(0, 9)}s`;
    dome.append(drift);
  }
  const top = document.getElementById('top-confetti');
  for (let i = 0; i < 330; i++) {
    const angle = between(0, Math.PI * 2);
    const radius = Math.sqrt(random());
    fleck(top, 300 + Math.cos(angle) * 150 * radius, 336 + Math.sin(angle) * 49 * radius, between(1.2, 5.7), colors[i % colors.length]);
  }
  const side = document.getElementById('side-confetti');
  for (let i = 0; i < 230; i++) {
    const x = between(151, 449);
    const y = between(348, 527);
    // Keep the small birthday lettering legible.
    if (x > 258 && x < 383 && y > 430 && y < 475) continue;
    fleck(side, x, y, random() > .93 ? between(5, 10) : between(.5, 2.6), colors[i % colors.length]);
  }
  const plate = document.getElementById('plate-confetti');
  for (let i = 0; i < 65; i++) {
    const angle = between(0, Math.PI * 2);
    const radius = between(.8, .96);
    fleck(plate, 300 + Math.cos(angle) * 203 * radius, 500 + Math.sin(angle) * 65 * radius, between(.8, 3.5), colors[i % colors.length]);
  }
  const foreground = document.getElementById('foreground-stars');
  // Larger glints echo the hand-scattered stars in the reference.
  const accents = [
    [155, 184, 11, '#ffe34c'], [415, 211, 13, '#ffdcf0'],
    [120, 312, 10, '#ffda4c'], [457, 411, 13, '#ffe478'],
    [383, 404, 12, '#ffe147'], [266, 403, 8, '#ffefff'],
    [195, 242, 9, '#73ceff'], [442, 256, 8, '#f93250'],
    [423, 70, 7, '#ffe77d'], [231, 482, 7, '#ed51a4'],
    [409, 535, 6, '#ffe575'], [315, 577, 5, '#ecc46a'],
  ];
  for (const [x, y, size, color] of accents) fleck(foreground, x, y, size, color, 1);
  for (const [x, y, r] of [[203, 121, 5.5], [411, 137, 7], [224, 474, 10]]) {
    foreground.append(element('circle', { cx: x, cy: y, r: r * 1.8, fill: '#7d9dff', opacity: '.55', filter: 'url(#soft-glow)' }));
    foreground.append(element('circle', { cx: x, cy: y, r, fill: '#f9fcff' }));
  }
})();
