const schoolInfo = './schoolInfo.tsv';


import {Deck}  from '@deck.gl/core';
import {ScatterplotLayer, PathLayer,PolygonLayer,TextLayer, BitmapLayer, SolidPolygonLayer, GeoJsonLayer} from '@deck.gl/layers';
import {DataFilterExtension} from '@deck.gl/extensions';
import {CSVLoader} from '@loaders.gl/csv';
import {JSONLoader} from '@loaders.gl/json'
import {TileLayer} from '@deck.gl/geo-layers';
import {load} from '@loaders.gl/core';
import {MapboxOverlay} from '@deck.gl/mapbox';
//const {JSONLoader, load} = json; 

import ionRangeSlider from 'ion-rangeslider';

import mapboxgl from 'mapbox-gl';
import MapboxLanguage from '@mapbox/mapbox-gl-language';

TextLayer.fontAtlasCacheLimit = 10;

mapboxgl.accessToken = 'pk.eyJ1Ijoic2JraW00MjciLCJhIjoiY2o4b3Q0aXd1MDdyMjMzbnRxYTdvdDZrbCJ9.GCHi6-mDGEkd3F-knzSfRQ';
let labelVisibility = true;
let currentZoom = 6;
const map = createMap('container');
initMap(map);

const w0= window.innerWidth;
const h0= window.innerHeight;
// d3.select("#bottomBar")
//     .append("canvas")
//     .attr("id", "textCanvas")
//     .attr("width", w0)
//     .attr("height", 90);  

const svg =d3.select("#container")
    .append("svg")
    .attr("id", "popupText")
    .attr("width", w0)
    .attr("height", h0)
    .style("pointer-events", "none");

const textFeature = svg.append("g");
const w = window.innerWidth;
let canvas1 = document.getElementById('textCanvas');
canvas1.width = w;
canvas1.height = w<800? 140 : 90;

const context1 = canvas1.getContext("2d");

// const canvas2 = document.getElementById('popupText');
// const context2 = canvas2.getContext("2d");

function createMap(containerID) {
  return  new mapboxgl.Map({
      container: containerID, // container ID
      //style: 'mapbox://styles/mapbox/streets-v11', // style URL
      style:  'mapbox://styles/sbkim427/cl6ool43r003o14kwmd8ogdwc',
      center: [ 127.6, 35.7], // starting position [lng, lat]
      zoom: 6, // starting zoom 
      //projection: 'globe' // display the map as a 3D globe
  });    
}

function initMap(map) { 
  //map.dragRotate.disable(); 
  //map.touchZoomRotate.disableRotation();    
  map.addControl(new MapboxLanguage({
      defaultLanguage: 'ko'    
    },
  ));
// map.on('style.load', () => {
//     map.setFog({}); // Set the default atmosphere style
// });
}

const deckOverlay =  new MapboxOverlay({
  //interleaved: false,
  layers: []
}); 

let size = 1; 
const countMax = 2278;
const yearCount = 16;
let countFrom = 0;
let countTo = countMax;
let filteredCount = 6981;
let schoolData;
let showText = false;
let showDiff = true;
let normalMode = true;
let mainMenu = 0;
const colorPlus = [224, 2, 87];//[199, 10, 83];
const colorMinus = [12, 187, 207];// [255,120,33];
const colorClosed = [100,100,100];//[120, 60, 15];

const colorPlusLine = [110,1,43];
const colorMinusLine = [6,90,100];//[12, 187, 207];//[220,60,20];
const colorClosedLine = [40,40,40];//[30,15,7];

const plotSize = 1000;
(async function loadData() {
  const schoolRaw = await load(schoolInfo, CSVLoader, {
    csv : {
      delimiter : '\t',
      header : true,
    }
  });
  
  //console.log(schoolRaw[0]);
  // 컬럼들을 순서대로 배열에 저장하기 위한 변수
  const columns = [];

  // 컬럼들의 순서에 따라 값을 배열에 저장
  for (const columnName in schoolRaw[0]) {    
    columns.push(schoolRaw.map(row => row[columnName]));
  }
  //console.log(columns);

  const temp = new Array();
  const yScale = 0.3;
  const dx = 24;


  for (let i=0 ; i<schoolRaw.length ; i++) {

    const d = schoolRaw[i];

    //일단 5179로 변환해서 그래프 모양 그리기
    const base = proj4('EPSG:4326','EPSG:5179',[d.x,d.y]);
    //console.log(base);
    base[0] -= dx * (yearCount/2); //중심점 가운데로 이동

    const polygon = new Array();
    polygon.push(base);
    let j, idx, count, xy;
    for (j=0 ; j<yearCount ; j++) {
      idx = j+23;
      count = columns[idx][i];
      xy = [base[0]+(j*dx), base[1] + (count*yScale)];
      //console.log(xy);
      polygon.push(xy);
    }     
    //xy[1] = base[1];
    polygon.push([xy[0], base[1]]);
    polygon.push(base);
    //console.log(polygon);
    //다시 4326으로 변환
    for (let k=0 ; k<polygon.length ; k++) {
      const lonlat = proj4('EPSG:5179','EPSG:4326',polygon[k]);
      polygon[k] = lonlat;
    }

    const datum = {
      addr : d.addr,      
      name : d.name,
      polygon : polygon,
      cls2008 : d.class_2008,
      cls2023 : d.class_2023,      
      persons2008 : d.student_2008,
      persons : d.student_2023,
      x : d.x,
      y : d.y
    };
    temp.push(datum);
  }



  schoolData = temp;
  console.log(schoolData.filter(d=>d.persons<=10));
  return schoolRaw;
})().then( (schoolData) => {
  //console.log("여ㅛ기");
  update();
}); 





const update = () => {

  const layers =  [

    // new GeoJsonLayer({
    //   id: 'sgg-area',
    //   data: sggName,
    //   // Styles
    //   stroked: true,
    //   filled: false,
    //   lineWidthMinPixels: 1,
    //   opacity: 0.4,
    //   pickable: true,
    //   getLineColor: [60, 60, 60],
    //   //getFillColor: [200, 100, 100],
    //   visible : true
    // }),

    

    new PolygonLayer({
      id: 'studentVariation',
      data: schoolData,
      stroked: false,
      filled: true,
      //wireframe: true,
      lineWidthMinPixels: 1,
      getPolygon: d => d.polygon,
      //getElevation: d => d.population / d.area / 10,
      getFillColor:  d => {
        const alpha = 180;
        if (d.persons == 0) return [...colorClosed, 255];
        else return (d.persons - d.persons2008>=0)?   [...colorPlus, alpha] : [...colorMinus,alpha]
      },
      onHover: (info) => {
        showInfoBox(info);
      },
      onClick: (info) => {
        showInfoBox(info);
        
      },
      getFilterValue: d => [d.persons],
      filterRange: [[countFrom, countTo]],
      pickable: true,
      autoHighlight: true,
      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        getRadius : [currentZoom]       
      },
      visible : normalMode&&(mainMenu==0),
      extensions: [new DataFilterExtension({filterSize: 1})]    
      //getLineColor: [80, 80, 80],
      //getLineWidth: 1
    }),


    new PathLayer({
      id: 'studentVariation-line',
      data: schoolData,
      lineWidthMinPixels: 1,
      getPath: d => d.polygon.slice(1, yearCount+1),
      widthScale: 2,
      widthMinPixels: 1,
      getWidth: d => 5,
      getColor:  d => {
        const alpha = 255;
        if (d.persons == 0) return [...colorClosedLine, 255];
        else return (d.persons - d.persons2008>=0)?   [...colorPlusLine, alpha] : [...colorMinusLine,alpha]
      },
      onHover: (info) => {
        showInfoBox(info);
        
      },
      onClick: (info) => {
        showInfoBox(info);
        
      },
      getFilterValue: d => [d.persons],
      filterRange: [[countFrom, countTo]],
      pickable: true,
      autoHighlight: true,
      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        getRadius : [currentZoom]       
      },
      visible : normalMode&&(mainMenu==0),
      extensions: [new DataFilterExtension({filterSize: 1})]    

    }),

  
    new ScatterplotLayer({
      id: 'school',
      data: schoolData.filter(d=>{
        return (d.persons==0) || (d.persons - d.persons2008<0);
      }),
      
      // Styles
      filled: true,

      radiusMinPixels: 3,
      //sizeMaxPixels: 10,
      radiusScale: 1,
      getPosition: d => [d.x,d.y],
      getRadius: d => {
        if (d.persons==0) return plotSize;
        else return (d.persons - d.persons2008>=0)?   0: plotSize;
      },
      radiusUnits: 'meters',
      getFillColor: d => {
        if (d.persons==0) return [...colorClosed, 255];
        return (d.persons - d.persons2008>=0)?   [...colorPlus, 255] : [...colorMinus,255]
      },
      // Interactive props
      
      visible : !normalMode&&(mainMenu==0),
      extensions: [new DataFilterExtension({filterSize: 1})],
      getFilterValue: d => [d.persons],
      filterRange: [[countFrom, countTo]],
    }),
    new ScatterplotLayer({
      id: 'school1',
      data: schoolData.filter(d=>{
        return (d.persons>0) &&(d.persons - d.persons2008>=0);
      }),
      
      // Styles
      filled: true,

      radiusMinPixels: 3,
      //sizeMaxPixels: 10,
      radiusScale: 1,
      getPosition: d => [d.x,d.y],
      getRadius: d => {
        if (d.persons==0) return 0;
        else return (d.persons - d.persons2008>=0)?   plotSize: 0;
      },
      radiusUnits: 'meters',
      getFillColor: d => {      
        return (d.persons - d.persons2008>=0)?   [...colorPlus, 255] : [...colorMinus,255]
      },
      // Interactive props
      
      visible : !normalMode&&(mainMenu==0),
      extensions: [new DataFilterExtension({filterSize: 1})],
      getFilterValue: d => [d.persons],
      filterRange: [[countFrom, countTo]],
    }),

    new ScatterplotLayer({
      id: 'school2008',
      data: schoolData,      
      // Styles
      filled: true,

      radiusMinPixels: 3,
      //sizeMaxPixels: 10,
      radiusScale: 7,
      getPosition: d => [d.x,d.y],
      getRadius: d => {
        if (mainMenu==1) {
          return Math.sqrt(d.persons2008);        
        } else {
          return Math.sqrt(d.persons);        
        }
       
      },
      radiusUnits: 'meters',
      getFillColor: d => {  
        
          return [...colorMinus,200];
         
       
      },
      // Interactive props
      
      visible : (mainMenu!=0),
      extensions: [new DataFilterExtension({filterSize: 1})],
      getFilterValue: d => [d.persons],
      filterRange: [[countFrom, countTo]],
      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        getRadius : [mainMenu],
        getFillColor: [mainMenu],
       
      },
    }),
    new TextLayer({
      id: 'textPersons2008plus',
      data: schoolData,//.filter(d=>d.persons<=120),
              
      /* props from TextLayer class */
      
      // background: false,
      // backgroundPadding: [0, 0, 0, 0],
      // billboard: true,
      // characterSet: " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~",
      fontFamily: 'Petendard-Regular',
      // fontSettings: {},
      // fontWeight: 'normal',
      getAlignmentBaseline: 'center',
      getAngle: 0,
      // getBackgroundColor: [255, 255, 255, 255],
      // getBorderColor: [0, 0, 0, 255],
      // getBorderWidth: 0,
      getColor: [0, 0, 0, 255],
      // getPixelOffset: [0, 0],
      getFilterValue: d => [d.persons],
      filterRange: [[countFrom, countTo]],
      getPosition: d => [d.x, d.y],
      getSize: d=> {
        if (mainMenu==1) {
          return Math.sqrt(d.persons2008);        
        } else {
          return Math.sqrt(d.persons);        
        }
       
      },
      getText: d => {
        if (mainMenu==1) {
          return ""+d.persons2008; 
        } else {
          return ""+d.persons;
        }
      },
      getTextAnchor: 'middle',
      // lineHeight: 1,
      // maxWidth: -1,
      // outlineColor: [0, 0, 0, 255],
      // outlineWidth: 0,
      // sizeMaxPixels: Number.MAX_SAFE_INTEGER,
      // sizeMinPixels: 0,
      sizeScale: 5,
      sizeUnits: 'meters',
     
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
        getSize : [mainMenu],
        getText: [mainMenu],
       
      },
      extensions: [new DataFilterExtension({filterSize: 1})],
      visible :(mainMenu!=0)
      // visible: true,
      // wrapLongitude: false,
    }),
      new TextLayer({
        id: 'textPersons2023',
        data: schoolData,//.filter(d=>d.persons<=120),
                
        /* props from TextLayer class */
        
        // background: false,
        // backgroundPadding: [0, 0, 0, 0],
        // billboard: true,
        // characterSet: " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~",
        fontFamily: 'Petendard-Regular',
        // fontSettings: {},
        // fontWeight: 'normal',
        getAlignmentBaseline: 'center',
        getAngle: 0,
        // getBackgroundColor: [255, 255, 255, 255],
        // getBorderColor: [0, 0, 0, 255],
        // getBorderWidth: 0,
        // getColor: [0, 0, 0, 255],
        // getPixelOffset: [0, 0],
        getFilterValue: d => [d.persons],
        filterRange: [[countFrom, countTo]],
        getPosition: d => d.polygon[16],
        getSize: d=> (currentZoom*currentZoom/100) *  1/Math.pow(d.persons,0.35) * 90,
        getText: d => ""+d.persons,
        getTextAnchor: 'start',
        // lineHeight: 1,
        // maxWidth: -1,
        // outlineColor: [0, 0, 0, 255],
        // outlineWidth: 0,
        // sizeMaxPixels: Number.MAX_SAFE_INTEGER,
        // sizeMinPixels: 0,
        sizeScale: 1,
        sizeUnits: 'pixels',
       
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
          getSize : [currentZoom]
         
        },
        extensions: [new DataFilterExtension({filterSize: 1})],
        visible : normalMode&&showText&&(mainMenu==0)
        // visible: true,
        // wrapLongitude: false,
      }),
      new TextLayer({
        id: 'textPersons2008',
        data: schoolData,//.filter(d=>d.persons<=120),
                
        /* props from TextLayer class */
        
        // background: false,
        // backgroundPadding: [0, 0, 0, 0],
        // billboard: true,
        // characterSet: " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~",
        fontFamily: 'Petendard-Regular',
        // fontSettings: {},
        // fontWeight: 'normal',
        getAlignmentBaseline: 'center',
        getAngle: 0,
        // getBackgroundColor: [255, 255, 255, 255],
        // getBorderColor: [0, 0, 0, 255],
        // getBorderWidth: 0,
        // getColor: [0, 0, 0, 255],
        // getPixelOffset: [0, 0],
        getFilterValue: d => [d.persons],
        filterRange: [[countFrom, countTo]],
        getPosition: d => d.polygon[1],
        getSize: d=> (currentZoom*currentZoom/100) *  1/Math.pow(d.persons,0.35) * 60,
        getText: d => ""+d.persons2008,
        getTextAnchor: 'end',
        // lineHeight: 1,
        // maxWidth: -1,
        // outlineColor: [0, 0, 0, 255],
        // outlineWidth: 0,
        // sizeMaxPixels: Number.MAX_SAFE_INTEGER,
        // sizeMinPixels: 0,
        sizeScale: 1,
        sizeUnits: 'pixels',
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
          getSize : [currentZoom]
         
        },
        extensions: [new DataFilterExtension({filterSize: 1})],
        visible : normalMode&&showText&&(mainMenu==0)
        // visible: true,
        // wrapLongitude: false,
      }),
      new TextLayer({
        id: 'textPersonsDiff',
        data: schoolData,//.filter(d=>d.persons<=120),
                
        /* props from TextLayer class */
        
        // background: false,
        // backgroundPadding: [0, 0, 0, 0],
        // billboard: true,
        // characterSet: " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~",
        fontFamily: 'Petendard-Regular',

        // fontSettings: {},
        // fontWeight: 'normal',
        getAlignmentBaseline: 'top',
        getAngle: 0,
        // getBackgroundColor: [255, 255, 255, 255],
        // getBorderColor: [0, 0, 0, 255],
        // getBorderWidth: 0,
        getColor: d => {
          const alpha = 255;
          const diff = d.persons - d.persons2008;
          if (d.persons==0) return  [...colorClosedLine, 255];
          else if (diff>=0) return   [...colorPlusLine, alpha] ;
          else return[...colorMinusLine,alpha];
        },
        // getPixelOffset: d => {
        //   const diff = d.persons - d.persons2008;
        //   const offset =(currentZoom*currentZoom/100) *  1/Math.pow(d.persons,0.35) * 110;
        //   if (diff>0) return [0,-offset];
        //   else return [0, offset]
        // },
        getFilterValue: d => [d.persons],
        filterRange: [[countFrom, countTo]],
        getPosition: d => [d.x, d.y],
        getSize: d=> {
          const diff = Math.abs(d.persons - d.persons2008);
          const size = (currentZoom*currentZoom/100) *  Math.pow(diff,0.35) * 1.5;
          return Math.max(size, 13);
        },
        getText: d => {
          const diff = d.persons - d.persons2008;
          return (diff>=0? "+" : "") + ""+ diff;          
        },
        getTextAnchor: 'middle',
        // lineHeight: 1,
        // maxWidth: -1,
        // outlineColor: [0, 0, 0, 255],
        // outlineWidth: 0,
        // sizeMaxPixels: Number.MAX_SAFE_INTEGER,
        // sizeMinPixels: 0,
        sizeScale: 1,
        sizeUnits: 'pixels',
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
          getSize : [currentZoom],
          getPixelOffset :  [currentZoom],
         
        },
        extensions: [new DataFilterExtension({filterSize: 1})],
        visible : normalMode&&showDiff&&(mainMenu==0)  
        // visible: true,
        // wrapLongitude: false,
      }),
      new TextLayer({
        id: 'schoolName',
        data: schoolData,//.filter(d=>d.persons<=120),
                
        /* props from TextLayer class */
        characterSet : 'auto',
        // background: false,
        // backgroundPadding: [0, 0, 0, 0],
        // billboard: true,
        // characterSet: " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~",
        fontFamily: 'Petendard-Regular',
        // fontSettings: {},
        // fontWeight: 'normal',
        getAlignmentBaseline: 'bottom',
        getAngle: 0,
        // getBackgroundColor: [255, 255, 255, 255],
        // getBorderColor: [0, 0, 0, 255],
        // getBorderWidth: 0,
        getColor: d => {
          const alpha = 255;
          const diff = d.persons - d.persons2008;
          if (d.persons==0) return  [...colorClosedLine, 255];
          else if (diff>=0) return   [...colorPlusLine, alpha] ;
          else return[...colorMinusLine,alpha];
        },
        // getPixelOffset: d => {
        //   const diff = d.persons - d.persons2008;
        //   const offset =(currentZoom*currentZoom/100) *  1/Math.pow(d.persons,0.35) * 110;
        //   if (diff>0) return [0,-offset];
        //   else return [0, offset]
        // },
        getFilterValue: d => [d.persons],
        filterRange: [[countFrom, countTo]],
        getPosition: d => [d.x, d.y],
        getSize: d=> {
          
          //const size = (currentZoom*currentZoom/100) *  Math.pow(100,0.35) * 20;
          return 40;
        },
        getText: d => {          
          return d.name;    
        },
        getTextAnchor: 'middle',
        // lineHeight: 1,
        // maxWidth: -1,
        // outlineColor: [0, 0, 0, 255],
        // outlineWidth: 0,
        // sizeMaxPixels: Number.MAX_SAFE_INTEGER,
        // sizeMinPixels: 0,
        sizeScale: 1,
        sizeUnits: 'meters',
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
          getSize : [currentZoom],
          getPixelOffset :  [currentZoom],
         
        },
        extensions: [new DataFilterExtension({filterSize: 1})],
        visible : normalMode&&showDiff &&(mainMenu==0) 
        // visible: true,
        // wrapLongitude: false,
      })
    
  ];


  deckOverlay.setProps({
    layers : layers
  });  
  
  
  console.log(canvas1.width, canvas1.height);
  context1.clearRect(0, 0, canvas1.width, canvas1.height);

  context1.textBaseline = 'middle';
  context1.textAlign = 'center';
  context1.fillStyle = 'white';
  context1.font = '12px Pretendard-Regular';
  context1.fillText("데이터 : KESS교육통계서비스 | 필터링 된 학교 수 : "+ filteredCount+"개소 | 2008년 대비 증감에 따라 색상 구분",
   canvas1.width/2, 35);
  context1.font = '18px Pretendard-Regular';
  context1.fillText("2008-2023년 전국 초등학교 학생 수 증감 (폐교/휴교 포함)",
   canvas1.width/2, 15);


};


function showInfoBox(info) {
  if (info.object) {
          
    
    //console.log(info.object.name);
    //console.log(info);
    textFeature.selectAll(".number").remove();
    textFeature.append("rect")
              .attr("class", "number")
              .attr("x", info.x-250)
              .attr("y", info.y-145)
              .attr("width", 500)
              .attr("height", 125)
              .style("fill", "black")
              .style("opacity", 0.8);
    textFeature.append("text")
              .attr("class", "number")
              .attr("dx", info.x)
              .attr("dy", info.y-105)
              .style("fill", "white")
              .attr("text-anchor", "middle")
              .style("font-size", 30)
              .style("opacity", 1)
              .text(info.object.name+"  " + ((info.object.persons - info.object.persons2008)>0? "+":"")+ (info.object.persons - info.object.persons2008)+"명");
    textFeature.append("text")
              .attr("class", "number")
              .attr("dx", info.x)
              .attr("dy", info.y-80)
              .style("fill", "white")
              .attr("text-anchor", "middle")
              .style("font-size", 20)
              .style("opacity", 1)
              .text("학생수 : "+info.object.persons2008+"명(2008) → " + info.object.persons+"명(2023)");
    textFeature.append("text")
              .attr("class", "number")
              .attr("dx", info.x)
              .attr("dy", info.y-55)
              .style("fill", "white")
              .attr("text-anchor", "middle")
              .style("font-size", 16)
              .style("opacity", 1)
              .text("학급수 : "+info.object.cls2008+"학급(2008) → " + info.object.cls2023+"학급(2023)");

    textFeature.append("text")
              .attr("class", "number")
              .attr("dx", info.x)
              .attr("dy", info.y-30)
              .style("fill", "white")
              .attr("text-anchor", "middle")
              .style("font-size", 15)
              .style("opacity", 1)
              .text(info.object.addr);


  } else {
    textFeature.selectAll(".number").remove();
  }
}


map.on('zoom', () => {
  textFeature.selectAll(".number").remove();
  currentZoom = map.getZoom();
  update();

});
map.on('move', () => {
  textFeature.selectAll(".number").remove();
});

//document.getElementById("container").onclick = update;
map.addControl(deckOverlay);

window.addEventListener("keydown", (e) => {
  console.log(e);
  if (e.key=='1') {
    normalMode = !normalMode;
  }
  if (e.key=='2') {
    labelVisibility = !labelVisibility;
    const lv = labelVisibility? 'visible' : 'none';
    
    var layers = map.getStyle().layers;

      for (var i = 0; i < layers.length; i++) {
          if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
              // 텍스트 레이블을 담당하는 레이어를 찾았습니다.
              // 이 레이어를 제거하거나 숨깁니다.
              map.setLayoutProperty(layers[i].id, 'visibility', lv);
          }
      }
    
  }
  if (e.key=='3') {
    mainMenu++;
    mainMenu = mainMenu%3; //0은 보통, 1은 2008년 2는 2023년  
    console.log(mainMenu);
  }
  update();
});


const $rangeTime = $("#timeSlider");
$rangeTime.ionRangeSlider();
const sliderInstance = $rangeTime.data("ionRangeSlider");

sliderInstance.update({
  skin: "big",
  type: "double",
  //grid : true,
  min: 0,
  max: countMax,
  //values: valueGrid,
  from: 0,
  to : countMax,        
  step : 1,
  //prettify_enabled: true,
  //prettify_separator: ",",
  //prettify : (n) => ( Math.pow(Math.exp(1),n).toFixed(2)),
  postfix: "명",
  // onStart: (sliderData) => { 
  //   yearFrom = sliderData.from;
  //   yearTo = sliderData.to;
  //   update();
  // },
  onChange:  (sliderData) => { 
    countFrom = sliderData.from;
    countTo = sliderData.to;
    filteredCount = schoolData.filter(d=>d.persons<=countTo&& d.persons>=countFrom).length;
    update();
  }
});




window.addEventListener('resize', function() {
  const w = window.innerWidth, h = window.innerHeight;

  canvas1.width = w;
  canvas1.height = w<800? 140 : 90;
  // d3.select("#textCanvas")
  //     .attr("width", w)
  //     .attr("height", 90);  
  d3.select("#popupText")
      .attr("width", w)
      .attr("height", h);  
  update();
});

document.querySelector("#switchbox_showText").addEventListener("toggleAfter", event => {
  showText = window.easyToggleState.isActive(event.target);
  update();
}, false);

document.querySelector("#switchbox_showDiff").addEventListener("toggleBefore", event => {
  showDiff = window.easyToggleState.isActive(event.target);
  update();
}, false);