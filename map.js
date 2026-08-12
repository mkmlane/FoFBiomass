// If you want to draw different things on the screen, update this file

import Map from 'ol/Map.js';
import View from 'ol/View.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import GeoJSON from 'ol/format/GeoJSON';
import ZoomToExtent from 'ol/control/ZoomToExtent.js';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import { Style, Fill, Stroke } from 'ol/style.js';

export const spamSource = new VectorSource({
  format: new GeoJSON(),
  url: '/data/SPAM2020_production.geojson',
});

const countryStyle = new Style({
  fill: new Fill({ color: '#ffffff00' }),
  stroke: new Stroke({ color: '#a89f91', width: 0.8 }),
});

export function createCountryBoundaryLayer() {
  return new VectorLayer({
    source: new VectorSource({
      url: '/data/countries.geojson',
      format: new GeoJSON(),
    }),
    style: countryStyle,
    background: '#ffffff00',
  });
}

export const boundaryBaseLayer = createCountryBoundaryLayer();

export function createMap() {
  const map = new Map({
    target: 'map-container',
    view: new View({ center: [0, 0], zoom: 2 }),
    layers: [boundaryBaseLayer],
    controls: defaultControls().extend([
      new ZoomToExtent({
        label: '⌂',
        tipLabel: 'Reset to world view',
        extent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
      }),
    ]),
  });
  return map;
}

export function createVectorLayer(styleFn) {
  return new VectorLayer({
    source: spamSource,
    style: styleFn,
  });
}
