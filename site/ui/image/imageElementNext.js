/* global require, single, document, states, requestAnimationFrame */

'use strict';

import PanelComponent from './../panelComponent';

import flashStep from './steps/_flashStep';
import zoomStep from './steps/_zoomStep';
import faceStep from './steps/_faceStep';
import emotionStep from './steps/_emotionStep';
import mutliAuraStep from './steps/next/_multiAuraStep';
import backgroundStep from './steps/next/_backgroundStep';
import vignetteStep from './steps/next/_vignetteStep';
import haloStep from './steps/next/_haloStep';
import chromeStep from './steps/next/_chromeStep';

import * as faceUtils from '../_faceUtils';
import * as animationUtils from '../_animationUtils';
import * as geometryUtils from '../_geometryUtils';
import canvasUtils from './_canvasUtils';
import * as imageConst from './_imageConst';
const Timeline = require('gsap/src/minified/TimelineMax.min.js');

export default class ImageElement extends PanelComponent {
  constructor(imgPath = null, jsonPath = null, readyCallback = null) {
    super();

    this.canvasWidth = single ? imageConst.BACKEND_CANVAS_WIDTH : imageConst.CANVAS_WIDTH;
    this.canvasHeight = single ? imageConst.BACKEND_CANVAS_HEIGHT : imageConst.CANVAS_HEIGHT;

    this.canvas = null;
    this.context = null;

    this.width = 0;
    this.height = 0;

    this.imageElement = null;

    this.scrimAlpha = 0;

    this.eyeMidpoints = [];
    this.eyesMidpoint = new geometryUtils.Point();
    this.allEyesCenter = new geometryUtils.Point();

    this.canvasSnapshot = null;

    this.offsetX = 0;
    this.offsetY = 0;

    this.image = null;

    this.resizedImageOffset = null;
    this.subRect = {};

    this.imageScale = 1;

    this.faceBounds = null;

    this.facesAndEmotions = [];
    this.curFace = [];
    this.hexR = 1;

    this.tweens = [];
    this.timelines = [];

    this.treatments = {};

    this.resizedImageScale = 0;
    
    this.isDrawing = false;
    this.auraAnimations = null;
    this.readyCallback = readyCallback;

    this.hexVertices = [];

    this.init();
  }

  init() {
    if (this.imageElement) {
      return;
    }

    this.imageElement = document.createElement('div');
    this.imageElement.classList.add('image');

    this.canvasUtils = new canvasUtils(this);

    this.canvas = this.canvasUtils.createHiDPICanvas(this.canvasWidth, this.canvasHeight, 4);
    this.canvas.classList.add('image-canvas');
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;

    this.imageElement.appendChild(this.canvas);

    this.context = this.canvas.getContext('2d');

    this.faceStep = new faceStep(this, this.canvas, this.context);
    this.zoomStep = new zoomStep(this, this.canvas, this.context);

    animationUtils.setSmoothing(this.context);
  }

  loadImage(json, imgPath) {
    this.canvasUtils.loadImage(json, imgPath);
  }

  startAnimations() {
    if (single) {
      this.zoom(0, true);
      this.startAuraAnimations();
    } else {
      super.startAnimations(() => {
        this.startAuraAnimations();
      });
    }
  }

  startAuraAnimations() {
    this.auraAnimations = new Timeline({
      onComplete: () => {
        super.killTimeline(this.auraAnimations);
      }
    });

    const auraAnimStates = this.faces.length === 1 ? states.STATES_AURA_SINGLE : states.STATES_AURA_MULTIPLE;

    auraAnimStates.forEach((state) => {
      this.auraAnimations.to(this, Math.max(state.DURATION, animationUtils.MIN_DURATION), {
        onStart: () => {
          if (this[state.NAME]) {
            this[state.NAME](state.DURATION);
          } else {
            this.pause(state.DURATION);
          }
        }
      });
    });

    this.timelines.push(this.auraAnimations);
  }

  reinitFaces(json) {
    super.reinitFaces(json, () => {
      const stepsToKill = [this.flashStep, this.faceStep, this.zoomStep, this.emotionStep, this.backgroundStep, this.mutliAuraStep, this.vignetteStep, this.haloStep, this.chromeStep];
      stepsToKill.forEach((step) => {
        if (step) {
          step.kill();
          step = null;
        }
      });

      this.faceStep = new faceStep(this, this.canvas, this.context);
      this.zoomStep = new zoomStep(this, this.canvas, this.context);

      this.backgroundFill = 'blue';
      this.totalEmotions = 0;
      this.imageScale = 1;
      this.hexVertices = [];
      this.facesAndEmotions = faceUtils.generateFacesAndEmotions(this.faces);
      this.facesAndStrongestEmotions = faceUtils.generateFacesAndEmotions(this.faces, true);
      this.treatments = animationUtils.generateTreatments(this.facesAndStrongestEmotions);
      this.eyeMidpoints = faceUtils.generateEyeMidpoints(this.faces);
      this.faceBounds = faceUtils.generateFaceBounds(this.faces);
      this.allEyesCenter = faceUtils.generateAllEyesCenter(this.faces);
      let totalEmotions = 0;
      this.facesAndEmotions.forEach((face) => {
        totalEmotions += Object.keys(face).length;
      });
      this.noEmotions = totalEmotions === 0;
      this.totalEmotions = totalEmotions;
      this.scrimAlpha = 0;
      this.fills = [];
      this.vignettePattern = null;
      this.resizedImageOffset = null;
      this.resizedImageScale = 0;
      this.auraAnimations = null;
      this.offsetX = 0;
      this.offsetY = 0;
    });
  }

  ifNotDrawing(callback) {
    requestAnimationFrame(() => {
      if (this.isDrawing) {
        this.imageElement.ifNotDrawing(callback);
      } else {
        callback();
      }
    });
  }

  //

  flash(duration = 0) {
    this.flashStep = new flashStep(this, this.canvas, this.context, duration);
  }

  zoom(duration = 0) {
    this.zoomStep.zoom(duration, false);
  }

  face(duration = 0) {
    this.faceStep.face(duration);
  }

  forehead(duration = 0) {
    this.faceStep.forehead(duration);
  }

  eyes(duration = 0) {
    this.faceStep.eyes(duration);
  }

  ears(duration = 0) {
    this.faceStep.ears(duration);
  }

  nose(duration = 0) {
    this.faceStep.nose(duration);
  }

  mouth(duration = 0) {
    this.faceStep.mouth(duration);
  }

  chin(duration = 0) {
    this.faceStep.chin(duration);
  }

  allFeatures(duration = 0) {
    this.faceStep.allFeatures(duration);
  }

  zoomOut(duration = 0) {
    this.zoomStep.zoom(duration, true);
  }

  emotion(duration = 0) {
    this.emotionStep = new emotionStep(this, this.canvas, this.context, duration);
  }

  animateInBackground(duration = 0) {
    this.backgroundStep = new backgroundStep(this, this.canvas, this.context, duration);
  }

  animateInMultiAura(duration = 0) {
    this.mutliAuraStep = new mutliAuraStep(this, this.canvas, this.context, duration);
  }

  animateInVignette(duration = 0) {
    this.vignetteStep = new vignetteStep(this, this.canvas, this.context, duration);
  }

  animateInHalo(duration = 0) {
    this.haloStep = new haloStep(this, this.canvas, this.context, duration);
  }

  chrome(duration = 0) {
    this.chromeStep = new chromeStep(this, this.canvas, this.context, duration);
  }
  
}
