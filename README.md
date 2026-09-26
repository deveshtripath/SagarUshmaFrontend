# SagarUshma Ocean Intelligence Platform — v2.0

A React + Vite frontend for the SagarUshma ocean subsurface reconstruction API.

## Pages

| Page | Route | Description |
|------|-------|-------------|
| 🌊 Ocean Explorer | `/` (default) | Click map → fetch SST/SSS/SSH/currents/wind + depth gradient |
| 🌀 Cyclone Heat Replay | sidebar | Animate TCHP / D26 / MLD along real cyclone tracks (Amphan, Mocha, Biparjoy, Remal) |
| 🔵 ARGO Advisory | sidebar | Uncertainty-driven float deployment: argmax σ with spacing constraint |
| 🌡️ Marine Heatwave | sidebar | Hobday MHW categories at depth (surface + subsurface) |
| 🧠 Attribution Maps | sidebar | Integrated-gradient attribution over 5 modalities per depth layer |
| 📅 Event Database | sidebar | Planned: store cyclone/tsunami/MHW events, view ocean conditions on those dates |

## Setup

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Set backend URL
cp .env.example .env
# Edit VITE_API_BASE_URL if your backend is not on Render

# 3. Run dev server
npm run dev
```

Open http://localhost:5173

## Build for production

```bash
npm run build
# Outputs to dist/
npm run preview  # preview the build locally
```

## API

The app talks to one endpoint:

```
POST https://sagarushma.onrender.com/api/predict/
Content-Type: application/json

{"latitude": 12.5, "longitude": 70.0, "date": "2026-09-20"}
```

Expected response shape:
```json
{
  "latitude": 12.5,
  "longitude": 70.0,
  "date": "2026-09-20",
  "prediction": {
    "sst": 28.4,
    "sss": 35.1,
    "ssh": 0.12,
    "u_current": 0.08,
    "v_current": -0.03,
    "u_wind": 4.2,
    "v_wind": -1.1,
    "by_depth": [
      {"depth": 0,   "temperature": 28.4, "salinity": 35.1},
      {"depth": 10,  "temperature": 27.8, "salinity": 35.3},
      ...
    ]
  }
}
```

## Architecture notes

- **Cyclone tracks**: Simplified from IBTrACS; swap in real GeoJSON for production.
- **ARGO uncertainty**: Synthetic σ field for demo. Wire to your model's posterior std dev.
- **MHW baselines**: Using hardcoded P90 climatology per depth layer; connect to WOA23 for real baselines.
- **Attribution**: Synthetic integrated-gradient values. Run real IG against your PyTorch model and expose via `/api/attribution/`.
- **Event DB**: Fully planned — add Django `OceanEvent` model (schema in the UI), seed with IBTrACS + GDACS data.

## Dependencies

| Package | Use |
|---------|-----|
| react / react-dom | UI framework |
| react-leaflet + leaflet | Interactive maps |
| recharts | All charts (line, area, bar, radar, scatter) |
| vite + @vitejs/plugin-react | Build tooling |
