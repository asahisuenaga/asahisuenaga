window.i18n?.init();

const lightThemeAccent = ['#991b1b', '#b45309', '#c2410c', '#78350f', '#0f766e', '#166534', '#1d4ed8', '#4338ca', '#6b21a8', '#9d174d'];
const darkThemeAccent  = ['#f06271', '#f59e0b', '#f97316', '#d97706', '#2dd4bf', '#4ade80', '#38bdf8', '#818cf8', '#c084fc', '#f472b6'];
const accentColors = window.matchMedia('(prefers-color-scheme: dark)').matches ? darkThemeAccent : lightThemeAccent;
const root = document.documentElement;

const savedColor = localStorage.getItem('savedAccentColor');
if (savedColor) {
  root.style.setProperty('--accent', savedColor);
}

document.querySelector('.color-link')?.addEventListener('click', e => {
  e.preventDefault();
  // Exclude the active color so clicking always produces a visible change
  const cur = getComputedStyle(root).getPropertyValue('--accent').trim().toLowerCase();
  const pool = accentColors.filter(c => c.toLowerCase() !== cur);
  const nextColor = (pool.length ? pool : accentColors)[Math.floor(Math.random() * (pool.length || accentColors.length))];
  root.style.setProperty('--accent', nextColor);
  localStorage.setItem('savedAccentColor', nextColor);

  const target = e.currentTarget as HTMLElement | null;
  const dot = target?.querySelector<HTMLElement>('.color-dot');
  if (dot) {
    dot.animate([
      { transform: 'rotate(0deg) scale(1)', offset: 0 },
      { transform: 'rotate(180deg) scale(1.25)', offset: .5 },
      { transform: 'rotate(400deg) scale(.96)', offset: .8 },
      { transform: 'rotate(360deg) scale(1)', offset: 1 }
    ], {
      duration: 800,
      easing: 'cubic-bezier(.45, 0, .2, 1)'
    });
  }
});

// Invert Lottie colors for dark mode visibility
const lottie = document.querySelector<HTMLElement>('dotlottie-player');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const updateTheme = (isDark: boolean): void => {
    if (lottie) {
        lottie.style.filter = isDark ? 'invert(1)' : '';
    }
};
updateTheme(darkQuery.matches);
darkQuery.addEventListener('change', e => updateTheme(e.matches));

async function handleFooterFont() {
  const footers = document.querySelectorAll('.footer-wordmark');
  if (footers.length === 0) return;

  try {
    // Race font loading against a timeout so slow networks don't stall the UI state
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 3000)
    );

    const loadedFaces = await Promise.race([
      document.fonts.load('800 16px "Bricolage Grotesque"'),
      timeout
    ]);

    const isLoaded = (loadedFaces as FontFace[]).some((face) => face.status === 'loaded');
    footers.forEach((el) =>
      el.classList.add(isLoaded ? 'font-loaded' : 'font-failed')
    );
  } catch {
    footers.forEach((el) => el.classList.add('font-failed'));
  }
}

handleFooterFont();

export {};

declare global {
  interface Window {
    RightClickLogo?: typeof rightClickLogo;
  }
}

const rightClickLogo = {
      "version": 1,
      "brand": {
        "name": "Asahi Suenaga",
        "url": "https://asahisuenaga.com"
      },
      "logo": {
        "selector": "[data-rcl-logo]",
        "scope": "first"
      },
      "theme": "auto",
      "triggers": [
        "contextmenu",
        "longpress"
      ],
      "items": [
          {
              "type": "copy-svg",
              "label": "Copy logo (SVG)",
              "svg": "<svg version=\"1.0\" xmlns=\"http://www.w3.org/2000/svg\" width=\"500.000000pt\" height=\"500.000000pt\" viewBox=\"0 0 500.000000 500.000000\" preserveAspectRatio=\"xMidYMid meet\"> <style>@media (prefers-color-scheme: light) { .logo-path { fill: #1e1e1e; } } @media (prefers-color-scheme: dark) { .logo-path { fill: #FFFFFF; } } </style> <g transform=\"translate(0.000000,500.000000) scale(.100000,-.100000)\" stroke=\"none\"> <path class=\"logo-path\" d=\"M1210 4461 l-115 -6 -3 -454 c-1 -255 2 -459 7 -464 5 -5 44 6 92 26 143 58 539 177 654 196 28 4 122 22 210 39 340 65 551 81 851 63 268 -16 378 -34 522 -85 142 -51 212 -116 212 -198 0 -73 -103 -148 -250 -182 -85 -20 -373 -72 -475 -86 -69 -10 -187 -31 -395 -72 -100 -19 -509 -151 -650 -210 -254 -104 -419 -209 -589 -372 -126 -122 -194 -213 -277 -372 -113 -216 -168 -440 -167 -679 0 -232 55 -418 170 -579 45 -63 240 -256 279 -276 16 -8 47 -27 70 -42 40 -27 61 -36 204 -86 70 -25 86 -27 255 -27 169 0 184 2 255 27 131 46 170 64 245 111 37 23 200 171 227 207 162 209 281 489 359 840 41 189 136 415 206 495 47 52 123 101 171 109 123 19 235 -108 283 -323 23 -104 23 -175 4 -349 -18 -159 -52 -300 -107 -442 -42 -109 -177 -390 -213 -444 -58 -87 -77 -128 -64 -137 8 -5 229 -9 492 -9 l477 0 0 373 c-1 509 -21 786 -71 987 -45 180 -56 217 -91 294 -53 118 -103 188 -206 291 -122 122 -207 175 -313 195 -138 26 -319 -83 -446 -270 -41 -61 -91 -161 -152 -310 -66 -158 -119 -274 -149 -325 -13 -22 -33 -57 -46 -79 -37 -64 -144 -174 -210 -217 -278 -181 -610 -72 -702 230 -18 61 -18 284 0 373 35 164 172 369 331 494 28 21 52 41 55 44 27 27 304 170 330 170 5 0 49 15 97 34 87 33 247 84 478 151 251 74 422 129 484 157 35 15 69 28 75 28 18 0 158 95 208 141 49 46 85 94 118 159 15 29 20 59 20 117 0 69 -4 84 -32 133 -38 67 -138 168 -204 206 -27 15 -56 33 -64 40 -25 20 -208 99 -323 139 -280 96 -691 178 -1057 210 -197 18 -859 28 -1070 16z\" /> </g> </svg>"
          },
          {
              "type": "download",
              "label": "Download logo (SVG)",
              "src": "/assets/images/favicon.svg"
          },
          {
              "type": "download",
              "label": "Download lottie (JSON)",
              "src": "/assets/images/icon.json"
          }
      ]
};

window.RightClickLogo = rightClickLogo;