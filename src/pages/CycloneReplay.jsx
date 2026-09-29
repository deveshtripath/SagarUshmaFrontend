import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ComposedChart, LineChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import FieldPlayer from '../components/replay/FieldPlayer.jsx';
import { STORMS, IMD_CATS, imdCategory } from '../components/replay/cyclones.jsx';
import { loadLand } from '../components/replay/land.jsx';
import { buildScene, LAYERS, LAYER_BY_ID, stormAt, sampleAt, formatTime } from '../components/replay/scene.jsx';
import { cmapGradientCss } from '../components/replay/colormaps.js';
import './CycloneReplay.css';

const SPEEDS = [0.5, 1, 2, 4];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const minus = (s) => s.replace('-', '−');

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = {
  play: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>,
  pause: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /></svg>,
  restart: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM9.5 12 19 5.5v13z" fill="currentColor" /></svg>,
  back: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6 5 12l7 6zM19 6l-7 6 7 6z" fill="currentColor" /></svg>,
  fwd: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 6 7 6-7 6zM5 6l7 6-7 6z" fill="currentColor" /></svg>,
  camera: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>,
  video: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6.5" width="12.5" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m15.5 10.5 5-3v9l-5-3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  const options = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return options.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Pre-rendered SST replays in public/videos/, one per storm (same renderer as the player, 2× speed)
function stormVideo(storm) {
  const base = `${import.meta.env.BASE_URL}videos/SagarUshma_${storm.name}_${storm.year}_sst`;
  return { src: `${base}.mp4`, poster: `${base}.jpg`, file: `SagarUshma_${storm.name}_${storm.year}_sst.mp4` };
}

function dayTicks(scene) {
  const out = [];
  const end = scene.epoch + scene.tLast * 3.6e6;
  for (let ms = Math.ceil(scene.epoch / 864e5) * 864e5; ms <= end; ms += 864e5) out.push((ms - scene.epoch) / 3.6e6);
  return out;
}

function dateRange(storm) {
  const a = new Date(storm.track[0][0]);
  const b = new Date(storm.track[storm.track.length - 1][0]);
  const m = MONTHS[a.getUTCMonth()];
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${m} ${a.getUTCFullYear()}`
    : `${a.getUTCDate()} ${m} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${a.getUTCFullYear()}`;
}

// ── Charts (memoised: they only re-render when the hour changes) ──────────────
const axisTick = { fill: 'var(--chart-axis)', fontSize: 11 };

function ChartTip({ active, payload, label, fmtTime }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="cr-tip">
      <div className="cr-tip__time">{fmtTime(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="cr-tip__row">
          <span style={{ color: p.color }}>{p.name}</span>
          <strong>{p.value ?? '—'}</strong>
        </div>
      ))}
    </div>
  );
}

const WarmPoolChart = memo(function WarmPoolChart({ data, ticks, fmtDay, fmtTime, cursor, showCursor }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -6 }}>
        <defs>
          <linearGradient id="crPool" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--coral)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--coral)" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="t" type="number" domain={[0, 'dataMax']} ticks={ticks} tickFormatter={fmtDay} tick={axisTick} />
        <YAxis yAxisId="h" tick={axisTick} width={48} label={{ value: 'kJ/cm²', angle: -90, position: 'insideLeft', fill: 'var(--chart-axis)', fontSize: 11, dx: 10 }} />
        <YAxis yAxisId="w" orientation="right" tick={axisTick} width={40} label={{ value: 'kt', angle: 90, position: 'insideRight', fill: 'var(--chart-axis)', fontSize: 11 }} />
        <Tooltip content={<ChartTip fmtTime={fmtTime} />} />
        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)', paddingTop: 6 }} />
        <Area yAxisId="h" type="monotone" dataKey="tchpPre" name="TCHP before the storm" stroke="var(--coral)" strokeWidth={2} fill="url(#crPool)" isAnimationActive={false} />
        <Line yAxisId="h" type="monotone" dataKey="tchpPost" name="TCHP after it passed" stroke="var(--cyan)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
        <Line yAxisId="w" type="monotone" dataKey="vmax" name="Wind speed" stroke="var(--violet)" strokeWidth={2} dot={false} isAnimationActive={false} />
        {showCursor && <ReferenceLine yAxisId="h" x={cursor} stroke="var(--chart-ref)" strokeDasharray="2 3" />}
      </ComposedChart>
    </ResponsiveContainer>
  );
});

const StructureChart = memo(function StructureChart({ data, ticks, fmtDay, fmtTime, cursor, showCursor }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -6 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="t" type="number" domain={[0, 'dataMax']} ticks={ticks} tickFormatter={fmtDay} tick={axisTick} />
        <YAxis reversed tick={axisTick} width={48} domain={[0, 'auto']} label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', fill: 'var(--chart-axis)', fontSize: 11, dx: 10 }} />
        <Tooltip content={<ChartTip fmtTime={fmtTime} />} />
        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)', paddingTop: 6 }} />
        <Line type="monotone" dataKey="d26" name="26 °C isotherm (D26)" stroke="var(--amber)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="mld" name="Mixed layer before" stroke="var(--teal)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="mldPost" name="Mixed layer after" stroke="var(--teal)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
        {showCursor && <ReferenceLine x={cursor} stroke="var(--chart-ref)" strokeDasharray="2 3" />}
      </LineChart>
    </ResponsiveContainer>
  );
});

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CycloneReplay() {
  const [stormId, setStormId] = useState('mocha_2023');
  const [layerId, setLayerId] = useState('tchp');
  const [showVectors, setShowVectors] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [land, setLand] = useState(null);
  const [landError, setLandError] = useState(null);
  const [t, setT] = useState(-12);
  const [stats, setStats] = useState({ minSST: 0, minTCHP: 0, maxMLD: 0 });
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState(null);
  const playerRef = useRef(null);
  const recRef = useRef(null);

  useEffect(() => {
    loadLand().then(setLand).catch((e) => setLandError(e.message));
  }, []);

  const storm = STORMS[stormId];
  const scene = useMemo(() => (land ? buildScene(storm, land) : null), [storm, land]);

  useEffect(() => {
    setPlaying(false);
    if (scene) setT(scene.tStart);
  }, [scene]);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  // ── Transport ───────────────────────────────────────────────────────────────
  const seek = useCallback((value) => {
    if (!scene) return;
    const v = clamp(value, scene.tStart, scene.tEnd);
    playerRef.current?.seek(v);
    setT(v);
  }, [scene]);

  const togglePlay = useCallback(() => {
    if (!scene) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    const cur = playerRef.current?.getTime() ?? t;
    if (cur >= scene.tEnd - 0.01) seek(scene.tStart);
    setPlaying(true);
  }, [scene, playing, t, seek]);

  const step = useCallback((dh) => seek((playerRef.current?.getTime() ?? t) + dh), [seek, t]);

  const handleTick = useCallback((time, s) => {
    setT(time);
    setStats(s);
  }, []);

  const stopRecording = useCallback((cancel) => {
    const job = recRef.current;
    if (!job) return;
    job.cancelled = cancel;
    setPlaying(false);
    if (job.recorder.state !== 'inactive') job.recorder.stop();
  }, []);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    if (recRef.current) setTimeout(() => stopRecording(false), 400);
  }, [stopRecording]);

  function startRecording() {
    const canvas = playerRef.current?.getCanvas();
    const mime = pickMime();
    if (!scene || !canvas?.captureStream || mime === null) {
      setNotice('Video export needs a recent Chrome, Edge or Firefox.');
      return;
    }
    const stream = canvas.captureStream(30);
    let recorder;
    try {
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : undefined);
    } catch (e) {
      setNotice(`Couldn't start recording: ${e.message}`);
      return;
    }
    const job = { recorder, chunks: [], cancelled: false, mime: recorder.mimeType || mime || 'video/webm' };
    recorder.ondataavailable = (e) => { if (e.data?.size) job.chunks.push(e.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach((tr) => tr.stop());
      recRef.current = null;
      setRecording(false);
      if (job.cancelled || !job.chunks.length) {
        if (job.cancelled) setNotice('Recording cancelled.');
        return;
      }
      const ext = job.mime.includes('mp4') ? 'mp4' : 'webm';
      download(new Blob(job.chunks, { type: job.mime }), `SagarUshma_${storm.name}_${storm.year}_${layerId}.${ext}`);
      setNotice(`Video saved as ${ext.toUpperCase()}.`);
    };
    recRef.current = job;
    seek(scene.tStart);
    recorder.start(250);
    setRecording(true);
    setPlaying(true);
  }

  function saveFrame() {
    const canvas = playerRef.current?.getCanvas();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) download(blob, `SagarUshma_${storm.name}_${storm.year}_${layerId}_T${Math.round(t)}h.png`);
    }, 'image/png');
  }

  // Stop any recording if the page unmounts
  useEffect(() => () => {
    const job = recRef.current;
    if (job && job.recorder.state !== 'inactive') {
      job.cancelled = true;
      job.recorder.stop();
    }
  }, []);

  // Keyboard: space = play/pause, ←/→ = ∓3 h
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, select, textarea, button')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') step(3);
      else if (e.key === 'ArrowLeft') step(-3);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, step]);

  // ── Derived readouts ────────────────────────────────────────────────────────
  const now = scene ? stormAt(scene, t) : null;
  const core = now ? sampleAt(scene, now.lat, now.lon, t) : null;
  const cat = now ? imdCategory(now.vmax) : null;
  const layer = LAYER_BY_ID[layerId];

  const chartProps = useMemo(() => {
    if (!scene) return null;
    return {
      data: scene.series,
      ticks: dayTicks(scene),
      fmtDay: (h) => {
        const d = new Date(scene.epoch + h * 3.6e6);
        return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
      },
      fmtTime: (h) => formatTime(scene, h),
    };
  }, [scene]);
  const cursor = scene ? clamp(Math.round(t), 0, scene.tLast) : 0;
  const showCursor = !!scene && t >= 0 && t <= scene.tLast;

  const span = scene ? scene.tEnd - scene.tStart : 1;
  const pct = (h) => `${(((h - (scene?.tStart ?? 0)) / span) * 100).toFixed(2)}%`;
  const atStart = scene && t <= scene.tStart + 0.01;
  const atEnd = scene && t >= scene.tEnd - 0.01;
  const relLabel = !scene ? '' : t < 0
    ? `Genesis in ${Math.ceil(-t)} h`
    : t <= scene.tLast ? `T+${Math.floor(t)} h since genesis` : `${Math.floor(t - scene.tLast)} h after the last fix`;

  return (
    <div className="page cr-page">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Cyclone Heat Replay</h1>
          <p className="page-header__subtitle">
            Watch each storm cross the upper ocean: the warm pool it fed on, the cold wake it left behind,
            and the currents it set spinning. Export any replay as a video.
          </p>
        </div>
        <div className="page-header__tag">INCOIS mandate</div>
      </div>

      {/* Storm picker */}
      <div className="cr-storms" role="radiogroup" aria-label="Cyclone">
        {Object.values(STORMS).map((s) => {
          const pc = IMD_CATS.find((c) => c.code === s.peak);
          const active = s.id === stormId;
          return (
            <button
              key={s.id}
              role="radio"
              aria-checked={active}
              className={`cr-storm${active ? ' is-active' : ''}`}
              style={{ '--storm': pc.color }}
              onClick={() => setStormId(s.id)}
              disabled={recording}
            >
              <span className="cr-storm__name">{s.name} <span className="cr-storm__year">{s.year}</span></span>
              <span className="cr-storm__meta">{s.basin}</span>
              <span className="cr-storm__peak">Peak {s.peak}</span>
            </button>
          );
        })}
      </div>

      <div className="cr-stage">
        {/* Player */}
        <section className="cr-player" aria-label="Replay player">
          <div className="cr-player__bar">
            <div className="cr-layers" role="tablist" aria-label="Field shown">
              {LAYERS.map((l) => (
                <button
                  key={l.id}
                  role="tab"
                  aria-selected={l.id === layerId}
                  className={`cr-layer${l.id === layerId ? ' is-active' : ''}`}
                  onClick={() => setLayerId(l.id)}
                  title={l.long}
                >
                  <span className="cr-layer__swatch" style={{ background: cmapGradientCss(l.cmap) }} />
                  {l.label}
                </button>
              ))}
            </div>
            <label className="cr-switch">
              <input type="checkbox" checked={showVectors} onChange={(e) => setShowVectors(e.target.checked)} />
              <span className="cr-switch__track" aria-hidden="true" />
              Current arrows
            </label>
          </div>

          <div className="cr-screen">
            <FieldPlayer
              ref={playerRef}
              scene={scene}
              layerId={layerId}
              showVectors={showVectors}
              playing={playing}
              speed={speed}
              onTick={handleTick}
              onEnded={handleEnded}
            />
            {!scene && (
              <div className="cr-screen__status">
                {landError ? `Couldn't load the coastline data: ${landError}` : 'Preparing ocean fields…'}
              </div>
            )}
            {scene && !playing && !recording && (atStart || atEnd) && (
              <button className="cr-bigplay" onClick={togglePlay}>
                <span className="cr-bigplay__icon">{Icon.play}</span>
                {atEnd ? 'Replay' : `Play ${storm.name}`}
              </button>
            )}
            {recording && (
              <div className="cr-rec" role="status">
                <span className="cr-rec__dot" /> Recording
              </div>
            )}
          </div>

          <div className="cr-timeline">
            <input
              type="range"
              className="cr-range"
              min={scene?.tStart ?? 0}
              max={scene?.tEnd ?? 1}
              step={0.5}
              value={t}
              disabled={!scene || recording}
              onChange={(e) => seek(+e.target.value)}
              aria-label="Replay time"
              style={scene ? { '--p': pct(t), '--a': pct(0), '--b': pct(scene.tLast) } : undefined}
            />
          </div>

          <div className="cr-transport">
            <div className="cr-transport__buttons">
              <button className="cr-icon-btn" onClick={() => seek(scene?.tStart ?? 0)} disabled={!scene || recording} aria-label="Back to start" title="Back to start">{Icon.restart}</button>
              <button className="cr-icon-btn" onClick={() => step(-6)} disabled={!scene || recording} aria-label="Back 6 hours" title="Back 6 hours (←)">{Icon.back}</button>
              <button className="cr-play" onClick={togglePlay} disabled={!scene || recording} aria-label={playing ? 'Pause' : 'Play'} title="Play / pause (space)">
                {playing ? Icon.pause : Icon.play}
              </button>
              <button className="cr-icon-btn" onClick={() => step(6)} disabled={!scene || recording} aria-label="Forward 6 hours" title="Forward 6 hours (→)">{Icon.fwd}</button>
            </div>

            <div className="cr-readout-time">
              <span className="cr-readout-time__clock">{scene ? formatTime(scene, t) : '—'}</span>
              <span className="cr-readout-time__rel">{relLabel}</span>
            </div>

            <div className="cr-speed" role="radiogroup" aria-label="Playback speed">
              {SPEEDS.map((s) => (
                <button key={s} role="radio" aria-checked={speed === s} className={`cr-speed__opt${speed === s ? ' is-active' : ''}`} onClick={() => setSpeed(s)}>
                  {s}×
                </button>
              ))}
            </div>

            <div className="cr-export">
              <button className="cr-action" onClick={saveFrame} disabled={!scene || recording}>
                {Icon.camera} Save frame
              </button>
              {recording ? (
                <button className="cr-action cr-action--rec" onClick={() => stopRecording(true)}>Cancel recording</button>
              ) : (
                <button className="cr-action cr-action--primary" onClick={startRecording} disabled={!scene}>
                  {Icon.video} Export video
                </button>
              )}
            </div>
          </div>
          <div className="cr-footnote">
            <span className="cr-footnote__swatch" /> Shaded part of the timeline = storm active.
            {notice && <span className="cr-notice" role="status">{notice}</span>}
          </div>
        </section>

        {/* Side panel */}
        <aside className="cr-side">
          <div className="cr-card">
            <div className="cr-card__head">
              <h2 className="cr-card__title">Cyclone {storm.name}</h2>
              <span className="cr-card__sub">{dateRange(storm)}</span>
            </div>
            <dl className="cr-facts">
              <div><dt>Basin</dt><dd>{storm.basin}</dd></div>
              <div><dt>Landfall</dt><dd>{storm.landfall}</dd></div>
            </dl>
          </div>

          <div className="cr-card">
            <h2 className="cr-card__title">Under the storm</h2>
            {now ? (
              <>
                <div className="cr-cat" style={{ '--cat': cat.color }}>
                  <div>
                    <div className="cr-cat__code">{cat.code}</div>
                    <div className="cr-cat__name">{cat.name}</div>
                  </div>
                  <div className="cr-cat__wind">{Math.round(now.vmax)}<small>kt</small></div>
                </div>
                {core ? (
                  <dl className="cr-readout">
                    <div><dt>Heat potential ahead of the core</dt><dd>{core.pre.tchp.toFixed(0)}<small>kJ/cm²</small></dd></div>
                    <div><dt>26 °C isotherm depth</dt><dd>{core.pre.d26.toFixed(0)}<small>m</small></dd></div>
                    <div><dt>Mixed layer depth</dt><dd>{core.pre.mld.toFixed(0)}<small>m</small></dd></div>
                    <div>
                      <dt>Sea surface temperature</dt>
                      <dd>
                        {core.sst.toFixed(1)}<small>°C</small>
                        {core.sst - core.pre.sst < -0.05 && (
                          <span className="cr-delta">{minus((core.sst - core.pre.sst).toFixed(1))}</span>
                        )}
                      </dd>
                    </div>
                    <div><dt>Moving at</dt><dd>{(now.trans * 3.6).toFixed(0)}<small>km/h</small></dd></div>
                  </dl>
                ) : (
                  <p className="cr-muted">The centre is over land now, cut off from the ocean’s heat.</p>
                )}
              </>
            ) : (
              <p className="cr-muted">
                {t < 0
                  ? 'This is the ocean before genesis. Press play to bring in the storm.'
                  : 'The storm has dissipated. Its cold wake keeps recovering for weeks.'}
              </p>
            )}
          </div>

          <div className="cr-card">
            <h2 className="cr-card__title">Cold wake so far</h2>
            <dl className="cr-readout">
              <div><dt>Largest SST drop</dt><dd className="is-cool">{minus(stats.minSST.toFixed(1))}<small>°C</small></dd></div>
              <div><dt>Largest TCHP loss</dt><dd className="is-cool">{minus(stats.minTCHP.toFixed(0))}<small>kJ/cm²</small></dd></div>
              <div><dt>Deepest mixing</dt><dd>+{stats.maxMLD.toFixed(0)}<small>m</small></dd></div>
            </dl>
          </div>

          <div className="cr-card">
            <h2 className="cr-card__title">Track colours</h2>
            <ul className="cr-legend">
              {IMD_CATS.map((c) => (
                <li key={c.code}>
                  <span className="cr-legend__swatch" style={{ background: c.color }} />
                  <span className="cr-legend__code">{c.code}</span>
                  <span className="cr-legend__name">{c.name}</span>
                  <span className="cr-legend__min">≥{c.min} kt</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* Pre-rendered replay video for the selected storm */}
      <div className="card cr-video">
        <div className="cr-video__head">
          <div>
            <div className="card__title">Replay video · Cyclone {storm.name} {storm.year}</div>
            <p className="cr-chart-note">
              Sea surface temperature from genesis to dissipation, {dateRange(storm)}, with surface currents and the IMD-coloured track.
            </p>
          </div>
          <a className="cr-action" href={stormVideo(storm).src} download={stormVideo(storm).file}>
            {Icon.video} Download MP4
          </a>
        </div>
        <video
          key={storm.id}
          className="cr-video__player"
          src={stormVideo(storm).src}
          poster={stormVideo(storm).poster}
          controls
          playsInline
          preload="metadata"
        />
      </div>

      {chartProps && (
        <div className="grid-2">
          <div className="card">
            <div className="card__title">Warm pool along the track</div>
            <p className="cr-chart-note">Heat available under the core before the storm, what was left after it passed, and the wind speed.</p>
            <WarmPoolChart {...chartProps} cursor={cursor} showCursor={showCursor} />
          </div>
          <div className="card">
            <div className="card__title">Upper-ocean structure along the track</div>
            <p className="cr-chart-note">How deep the warm water and the mixed layer reached under the core. Depth increases downward.</p>
            <StructureChart {...chartProps} cursor={cursor} showCursor={showCursor} />
          </div>
        </div>
      )}

      <div className="card cr-note">
        <h2 className="cr-note__title">Reading the replay</h2>
        <p>
          <strong>{layer.label}</strong> is shown now. TCHP is the heat stored above the 26 °C isotherm; a deep warm pool
          (high TCHP, deep D26) lets a storm keep drawing energy instead of churning up cold water. As the core passes,
          mixing and upwelling pull cooler water to the surface. The cold wake is strongest to the right of the track
          and largest under slow storms: compare Biparjoy, which crawled across the Arabian Sea, with the faster Mocha.
          The arrows that keep turning clockwise in the wake are near-inertial currents, rotating once every 1.5–2 days
          at these latitudes.
        </p>
        <p className="cr-muted">
          Fields on this page are simulated from the best track so the replay runs without a gridded endpoint. Swap in
          reconstructed profiles from the model through <code>src/replay/scene.js</code>.
        </p>
      </div>
    </div>
  );
}