<script lang="ts">
  import { theme } from '$lib/stores/theme.svelte';
  import { ChartConfig } from '$lib/view/constants';
  import { resolveColors } from '$lib/view/colors';
  import type { ForecastData } from '$lib/weather/forecast';

  interface Props {
    forecast: ForecastData;
    progress: number; // 0-1, current position through the day
  }

  let { forecast, progress }: Props = $props();

  // --- Color helpers ---

  interface ChartColors {
    wind: string;
    solar: string;
    fg: string;
    mutedFg: string;
    font: string;
  }

  function resolveChartColors(): ChartColors {
    // resolveColors() returns #rrggbb hex — safe for hex alpha suffix concatenation.
    const resolved = resolveColors({
      wind: "--color-gen-wind",
      solar: "--color-gen-solar",
      fg: "--foreground",
      mutedFg: "--muted-foreground",
    });
    const cs = getComputedStyle(document.documentElement);
    return {
      wind: resolved.wind,
      solar: resolved.solar,
      fg: resolved.fg,
      mutedFg: resolved.mutedFg,
      font: cs.getPropertyValue("--font-sans").trim() || "'Jura', sans-serif",
    };
  }

  // --- Coordinate mapping ---

  function xForElapsed(elapsed: number, left: number, width: number, duration: number): number {
    return left + (elapsed / duration) * width;
  }

  function yForValue(value: number, top: number, height: number): number {
    return top + height - value * height;
  }

  // --- Smooth curve drawing ---

  function drawSmoothLine(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
  ) {
    if (points.length < 2) return;
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  function drawCurveWithFill(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    bottom: number,
    lineColor: string,
    fillStyle: string | CanvasGradient,
    lineWidth: number,
  ) {
    if (points.length < 2) return;

    // Area fill
    ctx.beginPath();
    ctx.moveTo(points[0].x, bottom);
    ctx.lineTo(points[0].x, points[0].y);
    drawSmoothLine(ctx, points);
    ctx.lineTo(points[points.length - 1].x, bottom);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    drawSmoothLine(ctx, points);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  // --- Hour label formatting ---

  function formatHourLabel(hour24: number): string {
    const h = Math.round(hour24) % 24;
    if (h === 0) return "12A";
    if (h === 12) return "12P";
    return h > 12 ? `${h - 12}P` : `${h}A`;
  }

  // --- Main draw function ---

  function drawForecastChart(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    forecast: ForecastData,
    progress: number,
    colors: ChartColors,
  ) {
    const C = ChartConfig;
    ctx.clearRect(0, 0, w, h);

    const compact = h < C.COMPACT_HEIGHT_THRESHOLD;
    const padTop = compact ? C.PAD_TOP_COMPACT : C.PAD_TOP;
    const padBottom = compact ? C.PAD_BOTTOM_COMPACT : C.PAD_BOTTOM;
    const chartLeft = C.PAD_LEFT;
    const chartTop = padTop;
    const chartWidth = w - C.PAD_LEFT - C.PAD_RIGHT;
    const chartHeight = h - padTop - padBottom;
    const chartBottom = chartTop + chartHeight;
    const dur = forecast.durationHours;

    // --- Grid lines (subtle horizontal dashes) ---
    ctx.setLineDash(C.GRID_DASH as number[]);
    ctx.lineWidth = C.GRID_LINE_WIDTH;
    for (const frac of C.GRID_FRACTIONS) {
      const y = yForValue(frac, chartTop, chartHeight);
      ctx.beginPath();
      ctx.moveTo(chartLeft, y);
      ctx.lineTo(chartLeft + chartWidth, y);
      ctx.strokeStyle = colors.fg + C.ALPHA_GRID;
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Solid baseline at 0%
    ctx.beginPath();
    ctx.moveTo(chartLeft, chartBottom);
    ctx.lineTo(chartLeft + chartWidth, chartBottom);
    ctx.strokeStyle = colors.fg + C.ALPHA_BASELINE;
    ctx.lineWidth = C.GRID_LINE_WIDTH;
    ctx.stroke();

    // --- Map forecast points to canvas coords ---
    const { points, startHour } = forecast;
    const windPts: { x: number; y: number }[] = new Array(points.length);
    const solarPts: { x: number; y: number }[] = new Array(points.length);

    for (let i = 0; i < points.length; i++) {
      const elapsed = points[i].hour - startHour;
      const x = xForElapsed(elapsed, chartLeft, chartWidth, dur);
      windPts[i] = { x, y: yForValue(points[i].windAvail, chartTop, chartHeight) };
      solarPts[i] = { x, y: yForValue(points[i].sunAvail, chartTop, chartHeight) };
    }

    // --- Solar area + line (draw first so wind overlays on top) ---
    if (forecast.hasSolar) {
      const grad = ctx.createLinearGradient(0, chartTop, 0, chartBottom);
      grad.addColorStop(0, colors.solar + C.ALPHA_SOLAR_GRAD_TOP);
      grad.addColorStop(1, colors.solar + C.ALPHA_SOLAR_GRAD_BOT);
      drawCurveWithFill(ctx, solarPts, chartBottom, colors.solar, grad, C.CURVE_LINE_WIDTH);
    }

    // --- Wind area + line ---
    {
      const grad = ctx.createLinearGradient(0, chartTop, 0, chartBottom);
      grad.addColorStop(0, colors.wind + C.ALPHA_WIND_GRAD_TOP);
      grad.addColorStop(1, colors.wind + C.ALPHA_WIND_GRAD_BOT);
      drawCurveWithFill(ctx, windPts, chartBottom, colors.wind, grad, C.CURVE_LINE_WIDTH);
    }

    // --- Hour tick marks & labels ---
    ctx.font = `${C.FONT_PREFIX} ${colors.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = colors.mutedFg;

    for (let h = startHour; h <= startHour + dur; h += 2) {
      const elapsed = h - startHour;
      const x = xForElapsed(elapsed, chartLeft, chartWidth, dur);
      // Tick mark
      ctx.beginPath();
      ctx.moveTo(x, chartBottom);
      ctx.lineTo(x, chartBottom + C.TICK_MARK_LENGTH);
      ctx.strokeStyle = colors.mutedFg + C.ALPHA_TICK_MARK;
      ctx.lineWidth = C.GRID_LINE_WIDTH;
      ctx.stroke();
      // Label
      ctx.fillText(formatHourLabel(h), x, chartBottom + C.TICK_MARK_LENGTH);
    }

    // --- "Now" indicator ---
    if (progress >= 0 && progress <= 1) {
      const nowX = xForElapsed(progress * dur, chartLeft, chartWidth, dur);

      // Glow halo
      ctx.beginPath();
      ctx.moveTo(nowX, chartTop);
      ctx.lineTo(nowX, chartBottom);
      ctx.strokeStyle = colors.fg + C.ALPHA_NOW_GLOW;
      ctx.lineWidth = C.NOW_GLOW_WIDTH;
      ctx.stroke();

      // Core line
      ctx.beginPath();
      ctx.moveTo(nowX, chartTop);
      ctx.lineTo(nowX, chartBottom);
      ctx.strokeStyle = colors.fg + C.ALPHA_NOW_CORE;
      ctx.lineWidth = C.NOW_CORE_WIDTH;
      ctx.stroke();

      // Downward triangle at top
      ctx.beginPath();
      ctx.moveTo(nowX - C.NOW_TRIANGLE_HALF_W, chartTop - C.NOW_TRIANGLE_TOP_OFFSET);
      ctx.lineTo(nowX + C.NOW_TRIANGLE_HALF_W, chartTop - C.NOW_TRIANGLE_TOP_OFFSET);
      ctx.lineTo(nowX, chartTop + C.NOW_TRIANGLE_DEPTH);
      ctx.closePath();
      ctx.fillStyle = colors.fg + C.ALPHA_NOW_FILL;
      ctx.fill();
    }

    // --- Legend: colored squares + labels above chart area ---
    ctx.font = `${C.FONT_PREFIX} ${colors.font}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const dotY = C.LEGEND_Y + C.LEGEND_DOT_Y_OFFSET;
    let lx = C.PAD_LEFT;

    // Wind
    ctx.fillStyle = colors.wind;
    ctx.fillRect(lx, dotY, C.LEGEND_DOT_SIZE, C.LEGEND_DOT_SIZE);
    ctx.fillText("WIND", lx + C.LEGEND_DOT_SIZE + C.LEGEND_LABEL_GAP, C.LEGEND_Y);
    lx += C.LEGEND_DOT_SIZE + C.LEGEND_LABEL_GAP + ctx.measureText("WIND").width + C.LEGEND_ITEM_GAP;

    // Solar (if active)
    if (forecast.hasSolar) {
      ctx.fillStyle = colors.solar;
      ctx.fillRect(lx, dotY, C.LEGEND_DOT_SIZE, C.LEGEND_DOT_SIZE);
      ctx.fillText("SOLAR", lx + C.LEGEND_DOT_SIZE + C.LEGEND_LABEL_GAP, C.LEGEND_Y);
    }
  }

  // --- Canvas refs and rendering ---

  let canvasEl: HTMLCanvasElement;
  let containerEl: HTMLDivElement;
  let cachedCtx: CanvasRenderingContext2D | null = null;
  let cachedColors: ChartColors | null = null;

  // Derive current wind/solar availability at the progress point for screen readers
  let chartAriaLabel = $derived.by(() => {
    const pts = forecast?.points;
    if (!pts?.length || progress < 0 || progress > 1) return 'Renewable availability forecast.';
    const idx = Math.min(Math.round(progress * (pts.length - 1)), pts.length - 1);
    const windPct = Math.round(pts[idx].windAvail * 100);
    let label = `Renewable availability forecast. Wind: ${windPct}%.`;
    if (forecast.hasSolar) label += ` Solar: ${Math.round(pts[idx].sunAvail * 100)}%.`;
    return label;
  });

  // Container dimensions tracked via ResizeObserver (reactive)
  let containerW = $state(0);
  let containerH = $state(0);
  let prevCanvasW = 0;
  let prevCanvasH = 0;

  // ResizeObserver — updates dimensions without layout thrashing
  $effect(() => {
    if (!containerEl) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      containerW = width;
      containerH = height;
    });
    ro.observe(containerEl);
    return () => ro.disconnect();
  });

  // Invalidate colors on theme change
  $effect(() => {
    theme.resolved;
    cachedColors = null;
  });

  // Draw the chart whenever forecast, progress, size, or theme changes
  $effect(() => {
    // Track reactive dependencies
    const _forecast = forecast;
    const _progress = progress;
    const _theme = theme.resolved;
    const w = containerW;
    const h = containerH;

    if (!canvasEl || w === 0 || h === 0) return;

    // Cache the 2D context — it's reusable for the lifetime of the canvas element
    if (!cachedCtx) {
      cachedCtx = canvasEl.getContext("2d");
      if (!cachedCtx) return;
    }

    const dpr = window.devicePixelRatio || 1;

    // Only reset canvas dimensions (trashes GPU surface) when size actually changed
    if (w !== prevCanvasW || h !== prevCanvasH) {
      prevCanvasW = w;
      prevCanvasH = h;
      canvasEl.width = w * dpr;
      canvasEl.height = h * dpr;
      canvasEl.style.width = `${w}px`;
      canvasEl.style.height = `${h}px`;
    }

    cachedCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!cachedColors) {
      cachedColors = resolveChartColors();
    }

    try {
      drawForecastChart(cachedCtx, w, h, _forecast, _progress, cachedColors);
    } catch (e) {
      console.warn('ForecastChart draw failed:', e);
    }
  });
</script>

<div bind:this={containerEl} class="h-[44px] sm:h-[52px] w-full" role="img" aria-label={chartAriaLabel}>
  <canvas bind:this={canvasEl} aria-hidden="true" class="block w-full h-full"></canvas>
</div>
