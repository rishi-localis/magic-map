import mapboxgl from 'mapbox-gl';
import {MapboxLayer} from '@deck.gl/mapbox';
import {ArcLayer} from '@deck.gl/layers';
import {H3HexagonLayer} from '@deck.gl/geo-layers';
import {scaleLog} from 'd3-scale';
import {h3ToGeo} from 'h3-js';
import {HexagonLayer} from '@deck.gl/aggregation-layers';

import {load} from '@loaders.gl/core';
import {CSVLoader} from '@loaders.gl/csv';

// Set your mapbox token here
mapboxgl.accessToken = 'pk.eyJ1IjoicmlzaGkxMyIsImEiOiJjamlyZ2V2dGwwdXEyM3BycXp2ZzlxcmozIn0.UqtxCizQ6MsNzIajuGOpAg'; // eslint-disable-line

const colorScale = scaleLog()
  .domain([10, 100, 1000, 10000])
  .range([
    [255, 255, 178],
    [254, 204, 92],
    [253, 141, 60],
    [227, 26, 28]
  ]);

export function renderToDOM(container, data) {
  const map = new mapboxgl.Map({
    container,
    style: 'mapbox://styles/mapbox/streets-v11',
    antialias: true,
    center: [150.1088,-35.9790], 
    zoom: 9,
    bearing: 20,
    pitch: 60
  });

  map.addControl(new mapboxgl.NavigationControl(), 'top-left');

  map.on('load', () => {
    map.addLayer({
      id: '3d-buildings',
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', 'extrude', 'true'],
      type: 'fill-extrusion',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': '#ccc',
        'fill-extrusion-height': ['get', 'height']
      }
    });

    renderLayers(map, data);
  });

  return {
    update: newData => renderLayers(map, newData),
    remove: () => {
      map.remove();
    }
  };
}

function renderLayers(map, data) {
  if (!data) {
    return;
  }
  let selectedPOICentroid;

  const arcLayer = new MapboxLayer({
    id: 'deckgl-connections',
    type: ArcLayer,
    data: data,
    getSourcePosition: d => selectedPOICentroid,
    // getSourcePosition: d => [parseFloat(d.Hex_Long), parseFloat(d.Hex_Lat)],
    getTargetPosition: d => [d.LGA_Long, d.LGA_Lat],
    getSourceColor: [255, 0, 128],
    getTargetColor: [0, 200, 255],
    getWidth: d => Math.max(2, d.visits / 1000)
  });

  const selectPOI = hex => {
    const [lat, lng] = hex;
    selectedPOICentroid = [lat, lng];
    console.log(hex)
    console.log(selectedPOICentroid[0])
    arcLayer.setProps({
      data: data.filter(d =>[d.LGA_Long, d.LGA_Lat])
    });
  };

  const poiLayer = new MapboxLayer({
    id: 'heatmap',
    type: HexagonLayer,
    data: data,
    opacity: 0.4,
    pickable: true,
    autoHighlight: true,
    getPosition: d => [parseFloat(d.Hex_Long), parseFloat(d.Hex_Lat)],
    getRadius: d => parseInt(d.visits),
    onClick: (object) => object && selectPOI(object.coordinate),
    // getHexagon: d => d.id,
    // getFillColor: d => colorScale(d.count),
    extruded: true,
    elevationScale: 10,
    stroked: false
  });

  map.addLayer(poiLayer);
  map.addLayer(arcLayer);

  selectPOI([150.13056603318063, -36.02574230088401]);
//   selectPOI([150.0995457221807, -35.98609020344866]);
}


export async function loadAndRender(container) {
  const data = await load(
    './hex_lga_filter.csv',
    CSVLoader
  );
  renderToDOM(container, data);
}