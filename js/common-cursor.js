(() => {
  // Crew-specific routes are the existing selection state; do not persist another selection.
  const root = document.documentElement;
  const scriptURL = document.currentScript.src;
  const crewRoute = /^(pigeon|rat|cat)-/.exec(location.pathname.split('/').pop());
  const scanner = document.querySelector('.scanner-canvas');
  const crew = crewRoute?.[1] || (scanner && (new URLSearchParams(location.search).get('crew') || scanner.dataset.crew));
  const name = ['pigeon', 'rat', 'cat'].includes(crew) ? crew : 'common';
  // Independently measured original tips:
  // common (3,3)/148×175, pigeon (88,63.5)/313×431,
  // rat (87,67)/385×418, cat (92,62.5)/349×439.
  // Rounded native cursor hotspots after proportional 40px resizing.
  const hotspots = { common: [1, 1], pigeon: [8, 6], rat: [8, 6], cat: [8, 6] };
  const source = new URL(`../assets/images/cursors/${name}-cursor-40.png`, scriptURL);
  const image = new Image();
  image.src = source.href;
  image.decode().then(() => {
    const [x, y] = hotspots[name];
    root.style.setProperty('--unwanted-cursor', `url("${source.href}") ${x} ${y}, auto`);
    root.dataset.unwantedCursor = name;
  }).catch(() => {
    // Leave existing native cursors intact if the image cannot be loaded.
    root.removeAttribute('data-unwanted-cursor');
    root.style.removeProperty('--unwanted-cursor');
  });
})();
