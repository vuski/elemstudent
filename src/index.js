// 변경해야 하는 변수들
const schoolInfo = "./schoolInfo_2026.tsv";
const countMax = 2168;
const yearCount = 19;
let countFrom = 0;
let countTo = countMax;
let filteredCount = 7083;
const lastYear = "2026";
const COL_OFFSET = 26;
////////////////////////////////////
// 그 밖에도 class_2026 및 student_2026 를 변경해야 함

import { Deck } from "@deck.gl/core";
import {
  ScatterplotLayer,
  PathLayer,
  PolygonLayer,
  TextLayer,
  BitmapLayer,
  SolidPolygonLayer,
  GeoJsonLayer,
} from "@deck.gl/layers";
import { DataFilterExtension } from "@deck.gl/extensions";
import { CSVLoader } from "@loaders.gl/csv";
import { JSONLoader } from "@loaders.gl/json";
import { TileLayer } from "@deck.gl/geo-layers";
import { load } from "@loaders.gl/core";
import { MapboxOverlay } from "@deck.gl/mapbox";
//const {JSONLoader, load} = json;

import ionRangeSlider from "ion-rangeslider";

import * as maplibregl from "maplibre-gl";

TextLayer.fontAtlasCacheLimit = 10;

// webpack 번들 안에서는 MapLibre 가 워커 파일 위치를 못 찾으므로 직접 지정한다.
// (npm run build 때 scripts/copy-maplibre.js 가 docs/ 로 복사함)
maplibregl.setWorkerUrl("./maplibre-gl-worker.js");

let labelVisibility = true;
let currentZoom = 6;
const map = createMap("container");
initMap(map);

const w0 = window.innerWidth;
const h0 = window.innerHeight;
// d3.select("#bottomBar")
//     .append("canvas")
//     .attr("id", "textCanvas")
//     .attr("width", w0)
//     .attr("height", 90);

const svg = d3
  .select("#container")
  .append("svg")
  .attr("id", "popupText")
  .attr("width", w0)
  .attr("height", h0)
  .style("pointer-events", "none");

const textFeature = svg.append("g");
const w = window.innerWidth;
let canvas1 = document.getElementById("textCanvas");
canvas1.width = w;
canvas1.height = 140; //w<800? 140 : 90;

const context1 = canvas1.getContext("2d");

// const canvas2 = document.getElementById('popupText');
// const context2 = canvas2.getContext("2d");

function createMap(containerID) {
  return new maplibregl.Map({
    container: containerID, // container ID
    style: "https://tiles.openfreemap.org/styles/positron", // OpenFreeMap (무료, 키 불필요)
    center: [127.6, 35.7], // starting position [lng, lat]
    zoom: 6, // starting zoom
    //projection: 'globe' // display the map as a 3D globe
  });
}

function initMap(map) {
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
  map.on("style.load", () => {
    const layers = map.getStyle().layers;

    for (let i = 0; i < layers.length; i++) {
      //국가·시도 경계선 없애기 (positron 의 boundary_2, boundary_3)
      if (layers[i].id === "boundary_2" || layers[i].id === "boundary_3") {
        map.setLayoutProperty(layers[i].id, "visibility", "none");
      }
      //지명을 한국어로 (positron 기본은 "영문 + 현지어" 두 줄). 도로 번호(ref)는 그대로 둔다.
      const textField = layers[i].layout && layers[i].layout["text-field"];
      if (
        layers[i].type === "symbol" &&
        textField &&
        JSON.stringify(textField).includes("name")
      ) {
        map.setLayoutProperty(layers[i].id, "text-field", [
          "coalesce",
          ["get", "name:ko"],
          ["get", "name:nonlatin"],
          ["get", "name"],
        ]);
      }
    }
  });
}

const deckOverlay = new MapboxOverlay({
  //interleaved: false,
  layers: [],
});

let size = 1;
// 변경해야 하는 변수들

let schoolData;
let show2008LastCount = false;
let showDiff = false;
let showLineChart = false;
let mainMenu = 0;
const colorPlus = [255, 20, 10]; //[224, 2, 87];//
const colorMinus = [255, 180, 33]; //[12, 187, 207];//
const colorClosed = [100, 100, 100]; //[120, 60, 15];

const colorPlusLine = [122, 10, 5]; //[110,1,43];
const colorMinusLine = [122, 90, 16]; //[6,90,100];//[12, 187, 207];//[220,60,20];
const colorClosedLine = [40, 40, 40]; //[30,15,7];

const nodeMap = new Map();
const nodeMapArr = new Array();

(async function loadData() {
  const schoolRaw = await load(schoolInfo, CSVLoader, {
    csv: {
      delimiter: "\t",
      header: true,
    },
  });

  //console.log(schoolRaw[0]);
  // 컬럼들을 순서대로 배열에 저장하기 위한 변수
  const columns = [];

  // 컬럼들의 순서에 따라 값을 배열에 저장
  for (const columnName in schoolRaw[0]) {
    columns.push(schoolRaw.map((row) => row[columnName]));
  }
  //console.log(columns);

  const temp = new Array();
  const yScale = 0.3;
  const dx = 24;

  for (let i = 0; i < schoolRaw.length; i++) {
    const d = schoolRaw[i];

    //일단 5179로 변환해서 그래프 모양 그리기
    const base = proj4("EPSG:4326", "EPSG:5179", [d.x, d.y]);
    //console.log(base);
    base[0] -= dx * (yearCount / 2); //중심점 가운데로 이동

    const polygon = new Array();
    const students = new Array(); //툴팁 막대 그래프용 연도별 학생 수
    polygon.push(base);
    let j, idx, count, xy;
    for (j = 0; j < yearCount; j++) {
      idx = j + COL_OFFSET;
      count = columns[idx][i];
      students.push(count);
      xy = [base[0] + j * dx, base[1] + count * yScale];
      //console.log(xy);
      polygon.push(xy);
    }
    //xy[1] = base[1];
    polygon.push([xy[0], base[1]]);
    polygon.push(base);
    //console.log(polygon);
    //다시 4326으로 변환
    for (let k = 0; k < polygon.length; k++) {
      const lonlat = proj4("EPSG:5179", "EPSG:4326", polygon[k]);
      polygon[k] = lonlat;
    }

    const datum = {
      addr: d.addr,
      name: d.name,
      polygon: polygon,
      cls2008: d.class_2008,
      clsLast: d.class_2026,
      persons2008: d.student_2008,
      persons: d.student_2026,
      students: students,
      x: d.x,
      y: d.y,
    };
    temp.push(datum);

    //autoComplete 용
    const datum0 = {
      x: d.x,
      y: d.y,
    };
    const label = d.name + "/" + d.sido + " " + d.gu;
    nodeMap.set(label, datum0);
    const nameShort = d.name.substring(0, d.name.indexOf("초등"));
    //console.log(nameShort);
    nodeMapArr.push({ label: label, value: nameShort });
  }

  schoolData = temp;
  //console.log(schoolData.filter(d=>d.persons<=10));
  return schoolRaw;
})().then((schoolData) => {
  //console.log("여ㅛ기");
  update();
  initAutoComplete();
});

const update = () => {
  const layers = [
    new GeoJsonLayer({
      id: "sgg-area",
      data: "./sgg.geojson",
      // Styles
      stroked: true,
      filled: false,
      lineWidthMinPixels: 1,
      getLineWidth: 2,
      opacity: 0.4,
      pickable: false,
      getLineColor: [155, 154, 136],
      //getFillColor: [200, 100, 100],
      visible: true,
    }),
    new GeoJsonLayer({
      id: "sido-area",
      data: "./sido.geojson",
      // Styles
      stroked: true,
      filled: false,
      lineWidthMinPixels: 2,
      getLineWidth: 3,
      opacity: 0.4,
      pickable: false,
      getLineColor: [155, 154, 136],
      //getFillColor: [200, 100, 100],
      visible: true,
    }),

    new PolygonLayer({
      id: "studentVariation",
      data: schoolData,
      stroked: false,
      filled: true,
      //wireframe: true,
      lineWidthMinPixels: 1,
      getPolygon: (d) => d.polygon,
      //getElevation: d => d.population / d.area / 10,
      getFillColor: (d) => {
        const alpha = 180;
        if (d.persons == 0) return [...colorClosed, 255];
        else
          return d.persons - d.persons2008 >= 0
            ? [...colorPlus, alpha]
            : [...colorMinus, alpha];
      },
      onHover: (info) => {
        showInfoBox(info);
      },
      onClick: (info) => {
        showInfoBox(info);
      },
      pickable: true,
      autoHighlight: true,
      getFilterValue: (d) => [d.persons],
      filterRange: [[countFrom, countTo]],

      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        getRadius: [currentZoom],
      },
      visible: showLineChart && mainMenu == 0,
      extensions: [new DataFilterExtension({ filterSize: 1 })],
      //getLineColor: [80, 80, 80],
      //getLineWidth: 1
    }),

    new PathLayer({
      id: "studentVariation-line",
      data: schoolData,
      lineWidthMinPixels: 1,
      getPath: (d) => d.polygon.slice(1, yearCount + 1),
      widthScale: 2,
      widthMinPixels: 1,
      getWidth: (d) => 5,
      getColor: (d) => {
        const alpha = 255;
        if (d.persons == 0) return [...colorClosedLine, 255];
        else
          return d.persons - d.persons2008 >= 0
            ? [...colorPlusLine, alpha]
            : [...colorMinusLine, alpha];
      },
      onHover: (info) => {
        showInfoBox(info);
      },
      onClick: (info) => {
        showInfoBox(info);
      },
      getFilterValue: (d) => [d.persons],
      filterRange: [[countFrom, countTo]],
      pickable: true,
      autoHighlight: true,
      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        getRadius: [currentZoom],
      },
      visible: showLineChart && mainMenu == 0,
      extensions: [new DataFilterExtension({ filterSize: 1 })],
    }),

    new ScatterplotLayer({
      id: "school",
      data: schoolData,

      // Styles
      filled: true,

      radiusMinPixels: 2,
      //sizeMaxPixels: 10,
      radiusScale: 1,
      getPosition: (d) => [d.x, d.y],
      getRadius: (d) => {
        return 3;
      },
      onHover: (info) => {
        showInfoBox(info);
      },
      onClick: (info) => {
        showInfoBox(info);
      },
      pickable: true,
      autoHighlight: true,
      radiusUnits: "pixels",
      getFillColor: (d) => {
        const alpha = 180;
        if (d.persons == 0) return [...colorClosed, 255];
        return d.persons - d.persons2008 >= 0
          ? [...colorPlus, alpha]
          : [...colorMinus, alpha];
      },
      // Interactive props
      visible: !showLineChart && mainMenu == 0,
      extensions: [new DataFilterExtension({ filterSize: 1 })],
      getFilterValue: (d) => [d.persons],
      filterRange: [[countFrom, countTo]],
    }),
    // new ScatterplotLayer({
    //   id: 'school1',
    //   data: schoolData.filter(d=>{
    //     return (d.persons>0) &&(d.persons - d.persons2008>=0);
    //   }),

    //   // Styles
    //   filled: true,

    //   radiusMinPixels: 3,
    //   //sizeMaxPixels: 10,
    //   radiusScale: 1,
    //   getPosition: d => [d.x,d.y],
    //   getRadius: d => {
    //     if (d.persons==0) return 0;
    //     else return (d.persons - d.persons2008>=0)?   plotSize: 0;
    //   },
    //   radiusUnits: 'meters',
    //   getFillColor: d => {
    //     return (d.persons - d.persons2008>=0)?   [...colorPlus, 255] : [...colorMinus,255]
    //   },
    //   // Interactive props

    //   visible : !showLineChart&&(mainMenu==0),
    //   extensions: [new DataFilterExtension({filterSize: 1})],
    //   getFilterValue: d => [d.persons],
    //   filterRange: [[countFrom, countTo]],
    // }),

    new ScatterplotLayer({
      id: "school2008",
      data: schoolData,
      // Styles
      filled: true,

      radiusMinPixels: 3,
      //sizeMaxPixels: 10,
      radiusScale: 7,
      getPosition: (d) => [d.x, d.y],
      getRadius: (d) => {
        if (mainMenu == 1) {
          return Math.sqrt(d.persons2008);
        } else {
          return Math.sqrt(d.persons);
        }
      },
      onHover: (info) => {
        showInfoBox(info);
      },
      onClick: (info) => {
        showInfoBox(info);
      },
      pickable: true,
      autoHighlight: true,
      radiusUnits: "meters",
      getFillColor: (d) => {
        if (mainMenu == 1) {
          return [181, 219, 64, 200];
        } else {
          return [118, 171, 44, 200];
        }
      },
      // Interactive props

      visible: mainMenu != 0,
      extensions: [new DataFilterExtension({ filterSize: 1 })],
      getFilterValue: (d) => [d.persons],
      filterRange: [[countFrom, countTo]],
      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        getRadius: [mainMenu],
        getFillColor: [mainMenu],
      },
    }),
    new TextLayer({
      id: "textPersons2008plus",
      data: schoolData, //.filter(d=>d.persons<=120),

      /* props from TextLayer class */

      // background: false,
      // backgroundPadding: [0, 0, 0, 0],
      // billboard: true,
      // characterSet: " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~",
      fontFamily: "Petendard-Regular",
      // fontSettings: {},
      // fontWeight: 'normal',
      getAlignmentBaseline: "top",
      getAngle: 0,
      // getBackgroundColor: [255, 255, 255, 255],
      // getBorderColor: [0, 0, 0, 255],
      // getBorderWidth: 0,
      getColor: (d) => {
        const alpha = 255;
        return [20, 20, 20, alpha];
        const diff = d.persons - d.persons2008;
        if (d.persons == 0) return [...colorClosedLine, 255];
        else if (diff >= 0) return [...colorPlusLine, alpha];
        else return [...colorMinusLine, alpha];
      },
      // getPixelOffset: [0, 0],
      getFilterValue: (d) => [d.persons],
      filterRange: [[countFrom, countTo]],
      getPosition: (d) => [d.x, d.y],
      getSize: (d) => {
        if (mainMenu == 1) {
          return Math.sqrt(d.persons2008);
        } else {
          return Math.sqrt(d.persons);
        }
      },
      getText: (d) => {
        if (mainMenu == 1) {
          return "" + d.persons2008;
        } else {
          return "" + d.persons;
        }
      },
      getTextAnchor: "middle",
      // lineHeight: 1,
      // maxWidth: -1,
      // outlineColor: [0, 0, 0, 255],
      // outlineWidth: 0,
      // sizeMaxPixels: Number.MAX_SAFE_INTEGER,
      // sizeMinPixels: 0,
      sizeScale: 5,
      sizeUnits: "meters",

      // wordBreak: 'break-word',

      /* props inherited from Layer class */

      // autoHighlight: false,
      // coordinateOrigin: [0, 0, 0],
      // coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      // highlightColor: [0, 0, 128, 128],
      // modelMatrix: null,
      // opacity: 1,
      //pickable: true,
      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        getSize: [mainMenu, currentZoom],
        getText: [mainMenu, currentZoom],
      },
      extensions: [new DataFilterExtension({ filterSize: 1 })],
      visible: mainMenu != 0 && currentZoom > 10,
      // visible: true,
      // wrapLongitude: false,
    }),
    new TextLayer({
      id: "textPersonsLast",
      data: schoolData, //.filter(d=>d.persons<=120),

      /* props from TextLayer class */

      // background: false,
      // backgroundPadding: [0, 0, 0, 0],
      // billboard: true,
      // characterSet: " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~",
      fontFamily: "Petendard-Regular",
      // fontSettings: {},
      // fontWeight: 'normal',
      getAlignmentBaseline: "center",
      getAngle: 0,
      // getBackgroundColor: [255, 255, 255, 255],
      // getBorderColor: [0, 0, 0, 255],
      // getBorderWidth: 0,
      getColor: (d) => {
        const alpha = 255;
        if (d.persons == 0) return [...colorClosedLine, 255];
        else
          return d.persons - d.persons2008 >= 0
            ? [...colorPlusLine, alpha]
            : [...colorMinusLine, alpha];
      },
      // getPixelOffset: [0, 0],
      getFilterValue: (d) => [d.persons],
      filterRange: [[countFrom, countTo]],
      getPosition: (d) => d.polygon[yearCount],
      getSize: (d) =>
        ((((currentZoom * currentZoom) / 100) * 1) / Math.pow(500, 0.35)) * 90,
      getText: (d) => "" + d.persons,
      getTextAnchor: "start",
      // lineHeight: 1,
      // maxWidth: -1,
      // outlineColor: [0, 0, 0, 255],
      // outlineWidth: 0,
      // sizeMaxPixels: Number.MAX_SAFE_INTEGER,
      // sizeMinPixels: 0,
      sizeScale: 1,
      sizeUnits: "pixels",

      // wordBreak: 'break-word',

      /* props inherited from Layer class */

      // autoHighlight: false,
      // coordinateOrigin: [0, 0, 0],
      // coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      // highlightColor: [0, 0, 128, 128],
      // modelMatrix: null,
      // opacity: 1,
      //pickable: true,
      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        getSize: [currentZoom],
      },
      extensions: [new DataFilterExtension({ filterSize: 1 })],
      visible: showLineChart && show2008LastCount && mainMenu == 0,
      // visible: true,
      // wrapLongitude: false,
    }),
    new TextLayer({
      id: "textPersons2008",
      data: schoolData, //.filter(d=>d.persons<=120),

      /* props from TextLayer class */

      // background: false,
      // backgroundPadding: [0, 0, 0, 0],
      // billboard: true,
      // characterSet: " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~",
      fontFamily: "Petendard-Regular",
      // fontSettings: {},
      // fontWeight: 'normal',
      getAlignmentBaseline: "center",
      getAngle: 0,
      // getBackgroundColor: [255, 255, 255, 255],
      // getBorderColor: [0, 0, 0, 255],
      // getBorderWidth: 0,
      getColor: (d) => {
        const alpha = 255;
        if (d.persons == 0) return [...colorClosedLine, 255];
        else
          return d.persons - d.persons2008 >= 0
            ? [...colorPlusLine, alpha]
            : [...colorMinusLine, alpha];
      },
      // getPixelOffset: [0, 0],
      getFilterValue: (d) => [d.persons],
      filterRange: [[countFrom, countTo]],
      getPosition: (d) => d.polygon[1],
      getSize: (d) =>
        ((((currentZoom * currentZoom) / 100) * 1) / Math.pow(500, 0.35)) * 90,
      getText: (d) => "" + d.persons2008,
      getTextAnchor: "end",
      // lineHeight: 1,
      // maxWidth: -1,
      // outlineColor: [0, 0, 0, 255],
      // outlineWidth: 0,
      // sizeMaxPixels: Number.MAX_SAFE_INTEGER,
      // sizeMinPixels: 0,
      sizeScale: 1,
      sizeUnits: "pixels",
      // wordBreak: 'break-word',

      /* props inherited from Layer class */

      // autoHighlight: false,
      // coordinateOrigin: [0, 0, 0],
      // coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      // highlightColor: [0, 0, 128, 128],
      // modelMatrix: null,
      // opacity: 1,
      //pickable: true,
      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        getSize: [currentZoom],
      },
      extensions: [new DataFilterExtension({ filterSize: 1 })],
      visible: showLineChart && show2008LastCount && mainMenu == 0,
      // visible: true,
      // wrapLongitude: false,
    }),
    new TextLayer({
      id: "textPersonsDiff",
      data: schoolData, //.filter(d=>d.persons<=120),

      /* props from TextLayer class */

      // background: false,
      // backgroundPadding: [0, 0, 0, 0],
      // billboard: true,
      // characterSet: " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~",
      fontFamily: "Petendard-Regular",

      // fontSettings: {},
      // fontWeight: 'normal',
      getAlignmentBaseline: "top",
      getAngle: 0,
      // getBackgroundColor: [255, 255, 255, 255],
      // getBorderColor: [0, 0, 0, 255],
      // getBorderWidth: 0,
      getColor: (d) => {
        const alpha = 255;
        const diff = d.persons - d.persons2008;
        if (d.persons == 0) return [...colorClosedLine, 255];
        else if (diff >= 0) return [...colorPlusLine, alpha];
        else return [...colorMinusLine, alpha];
      },
      // getPixelOffset: d => {
      //   const diff = d.persons - d.persons2008;
      //   const offset =(currentZoom*currentZoom/100) *  1/Math.pow(d.persons,0.35) * 110;
      //   if (diff>0) return [0,-offset];
      //   else return [0, offset]
      // },
      getFilterValue: (d) => [d.persons],
      filterRange: [[countFrom, countTo]],
      getPosition: (d) => [d.x, d.y],
      getSize: (d) => {
        const diff = Math.abs(d.persons - d.persons2008);
        const size =
          ((currentZoom * currentZoom) / 100) * Math.pow(diff, 0.35) * 1.5;
        return Math.max(size, 13);
      },
      getText: (d) => {
        const diff = d.persons - d.persons2008;
        return (diff >= 0 ? "+" : "") + "" + diff;
      },
      getTextAnchor: "middle",
      // lineHeight: 1,
      // maxWidth: -1,
      // outlineColor: [0, 0, 0, 255],
      // outlineWidth: 0,
      // sizeMaxPixels: Number.MAX_SAFE_INTEGER,
      // sizeMinPixels: 0,
      sizeScale: 1,
      sizeUnits: "pixels",
      // wordBreak: 'break-word',

      /* props inherited from Layer class */

      // autoHighlight: false,
      // coordinateOrigin: [0, 0, 0],
      // coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      // highlightColor: [0, 0, 128, 128],
      // modelMatrix: null,
      // opacity: 1,
      //pickable: true,
      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        getSize: [currentZoom],
        getPixelOffset: [currentZoom],
      },
      extensions: [new DataFilterExtension({ filterSize: 1 })],
      visible: showLineChart && showDiff && mainMenu == 0,
      // visible: true,
      // wrapLongitude: false,
    }),
    new TextLayer({
      id: "schoolName",
      data: schoolData, //.filter(d=>d.persons<=120),

      /* props from TextLayer class */
      characterSet: "auto",
      // background: false,
      // backgroundPadding: [0, 0, 0, 0],
      // billboard: true,
      // characterSet: " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~",
      fontFamily: "Petendard-Regular",
      // fontSettings: {},
      // fontWeight: 'normal',
      getAlignmentBaseline: (d) => {
        if (mainMenu == 0) return "bottom";
        else return "bottom";
      },
      getAngle: 0,
      // getBackgroundColor: [255, 255, 255, 255],
      // getBorderColor: [0, 0, 0, 255],
      // getBorderWidth: 0,
      getColor: (d) => {
        const alpha = 255;
        const diff = d.persons - d.persons2008;
        if (d.persons == 0) return [...colorClosedLine, 255];
        else if (diff >= 0) return [...colorPlusLine, alpha];
        else return [...colorMinusLine, alpha];
      },
      // getPixelOffset: d => {
      //   const diff = d.persons - d.persons2008;
      //   const offset =(currentZoom*currentZoom/100) *  1/Math.pow(d.persons,0.35) * 110;
      //   if (diff>0) return [0,-offset];
      //   else return [0, offset]
      // },
      getFilterValue: (d) => [d.persons],
      filterRange: [[countFrom, countTo]],
      getPosition: (d) => [d.x, d.y],
      getSize: (d) => {
        //const size = (currentZoom*currentZoom/100) *  Math.pow(100,0.35) * 20;
        return 40;
      },
      getText: (d) => {
        return d.name;
      },
      getTextAnchor: "middle",
      // lineHeight: 1,
      // maxWidth: -1,
      // outlineColor: [0, 0, 0, 255],
      // outlineWidth: 0,
      // sizeMaxPixels: Number.MAX_SAFE_INTEGER,
      // sizeMinPixels: 0,
      sizeScale: 1,
      sizeUnits: "meters",
      // wordBreak: 'break-word',

      /* props inherited from Layer class */

      // autoHighlight: false,
      // coordinateOrigin: [0, 0, 0],
      // coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
      // highlightColor: [0, 0, 128, 128],
      // modelMatrix: null,
      // opacity: 1,
      //pickable: true,
      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        getSize: [currentZoom],
        getPixelOffset: [currentZoom],
        getAlignmentBaseline: [mainMenu],
      },
      extensions: [new DataFilterExtension({ filterSize: 1 })],
      visible: showLineChart && showDiff,
      // visible: true,
      // wrapLongitude: false,
    }),
  ];

  deckOverlay.setProps({
    layers: layers,
  });

  let titleText = "";
  if (mainMenu == 0)
    titleText = "2008-" + lastYear + "년 초등학교별 학생 수 증감";
  else if (mainMenu == 1) titleText = "2008년 초등학교별 학생 수";
  else if (mainMenu == 2) titleText = lastYear + "년 초등학교별 학생 수";
  //console.log(canvas1.width, canvas1.height);
  context1.clearRect(0, 0, canvas1.width, canvas1.height);

  context1.fillStyle = "white"; // 텍스트의 색상을 빨간색으로 지정
  context1.textBaseline = "middle";
  context1.textAlign = "center";
  context1.fillStyle = "white";

  context1.font = "12px Pretendard-Regular";
  context1.fillText("지도 제작 : VWL Inc.", canvas1.width / 2, 125);

  context1.font = "12px Pretendard-Regular";
  context1.fillText(
    "데이터 : KESS교육통계서비스/학교알리미" +
      (mainMenu == 0 ? " | 색상 : 2008년 대비 증감" : ""),
    canvas1.width / 2,
    110
  );
  context1.font = "20px Pretendard-Regular";
  context1.fillText(titleText, canvas1.width / 2, 90);

  context1.fillStyle = "#c0c0c0"; // 텍스트의 색상을 빨간색으로 지정
  context1.font = "12px Pretendard-Regular";
  context1.fillText(
    lastYear + "년 학생 수 기준 필터: " + filteredCount + "개소",
    canvas1.width / 2,
    55
  );
};

const INFO_TEXT_H = 155; //정보 상자의 글자 부분 높이
const INFO_CHART_H = 150; //그 아래 막대 그래프 부분 높이

function showInfoBox(info) {
  if (info.object) {
    //console.log(info.object.name);
    //console.log(info);
    textFeature.selectAll(".number").remove();

    //상자 위치: 기본은 마우스 위쪽. 화면 위쪽 끝에서는 마우스 아래쪽으로, 좌우는 화면 안으로.
    const boxW = Math.min(400, window.innerWidth - 16);
    const boxH = INFO_TEXT_H + INFO_CHART_H;
    let by = info.y - 20 - boxH;
    if (by < 60) by = info.y + 20;
    by = Math.max(60, Math.min(by, window.innerHeight - boxH - 8));
    const bx = Math.max(8, Math.min(info.x - boxW / 2, window.innerWidth - boxW - 8));
    const cx = bx + boxW / 2;

    textFeature
      .append("rect")
      .attr("class", "number")
      .attr("x", bx)
      .attr("y", by)
      .attr("width", boxW)
      .attr("height", boxH)
      .style("fill", "black")
      .style("opacity", 0.8);
    textFeature
      .append("text")
      .attr("class", "number")
      .attr("dx", cx)
      .attr("dy", by + 36)
      .style("fill", "white")
      .attr("text-anchor", "middle")
      .style("font-size", 30)
      .style("opacity", 1)
      .text(info.object.name);
    textFeature
      .append("text")
      .attr("class", "number")
      .attr("dx", cx)
      .attr("dy", by + 70)
      .style("fill", "white")
      .attr("text-anchor", "middle")
      .style("font-size", 30)
      .style("opacity", 1)
      .text(
        (info.object.persons - info.object.persons2008 > 0 ? "+" : "") +
          (info.object.persons - info.object.persons2008) +
          "명"
      );
    textFeature
      .append("text")
      .attr("class", "number")
      .attr("dx", cx)
      .attr("dy", by + 95)
      .style("fill", "white")
      .attr("text-anchor", "middle")
      .style("font-size", 20)
      .style("opacity", 1)
      .text(
        "학생수 : " +
          info.object.persons2008 +
          "명(2008) → " +
          info.object.persons +
          "명(" +
          lastYear +
          ")"
      );
    textFeature
      .append("text")
      .attr("class", "number")
      .attr("dx", cx)
      .attr("dy", by + 120)
      .style("fill", "white")
      .attr("text-anchor", "middle")
      .style("font-size", 16)
      .style("opacity", 1)
      .text(
        "학급수 : " +
          info.object.cls2008 +
          "학급(2008) → " +
          info.object.clsLast +
          "학급(" +
          lastYear +
          ")"
      );

    textFeature
      .append("text")
      .attr("class", "number")
      .attr("dx", cx)
      .attr("dy", by + 145)
      .style("fill", "white")
      .attr("text-anchor", "middle")
      .style("font-size", 15)
      .style("opacity", 1)
      .text(info.object.addr);

    drawStudentBars(info.object, bx, by + INFO_TEXT_H, boxW, INFO_CHART_H);
  } else {
    textFeature.selectAll(".number").remove();
  }
}

//정보 상자 아래쪽에 연도별 학생 수 막대 그래프를 그린다.
//세로 축척은 학교마다 자기 최댓값에 맞추고, 수치는 반시계 90도 돌려 막대 위에 쓴다.
function drawStudentBars(school, x0, y0, width, height) {
  const padX = 16;
  const labelRoom = 34; //막대 위 세로 수치가 들어갈 자리
  const yearRoom = 22; //막대 아래 연도 자리
  const baseline = y0 + height - yearRoom;
  const maxBarH = height - labelRoom - yearRoom;
  const slot = (width - padX * 2) / yearCount;
  const barW = Math.max(4, slot * 0.7);
  const maxValue = Math.max(1, ...school.students);

  const diff = school.persons - school.persons2008;
  const color =
    school.persons == 0
      ? "rgb(150,150,150)" //폐교·휴교. 지도의 회색은 검은 바탕에서 잘 안 보여 밝게 쓴다.
      : `rgb(${(diff >= 0 ? colorPlus : colorMinus).join(",")})`;

  const g = textFeature.append("g").attr("class", "number");
  school.students.forEach((value, j) => {
    const cx = x0 + padX + slot * j + slot / 2;
    const h = (value / maxValue) * maxBarH;
    if (h > 0) {
      g.append("path")
        .attr("d", roundedTopBar(cx - barW / 2, baseline - h, barW, h, 4))
        .style("fill", color);
    }
    g.append("text")
      .attr("transform", `translate(${cx},${baseline - h - 4}) rotate(-90)`)
      .attr("text-anchor", "start")
      .attr("dominant-baseline", "central")
      .style("fill", "white")
      .style("font-size", 11)
      .text(value);
    g.append("text")
      .attr("x", cx)
      .attr("y", baseline + 15)
      .attr("text-anchor", "middle")
      .style("fill", "#bbbbbb")
      .style("font-size", 10)
      .text(String(2008 + j).slice(2));
  });
  g.append("line")
    .attr("x1", x0 + padX)
    .attr("x2", x0 + width - padX)
    .attr("y1", baseline + 0.5)
    .attr("y2", baseline + 0.5)
    .style("stroke", "#777777")
    .style("stroke-width", 1);
}

//윗변 양쪽 모서리만 둥근 막대 (SVG path)
function roundedTopBar(x, y, w, h, r) {
  r = Math.min(r, w / 2, h);
  return (
    `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}` +
    `H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
  );
}

map.on("zoom", () => {
  textFeature.selectAll(".number").remove();
  currentZoom = map.getZoom();
  //console.log(currentZoom);
  setVariables(currentZoom);
  update();
});
map.on("move", () => {
  textFeature.selectAll(".number").remove();
});

function setVariables(currentZoom) {
  if (currentZoom > 10) {
    showLineChart = true;
  } else {
    showLineChart = false;
  }

  if (currentZoom > 11.5) {
    showDiff = true;
  } else {
    showDiff = false;
  }

  if (currentZoom > 13.7) {
    show2008LastCount = true;
  } else {
    show2008LastCount = false;
  }
}

//document.getElementById("container").onclick = update;
map.addControl(deckOverlay);

window.addEventListener("keydown", (e) => {
  // //console.log(e);
  // if (e.key=='1') {
  //   showLineChart = !showLineChart;
  // }
  // if (e.key=='2') {
  //   labelVisibility = !labelVisibility;

  // }
  if (e.key == " ") {
    mainMenu++;
    mainMenu = mainMenu % 3; //0은 보통, 1은 2008년 2는 2023년
    //console.log(mainMenu);
  }
  update();
});

const $rangeTime = $("#timeSlider");
$rangeTime.ionRangeSlider();
const sliderInstance = $rangeTime.data("ionRangeSlider");

sliderInstance.update({
  skin: "round",
  type: "double",
  //grid : true,
  min: 0,
  max: countMax,
  //values: valueGrid,
  from: 0,
  to: countMax,
  step: 1,
  //prettify_enabled: true,
  //prettify_separator: ",",
  //prettify : (n) => ( Math.pow(Math.exp(1),n).toFixed(2)),
  postfix: "명",
  // onStart: (sliderData) => {
  //   yearFrom = sliderData.from;
  //   yearTo = sliderData.to;
  //   update();
  // },
  onChange: (sliderData) => {
    countFrom = sliderData.from;
    countTo = sliderData.to;
    filteredCount = schoolData.filter(
      (d) => d.persons <= countTo && d.persons >= countFrom
    ).length;
    update();
  },
});

window.addEventListener("resize", function () {
  const w = window.innerWidth,
    h = window.innerHeight;

  canvas1.width = w;
  canvas1.height = 140; // w<800? 140 : 90;
  // d3.select("#textCanvas")
  //     .attr("width", w)
  //     .attr("height", 90);
  d3.select("#popupText").attr("width", w).attr("height", h);
  update();
});

document.querySelector("#switchbox_showDiff").addEventListener(
  "toggleBefore",
  (event) => {
    labelVisibility = window.easyToggleState.isActive(event.target);
    const lv = labelVisibility ? "visible" : "none";
    const layers = map.getStyle().layers;

    for (let i = 0; i < layers.length; i++) {
      if (layers[i].type === "symbol" && layers[i].layout["text-field"]) {
        // 텍스트 레이블을 담당하는 레이어를 찾았습니다.
        // 이 레이어를 제거하거나 숨깁니다.
        map.setLayoutProperty(layers[i].id, "visibility", lv);
      }
    }

    update();
  },
  false
);

// document.querySelector("#switchbox_showText").addEventListener("toggleAfter", event => {
//   show2008LastCount = window.easyToggleState.isActive(event.target);
//   update();
// }, false);

///////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////
/////// 검색 창 ////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

function initAutoComplete() {
  const defaultText = " 학교 이름 앞 부분만 입력하세요";

  $("#searchInput").on("focus", function () {
    if ($(this).val() === defaultText) {
      $(this).val("");
      $(this).removeClass("default-text");
    }
  });

  $("#searchInput").on("blur", function () {
    if ($(this).val() === "") {
      $(this).val(defaultText);
      $(this).addClass("default-text");
    }
  });

  $("#searchInput")
    .autocomplete({
      //오토 컴플릿트 시작
      source: function (request, response) {
        const matcher = new RegExp(
          $.ui.autocomplete.escapeRegex(request.term),
          "i"
        );
        const results = $.grep(nodeMapArr, function (item) {
          return matcher.test(item.value); // 검색어와 'value' 필드를 비교
        });
        response(results);
      },
      select: function (event, ui) {
        //아이템 선택시
        //console.log("ui.item:",ui.item);
        //console.log(ui.item);
        //console.log(ui.item.value);
        //const name = ui.item.value;
        focusNode(ui.item);
        //$(this).attr("value","");
      },
      focus: function (event, ui) {
        //포커스 가면
        return false; //한글 에러 잡기용도로 사용됨
      },
      minLength: 1, // 최소 글자수
      autoFocus: false, //첫번째 항목 자동 포커스 기본값 false
      classes: {
        //잘 모르겠음
        "ui-autocomplete": "highlight",
      },
      delay: 100, //검색창에 글자 써지고 나서 autocomplete 창 뜰 때 까지 딜레이 시간(ms)
      //disabled: true, //자동완성 기능 끄기
      position: { my: "left top", at: "left bottom" }, //잘 모르겠음
      close: function (event) {
        //자동완성창 닫아질때 호출
        //$(this).attr("value","");
        //console.log(event);
      },
    })
    .autocomplete("instance")._renderItem = function (ul, item) {
    //요 부분이 UI를 마음대로 변경하는 부분
    //const gu = "/"+nodeMap.get(item.value).gu;
    return $("<li>") //기본 tag가 li로 되어 있음
      .append("<div>" + item.label + "</div>") //여기에다가 원하는 모양의 HTML을 만들면 UI가 원하는 모양으로 변함.
      .appendTo(ul);
  };

  $("#searchInput").on("keydown", function (event) {
    if (event.key == "Enter") {
      if ($("#searchInput").val().length == 0) {
        event.preventDefault();
        return false;
      }
      const name = event.target.value;
      if (nodeMap.has(name)) {
        focusNode(name);
      }
      $(this).val("");
    }
  });

  $("#searchInput").val(defaultText);
  $("#searchInput").addClass("default-text");
}

function focusNode(item) {
  //console.log("focusNode!!:",d);

  const value = nodeMap.get(item.label);

  map.flyTo({
    center: [value.x, value.y],
    zoom: 14.3, // 원하는 줌 레벨
    speed: 1, // 애니메이션 속도
    curve: 1, // 애니메이션 곡선 형태
    essential: true, // 애니메이션이 사용자 입력에 의해 중단되지 않도록 함
  });
}

const modal = document.getElementById("infoModal");
const btn = document.querySelector(".showInform");
const modalContent = document.querySelector(".modal-content");

$("#infoModal").css("display", "block");

// When the user clicks the button, open the modal
btn.onclick = function () {
  modal.style.display = "block";
  setTimeout(function () {
    modal.style.opacity = 1;
  }, 50);
};

// When the user clicks anywhere in the modal content, close the modal
modalContent.onclick = function () {
  modal.style.opacity = 0;
  setTimeout(function () {
    modal.style.display = "none";
  }, 500);
};

// When the user clicks anywhere outside of the modal content, close it
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.opacity = 0;
    setTimeout(function () {
      modal.style.display = "none";
    }, 500);
  }
};

const messages = [
  "2008-" + lastYear + "년 학생 수 증감 지도",
  "2008년 학생 수 지도",
  lastYear + "년 학생 수 지도",
];

$(".toggleMap").on("click", function () {
  mainMenu++;
  mainMenu = mainMenu % 3; //0은 보통, 1은 2008년 2는 2023년
  //console.log(mainMenu);
  $(".tooltip").text(messages[mainMenu]);
  $(".tooltip").css("visibility", "visible").css("opacity", "1");
  setTimeout(function () {
    $(".tooltip").css("visibility", "hidden").css("opacity", "0");
  }, 2000); // Tooltip will disappear after 2 seconds.

  update();
});
