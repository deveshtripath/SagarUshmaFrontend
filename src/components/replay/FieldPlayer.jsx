import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { computeFrame, HOURS_PER_SECOND, LAYER_BY_ID } from './scene.jsx';
import { createFigure, drawFrame } from './renderer.jsx';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

/**
 * Canvas "video" of a replay scene. Owns the animation clock so playback never
 * re-renders React per frame; reports time to the parent ~12×/s via onTick.
 *
 * ref API: seek(hours), getTime(), getCanvas()
 */
const FieldPlayer = forwardRef(function FieldPlayer(
  { scene, layerId, showVectors, playing, speed, onTick, onEnded },
  ref,
) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const live = useRef({ t: 0, dirty: true, last: 0, lastTick: 0, ended: false, forceTick: true, fig: null, width: 0 });
  const props = useRef({});
  props.current = { scene, layerId, showVectors, playing, speed, onTick, onEnded };

  useImperativeHandle(ref, () => ({
    seek(t) {
      const sc = props.current.scene;
      if (!sc) return;
      const s = live.current;
      s.t = clamp(t, sc.tStart, sc.tEnd);
      s.ended = s.t >= sc.tEnd;
      s.dirty = true;
      s.forceTick = true;
    },
    getTime: () => live.current.t,
    getCanvas: () => canvasRef.current,
  }), []);

  // New storm → rewind and rebuild the figure
  useEffect(() => {
    const s = live.current;
    if (scene) s.t = scene.tStart;
    s.ended = false;
    s.fig = null;
    s.dirty = true;
    s.forceTick = true;
  }, [scene]);

  useEffect(() => {
    live.current.dirty = true;
  }, [layerId, showVectors]);

  // Track container width
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width);
      if (w > 0 && w !== live.current.width) {
        live.current.width = w;
        live.current.fig = null;
        live.current.dirty = true;
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Redraw once web fonts are ready so canvas text uses Inter
  useEffect(() => {
    document.fonts?.ready?.then(() => {
      live.current.fig = null;
      live.current.dirty = true;
    });
  }, []);

  // Animation loop
  useEffect(() => {
    let raf;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const s = live.current;
      const p = props.current;
      const sc = p.scene;
      const dt = s.last ? Math.min((now - s.last) / 1000, 0.1) : 0;
      s.last = now;
      if (!sc || !s.width || !canvasRef.current) return;

      if (p.playing && !s.ended) {
        s.t += dt * p.speed * HOURS_PER_SECOND;
        if (s.t >= sc.tEnd) {
          s.t = sc.tEnd;
          s.ended = true;
          s.forceTick = true;
          p.onEnded?.();
        }
        s.dirty = true;
      }

      if (!s.fig) {
        s.fig = createFigure(sc, s.width, canvasRef.current);
        s.dirty = true;
      }
      if (!s.dirty) return;

      const layer = LAYER_BY_ID[p.layerId];
      const frame = computeFrame(sc, s.t, p.layerId, p.showVectors);
      drawFrame(canvasRef.current.getContext('2d'), s.fig, sc, frame, { layer, showVectors: p.showVectors, t: s.t });
      s.dirty = false;

      if (s.forceTick || now - s.lastTick > 80) {
        s.lastTick = now;
        s.forceTick = false;
        p.onTick?.(s.t, frame.stats);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={wrapRef} className="cr-canvas-wrap">
      <canvas ref={canvasRef} className="cr-canvas" aria-label="Cyclone replay animation" role="img" />
    </div>
  );
});

export default FieldPlayer;
