(() => {
  /**
   * The 8x8 Bayer matrix, normalized to thresholds between 0 and 1.
   */
  const BAYER8 = Float64Array.from(
    Int8Array.of(
      0, 32, 8, 40, 2, 34, 10, 42,
      48, 16, 56, 24, 50, 18, 58, 26,
      12, 44, 4, 36, 14, 46, 6, 38,
      60, 28, 52, 20, 62, 30, 54, 22,
      3, 35, 11, 43, 1, 33, 9, 41,
      51, 19, 59, 27, 49, 17, 57, 25,
      15, 47, 7, 39, 13, 45, 5, 37,
      63, 31, 55, 23, 61, 29, 53, 21
    ),
    value => (value + .5) / 64
  )

  let probe = null
  const colorCache = new Map()

  /**
   * Returns the 8x8 Bayer threshold for a cell.
   */
  function bayer(x: number, y: number): number {
    return BAYER8.at((y & 7) * 8 + (x & 7)) ?? 0;
  }

  /**
   * Returns the cell size in CSS pixels, snapped to whole device pixels so cells stay sharp.
   */
  function cellSize(base = 1.5) {
    const ratio = window.devicePixelRatio ?? 1
    return Math.max(1, Math.round(base * ratio)) / ratio
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }

  /**
   * Resolves a CSS custom property without DOM mutations, cached per theme.
   */
  function readColor(element: HTMLElement, property: string): Uint8ClampedArray {
    const raw = getComputedStyle(element).getPropertyValue(property).trim() || "#000"
    const scheme = getComputedStyle(element).colorScheme || "normal"
    const cacheKey = `${scheme}|${raw}`

    const cached = colorCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Temporarily resolve light-dark() / var() via a non-inherited property on the live element
    const prev = element.style.accentColor;
    element.style.accentColor = `var(${property})`;
    const resolved = getComputedStyle(element).accentColor || raw;
    element.style.accentColor = prev;

    probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true })
    if (!probe) {
      return Uint8ClampedArray.of(0, 0, 0, 255)
    }

    probe.fillStyle = "#000"
    probe.fillStyle = resolved
    probe.fillRect(0, 0, 1, 1)

    const d = probe.getImageData(0, 0, 1, 1).data
    const rgba = Uint8ClampedArray.of(d.at(0), d.at(1), d.at(2), 255)
    colorCache.set(cacheKey, rgba)
    return rgba
  }

  /**
   * Blends two colors, where an amount of 0 returns the first and 1 returns the second.
   */
  function mix(from: Uint8ClampedArray, to: Uint8ClampedArray, amount: number): Uint8ClampedArray {
    return Uint8ClampedArray.of(
      Math.round((from[0] ?? 0) + ((to[0] ?? 0) - (from[0] ?? 0)) * amount),
      Math.round((from[1] ?? 0) + ((to[1] ?? 0) - (from[1] ?? 0)) * amount),
      Math.round((from[2] ?? 0) + ((to[2] ?? 0) - (from[2] ?? 0)) * amount),
      255
    );
  }

  function onThemeChange(callback: () => void): () => void {
      const handle = () => {
      requestAnimationFrame(() => {
        colorCache.clear()
        callback()
      })
    }

    const observer = new MutationObserver(handle)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    })

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    media.addEventListener("change", handle)

    return () => {
      observer.disconnect()
      media.removeEventListener("change", handle)
    }
  }

  function animateProgress(duration: number, onFrame: (progress: number) => void): () => void{
    if (prefersReducedMotion()) {
      onFrame(1)
      return () => {}
    }

    const start = performance.now()
    let frame = 0

    function tick(now: number): void {
      const elapsed = Math.min(1, (now - start) / duration)
      onFrame(1 - (1 - elapsed) ** 3)

      if (elapsed < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }

  function paint(data: Uint8ClampedArray, offset: number, color: Uint8ClampedArray): void {
    data.set(color, offset)
  }

  interface LineBox {
    left: number;
    right: number;
    top: number;
    bottom: number;
  }

  class DitherLine extends HTMLElement {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D | null;
    from: Uint8ClampedArray;
    to: Uint8ClampedArray;
    progress: number;
    lines: LineBox[];
    image: ImageData | null;
    cleanup: Array<() => void>;
    phase = 0;
    isVisible = false;
    loopFrame = 0;
    measureFrame = 0;
    constructor() {
      super()
      this.canvas = document.createElement("canvas")
      this.context = this.canvas.getContext("2d")
      this.from = Uint8ClampedArray.of(0, 0, 0, 255)
      this.to = Uint8ClampedArray.of(0, 0, 0, 255)
      this.progress = 0
      this.lines = []
      this.image = null
      this.cleanup = []
    }

    ensureCanvas() {
      if (this.canvas.parentNode !== this) {
        this.prepend(this.canvas)
      }
    }

    scheduleMeasure() {
      if (this.measureFrame) {
        cancelAnimationFrame(this.measureFrame)
      }

      this.measureFrame = requestAnimationFrame(() => {
        this.measureFrame = requestAnimationFrame(() => {
          this.measureFrame = 0
          if (!this.isConnected) {
            return
          }

          this.measure()
          this.draw()
        })
      })
    }

    connectedCallback() {
      if (!this.context) {
        return
      }

      // Read styles BEFORE inserting the canvas into the DOM
      this.readColors()

      this.canvas.setAttribute("aria-hidden", "true")
      Object.assign(this.canvas.style, {
        position: "absolute",
        zIndex: "-1",
        pointerEvents: "none",
        imageRendering: "pixelated",
      })
      this.ensureCanvas()

      this.phase = 0
      this.isVisible = false
      this.loopFrame = 0

      // Initial layout measurement
      this.scheduleMeasure()

      const resize = new ResizeObserver(() => {
        this.measure()
        this.draw()
      })
      resize.observe(this)

      const textChange = new MutationObserver(() => {
        this.ensureCanvas()
        this.scheduleMeasure()
      })
      textChange.observe(this, { childList: true, characterData: true, subtree: true })

      let revealed = false
      const visible = new IntersectionObserver(
        entries => {
          this.isVisible = Boolean(entries.at(0)?.isIntersecting)

          if (this.isVisible && !revealed) {
            revealed = true
            this.cleanup.push(
              animateProgress(700, progress => {
                this.progress = progress
                this.draw()
                if (progress === 1) {
                  this.startLoop()
                }
              })
            )
          } else if (this.isVisible && revealed) {
            this.startLoop()
          }
        },
        { threshold: .2 }
      )
      visible.observe(this)

      this.cleanup.push(
        () => cancelAnimationFrame(this.loopFrame),
        () => resize.disconnect(),
        () => textChange.disconnect(),
        () => visible.disconnect(),
        onThemeChange(() => {
          this.readColors()
          this.draw()
        })
      )
    }

    startLoop() {
      if (prefersReducedMotion() || this.loopFrame) {
        return
      }

      let last = performance.now()
      const tick = (now: number): void => {
        this.loopFrame = 0
        if (!this.isVisible || !this.isConnected) {
          return
        }

        if (now - last >= 120) {
          last = now
          this.phase = (this.phase + .015) % 1
          this.draw()
        }

        this.loopFrame = requestAnimationFrame(tick)
      }

      this.loopFrame = requestAnimationFrame(tick)
    }

    /**
     * Measures text geometry and positions/sizes the canvas.
     * Only runs on mount, resize, or text mutation.
     */
    measure() {
      const context = this.context
      if (!context) {
        return
      }

      this.ensureCanvas()

      const rects = []
      const walker = document.createTreeWalker(this, NodeFilter.SHOW_TEXT)
      let node
      while ((node = walker.nextNode())) {
        if (!node.textContent?.trim()) continue
        const range = document.createRange()
        range.selectNodeContents(node)
        for (const r of range.getClientRects()) {
          if (r.width > 0) rects.push(r)
        }
      }

      if (!rects.length) {
        this.lines = []
        this.image = null
        context.clearRect(0, 0, this.canvas.width, this.canvas.height)
        return
      }

      const paddingX = 6
      const paddingY = 2

      const minLeft = Math.min(...rects.map(r => r.left)) - paddingX
      const minTop = Math.min(...rects.map(r => r.top)) - paddingY
      const maxRight = Math.max(...rects.map(r => r.right)) + paddingX
      const maxBottom = Math.max(...rects.map(r => r.bottom)) + paddingY

      const width = maxRight - minLeft
      const height = maxBottom - minTop

      // Batch all DOM reads before mutating canvas styles
      const parent = this.canvas.offsetParent || document.documentElement
      const parentRect = parent.getBoundingClientRect()

      const cell = cellSize()
      const columns = Math.max(1, Math.ceil(width / cell))
      const rows = Math.max(1, Math.ceil(height / cell))

      this.lines = rects.map(r => ({
        left: Math.floor((r.left - paddingX - minLeft) / cell),
        right: Math.ceil((r.right + paddingX - minLeft) / cell),
        top: Math.floor((r.top - paddingY - minTop) / cell),
        bottom: Math.ceil((r.bottom + paddingY - minTop) / cell),
      }))

      // Batch all DOM writes at the end
      Object.assign(this.canvas.style, {
        left: `${minLeft - (parentRect.left + parent.clientLeft)}px`,
        top: `${minTop - (parentRect.top + parent.clientTop)}px`,
        width: `${width}px`,
        height: `${height}px`,
      })

      if (this.canvas.width !== columns || this.canvas.height !== rows || !this.image) {
        this.canvas.width = columns
        this.canvas.height = rows
        this.image = context.createImageData(columns, rows)
      }
    }

    /**
     * Pure pixel rendering — zero layout reads or style writes.
     */
    draw() {
      const context = this.context
      const image = this.image
      if (!context || !image || !this.lines.length) {
        return
      }

      const { width: columns, height: rows, data } = image
      data.fill(0)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
          const line = this.lines.find(
            l => x >= l.left && x < l.right && y >= l.top && y < l.bottom
          )
          if (!line) {
            continue
          }

          const lineCols = Math.max(1, line.right - line.left)
          const localX = x - line.left
          const threshold = (bayer(x, y) + this.phase) % 1
          const position = localX / Math.max(1, lineCols - 1)

          if (this.progress < 1 && this.progress < .5 * position + .5 * threshold) {
            continue
          }

          const color = threshold < Math.max(0, (position - .1) / .9) ? this.to : this.from
          paint(data, (y * columns + x) * 4, color)
        }
      }

      context.putImageData(image, 0, 0)
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.measureFrame)
      this.measureFrame = 0

      for (const stop of this.cleanup) {
        stop()
      }

      this.cleanup = []
      this.canvas.remove()
    }

    readColors() {
      const accent = readColor(this, "--accent")
      const background = readColor(this, "--bg")

      this.from = mix(background, accent, .36)
      this.to = mix(background, accent, .12)
    }
  }

  customElements.define("dither-line", DitherLine)
})()
