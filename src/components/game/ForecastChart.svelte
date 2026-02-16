<script lang="ts">
  import { resolvedTheme } from '$lib/stores/theme';
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
    const cs = getComputedStyle(document.documentElement);
    const v = (name: string) => cs.getPropertyValue(name).trim();
    return {
      wind: v("--color-gen-wind") || "#22d3ee",
      solar: v("--color-gen-solar") || "#facc15",
      fg: v("--foreground") || "#000",
      mutedFg: v("--muted-foreground") || "#888",
      font: v("--font-sans") || "'Jura', sans-serif",
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
    if (h === 0 || h === 24) return "12A";
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
    ctx.clearRect(0, 0, w, h);

    const compact = h < 50;
    const pad = { left: 6, right: 14, top: compact ? 12 : 14, bottom: compact ? 12 : 14 };
    const chartLeft = pad.left;
    const chartTop = pad.top;
    const chartWidth = w - pad.left - pad.right;
    const chartHeight = h - pad.top - pad.bottom;
    const chartBottom = chartTop + chartHeight;
    const dur = forecast.durationHours;

    // --- Grid lines (subtle horizontal dashes) ---
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 0.5;
    for (const frac of [0.25, 0.5, 0.75]) {
      const y = yForValue(frac, chartTop, chartHeight);
      ctx.beginPath();
      ctx.moveTo(chartLeft, y);
      ctx.lineTo(chartLeft + chartWidth, y);
      ctx.strokeStyle = colors.fg + "18";
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Solid baseline at 0%
    ctx.beginPath();
    ctx.moveTo(chartLeft, chartBottom);
    ctx.lineTo(chartLeft + chartWidth, chartBottom);
    ctx.strokeStyle = colors.fg + "25";
    ctx.lineWidth = 0.5;
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
      grad.addColorStop(0, colors.solar + "30");
      grad.addColorStop(1, colors.solar + "08");
      drawCurveWithFill(ctx, solarPts, chartBottom, colors.solar, grad, 1.5);
    }

    // --- Wind area + line ---
    {
      const grad = ctx.createLinearGradient(0, chartTop, 0, chartBottom);
      grad.addColorStop(0, colors.wind + "35");
      grad.addColorStop(1, colors.wind + "08");
      drawCurveWithFill(ctx, windPts, chartBottom, colors.wind, grad, 1.5);
    }

    // --- Hour tick marks & labels ---
    ctx.font = `bold 9px ${colors.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = colors.mutedFg;

    for (let h = startHour; h <= startHour + dur; h += 2) {
      const elapsed = h - startHour;
      const x = xForElapsed(elapsed, chartLeft, chartWidth, dur);
      // Tick mark
      ctx.beginPath();
      ctx.moveTo(x, chartBottom);
      ctx.lineTo(x, chartBottom + 3);
      ctx.strokeStyle = colors.mutedFg + "50";
      ctx.lineWidth = 0.5;
      ctx.stroke();
      // Label
      ctx.fillText(formatHourLabel(h), x, chartBottom + 3);
    }

    // --- "Now" indicator ---
    if (progress >= 0 && progress <= 1) {
      const nowX = xForElapsed(progress * dur, chartLeft, chartWidth, dur);

      // Glow halo
      ctx.beginPath();
      ctx.moveTo(nowX, chartTop);
      ctx.lineTo(nowX, chartBottom);
      ctx.strokeStyle = colors.fg + "15";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Core line
      ctx.beginPath();
      ctx.moveTo(nowX, chartTop);
      ctx.lineTo(nowX, chartBottom);
      ctx.strokeStyle = colors.fg + "90";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Downward triangle at top
      ctx.beginPath();
      ctx.moveTo(nowX - 3, chartTop - 1);
      ctx.lineTo(nowX + 3, chartTop - 1);
      ctx.lineTo(nowX, chartTop + 4);
      ctx.closePath();
      ctx.fillStyle = colors.fg + "CC";
      ctx.fill();
    }

    // --- Legend: colored squares + labels above chart area ---
    ctx.font = `bold 9px ${colors.font}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const legendY = 2;
    const dotSize = 5;
    const dotY = legendY + 2;
    let lx = pad.left;

    // Wind
    ctx.fillStyle = colors.wind;
    ctx.fillRect(lx, dotY, dotSize, dotSize);
    ctx.fillText("WIND", lx + dotSize + 3, legendY);
    lx += dotSize + 3 + ctx.measureText("WIND").width + 10;

    // Solar (if active)
    if (forecast.hasSolar) {
      ctx.fillStyle = colors.solar;
      ctx.fillRect(lx, dotY, dotSize, dotSize);
      ctx.fillText("SOLAR", lx + dotSize + 3, legendY);
    }
  }

  // --- Canvas refs and rendering ---

  let canvasEl: HTMLCanvasElement;
  let containerEl: HTMLDivElement;
  let cachedColors: ChartColors | null = null;

  // Invalidate colors on theme change
  $effect(() => {
    $resolvedTheme;
    cachedColors = null;
  });

  // Draw the chart whenever forecast, progress, or theme changes
  $effect(() => {
    // Track reactive dependencies
    const _forecast = forecast;
    const _progress = progress;
    const _theme = $resolvedTheme;

    if (!canvasEl || !containerEl) return;

    const rect = containerEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    canvasEl.width = w * dpr;
    canvasEl.height = h * dpr;
    canvasEl.style.width = `${w}px`;
    canvasEl.style.height = `${h}px`;

    const ctx = canvasEl.getContext("2d")!;
    ctx.scale(dpr, dpr);

    if (!cachedColors) {
      cachedColors = resolveChartColors();
    }

    drawForecastChart(ctx, w, h, _forecast, _progress, cachedColors);
  });
</script>

<div bind:this={containerEl} class="h-[44px] sm:h-[52px] w-full" role="img" aria-label="Wind and solar availability forecast chart">
  <canvas bind:this={canvasEl} aria-hidden="true" class="block w-full h-full"></canvas>
</div>
