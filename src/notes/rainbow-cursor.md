---
title: 🌈 Rainbow Cursor for Google Docs
folder: Projects
date: 2026-03-19T19:20
permalink: /notes/rainbow-cursor
pinned: false
---
<p>If you want to skip the reading and give your cursor the <span style="background: linear-gradient(to right, #ffb6c1, #ff69b4, #da70d6, #9370db, #48c9b0, #f0e68c, #ffd700); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">colorful vibrance</span> it needs, <a href="https://chromewebstore.google.com/detail/rainbow-cursor-in-google/nnmghknojpihdnofejbocdcnmhibkfdc" style="color:#eab308; text-decoration: underline;">install it on the Chrome Web Store.</a></p>
<h3>What it is</h3>
<p>Rainbow Cursor is a browser extension that manipulates the cursor in Google Docs into creating a visible gradient. You can change the gradient colors, the cursor thickness, kill the cursor blink, turn on typewriter animation, or make the cursor translucent. That's the entire extension. No bloated features, no hidden trackers, and no unnecessary configuration screens.</p>

<h3>Why</h3>
<p>Historically, there was an extension that had only one color. I built a new extension because I wanted to fully personalize my caret. I thought that users shouldn't be constrained to the gradient that the developer set. So I built the perfect solution. If you're going to stare at a blinking line for hours while writing, coding, or taking notes, you should at least enjoy looking at it.</p>

<h3>How</h3>
<p>Google Docs doesn't render the caret like other places on the internet. It's actually a div element called 'kix-cursor' that you can manipulate. Because Google Docs uses a custom-built rendering engine instead of standard HTML text areas, a typical CSS override won't cut it. By targeting that specific DOM element, the extension injects custom CSS properties directly into the Google Docs interface.</p>

<h3>What I learned</h3>
<p>I learned how to make a browser extension and publish an item on the Chrome Web Store. Beyond the basics, I got a crash course in reverse-engineering proprietary DOM structures, managing extension state, and navigating Google's developer dashboard. Figuring out how to efficiently manipulate real-time web elements without lagging the browser taught me a ton about optimization.</p>