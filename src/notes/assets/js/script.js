let lastSoundPlayedAt = 0;
const audioPool = {};

function playSound(file) {
    const now = Date.now();
    if (now - lastSoundPlayedAt < 150) return;
    lastSoundPlayedAt = now;

    if (!audioPool[file]) {
        audioPool[file] = new Audio(file);
    } else {
        audioPool[file].currentTime = 0;
    }
    audioPool[file].play().catch(() => { /* autoplay blocked */ });
}

function playBasicSound() {
    playSound('assets/sounds/basic.wav');
}

function playNotesSound() {
    playSound('assets/sounds/basic.wav');
}

document.addEventListener('pointerup', (e) => {
    if (!(e.target instanceof Element)) return;
    const target = e.target.closest('a, button, [role="button"]');
    if (target) { playBasicSound(); }
}, true);
