// Biorefinery siting test case: pick a point, sum whatever's currently
// checked on the Map page within a given radius. Uses the native SPAM2020
// resolution regardless of the Map page's aggregation setting, since this
// is meant to be a precise point query, not a display simplification.

import Map from 'ol/Map.js';
import View from 'ol/View.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import CircleGeom from 'ol/geom/Circle.js';
import CircleStyle from 'ol/style/Circle.js';
import { Style, Fill, Stroke } from 'ol/style.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import { allItems, itemName } from './categories.js';
import { createCountryBoundaryLayer, createStateProvinceLayer, createVectorLayer } from './map.js';

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lon1, lat1, lon2, lat2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Sums each selected item's value across raw features within radiusKm of
// (centerLon, centerLat). A cheap lon/lat bounding-box check runs first so
// the expensive haversine call only happens for points that could plausibly
// be in range. Also tracks the nearest raw SPAM pixel overall (regardless
// of radius), since every pass already computes lon/lat per feature anyway
// — its ADM0/ADM1/ADM2 name fields are used as a free location label,
// matching how AgReUSE labels its popups.
export function totalWithinRadius(rawFeatures, centerLon, centerLat, radiusKm, selectedItemIds) {
  const items = [...selectedItemIds].map((id) => allItems.find((i) => i.id === id)).filter(Boolean);
  const totals = {};
  for (const item of items) totals[item.id] = 0;

  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.max(Math.cos(toRad(centerLat)), 0.01));
  const minLon = centerLon - lonDelta;
  const maxLon = centerLon + lonDelta;
  const minLat = centerLat - latDelta;
  const maxLat = centerLat + latDelta;

  let pointCount = 0;
  let nearestFeature = null;
  let nearestDistSq = Infinity;

  for (const feature of rawFeatures) {
    const [lon, lat] = toLonLat(feature.getGeometry().getCoordinates());

    const dLon = lon - centerLon;
    const dLat = lat - centerLat;
    const distSq = dLon * dLon + dLat * dLat;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearestFeature = feature;
    }

    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
    if (haversineKm(centerLon, centerLat, lon, lat) > radiusKm) continue;
    pointCount++;
    for (const item of items) {
      totals[item.id] += item.getValue(feature);
    }
  }

  return { totals, pointCount, nearestFeature };
}

export function locationLabel(feature) {
  if (!feature) return null;
  const parts = [feature.get('ADM2_NAME'), feature.get('ADM1_NAME'), feature.get('ADM0_NAME')].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

const markerStyle = new Style({
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: '#e63946' }),
    stroke: new Stroke({ color: '#ffffff', width: 2 }),
  }),
});

const radiusStyle = new Style({
  fill: new Fill({ color: 'rgba(230, 57, 70, 0.1)' }),
  stroke: new Stroke({ color: '#e63946', width: 1.5, lineDash: [6, 4] }),
});

// productionSource/productionStyleFn seed the same crop-shading layer used
// on the Map page, so hotspots are visible here to click on. main.js keeps
// this layer's source/style in sync with the Map page's whenever the
// selection or resolution changes (see updateProductionLayer below).
export function createTestCaseMap(onPick, productionSource, productionStyleFn) {
  const markerSource = new VectorSource();
  const markerLayer = new VectorLayer({ source: markerSource, style: markerStyle });

  const radiusSource = new VectorSource();
  const radiusLayer = new VectorLayer({ source: radiusSource, style: radiusStyle });

  const productionLayer = createVectorLayer(productionStyleFn, productionSource);

  const map = new Map({
    target: 'testcase-map-container',
    view: new View({ center: [0, 0], zoom: 2 }),
    layers: [
      createCountryBoundaryLayer(),
      createStateProvinceLayer(),
      productionLayer,
      radiusLayer,
      markerLayer,
    ],
  });

  map.on('click', (evt) => {
    const [lon, lat] = toLonLat(evt.coordinate);
    onPick(lon, lat);
  });

  function setMarker(lon, lat) {
    markerSource.clear();
    markerSource.addFeature(new Feature(new Point(fromLonLat([lon, lat]))));
  }

  // Web Mercator stretches distances by 1/cos(latitude), so a ground distance
  // in km is converted to map units before drawing or zooming. Without this,
  // circles were drawn smaller than the radius used for the totals.
  function mapUnits(km, lat) {
    return (km * 1000) / Math.max(Math.cos(toRad(lat)), 0.01);
  }

  function setRadiusCircle(lon, lat, radiusKm) {
    radiusSource.clear();
    const center = fromLonLat([lon, lat]);
    radiusSource.addFeature(new Feature(new CircleGeom(center, mapUnits(radiusKm, lat))));
  }

  // Centers on the site and shows about ZOOM_WIDTH_KM east-west (about half
  // the contiguous US), so the catchment is seen in its regional context.
  // radiusKm only widens the view if the catchment itself is larger.
  const ZOOM_WIDTH_KM = 2250;
  function zoomToRadius(lon, lat, radiusKm) {
    const [x, y] = fromLonLat([lon, lat]);
    const halfWidth = mapUnits(Math.max(ZOOM_WIDTH_KM / 2, radiusKm * 1.5), lat);
    const halfHeight = halfWidth / 2;
    map.getView().fit([x - halfWidth, y - halfHeight, x + halfWidth, y + halfHeight], {
      padding: [80, 360, 80, 80],
      duration: 500,
    });
  }

  function updateProductionLayer(source, styleFn) {
    productionLayer.setSource(source);
    productionLayer.setStyle(styleFn);
  }

  return { map, setMarker, setRadiusCircle, zoomToRadius, updateProductionLayer };
}

export function renderResults(container, totals, pointCount, radiusKm) {
  const entries = Object.entries(totals).filter(([, value]) => value > 0);
  if (entries.length === 0) {
    container.innerHTML = `<p>No selected biomass found within ${radiusKm} km (${pointCount} SPAM pixels in range).</p>`;
    return;
  }

  entries.sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  const rows = entries
    .map(([id, value]) => `<tr><td>${itemName(id)}</td><td style="text-align:right;">${Math.round(value).toLocaleString()}</td></tr>`)
    .join('');

  container.innerHTML = `
    <table>
      ${rows}
      <tr class="total-row"><td>Total (metric tons)</td><td style="text-align:right;">${Math.round(total).toLocaleString()}</td></tr>
    </table>
    <p class="field-note">within ${radiusKm} km (${pointCount} SPAM pixels)</p>
  `;
}

export function renderFuelProduction(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; font-weight:bold;">
      <span>Total Fuel Production (J)</span>
      <span>N/A</span>
    </div>
    <p class="field-note">Pending the conversion pathway energy model.</p>
  `;
}

// FoF model siting result, written by scripts/run_siting.py in the
// FoF_Spiros repository: the site whose catchment radius is smallest while
// still meeting the plant's annual demand.
export async function loadModelTestCase() {
  const response = await fetch('/data/siting_test_case.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function renderModelTestCase(container, data) {
  const { inputs, result } = data;
  const fmt = (value, digits = 0) => value.toLocaleString(undefined, { maximumFractionDigits: digits });
  const rows = [
    ['Site', result.location],
    ['Radius', `${fmt(result.radius_km, 1)} km`],
    ['Annual demand', `${fmt(result.annual_demand_t)} t/yr`],
    ['Gross residue yield', `${fmt(result.average_residue_yield_t_ha, 2)} t/ha`],
    // Retrievable = gross x removal rate x (1 - losses); this is the yield the FoF model uses.
    ['Estimated retrievable yield', `${fmt(data.model_inputs.retrievable_yield_t_ha, 2)} t/ha`],
    ['Land ratio', fmt(result.land_ratio, 3)],
    ['Mean haul (straight line)', `${fmt(result.mean_haul_distance_km, 1)} km`],
    [`From outside ${inputs.region}`, `${fmt(result.share_from_outside_region * 100, 1)}%`],
  ]
    .map(([label, value]) => `<tr><td>${label}</td><td style="text-align:right;">${value}</td></tr>`)
    .join('');

  container.innerHTML = `
    <table>${rows}</table>
    <p class="field-note">
      ${fmt(inputs.capacity_t_per_day)} t/day plant, capacity factor ${inputs.capacity_factor},
      ${fmt(inputs.removal_rate * 100)}% removal, ${fmt(inputs.loss_rate * 100)}% losses
      (${data.data}, generated ${data.generated}). The totals below use the Map page's
      checked items and exclude losses, so they run higher than the demand.
    </p>
  `;
}
