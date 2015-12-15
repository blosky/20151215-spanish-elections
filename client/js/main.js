import WorldMap from './worldmap'
import { LocationMarker } from './items'
import d3 from 'd3'
import bean from 'fat/bean'
import { sizeToStr } from './lib/humanize'
import Svgo from './workers/svgo'
import polyfill from 'babel/polyfill'
import AutocompleteDropdown from './autocomplete'
import domready from 'ded/domready'

var $ = document.querySelectorAll.bind(document)
var $1 = document.querySelector.bind(document)

class App {

    constructor() {
        this.svgo = new Svgo();

        this.createDropDownMenu();
        this.mapEl = document.getElementById("map");

        this.downloadButtonEl = document.querySelector('.btn--download')
        this.linkButtonEl = document.querySelector('.btn--link')
        this.locationInputEl = $1('#location-input')

        // info else
        this.projectionEl = $1('#info-projection')
        this.sizeEl = $1('#info-size')
        this.gzippedSizeEl = $1('#info-gzipped-size')
        this.centerPointEl = $1('#info-latlong')
        this.scaleEl = $1('#info-scale')
        this.simplificationEl = $1('#info-simplification')

        //tools
        this.locationMarkerTool = $1('#tools #location-marker');
        bean.on(this.locationMarkerTool, 'click', e => {
            var marker = new LocationMarker({coords: this.map.geoCenter})
            this.map.addItem(marker);
        });

        var map = this.map = new WorldMap({
            el: this.mapEl,
            width: 620,
            height: 465,
            initialScale: 130,
            jsonRoot: "client/json/"
        })

        bean.on($1('.minimap-controls'), 'change', 'input', e => {
            map.setMinimap(e.target.value);
        })

        map.on('changed', this.processSVG.bind(this))
        map.on('fullredraw.start', this.onRenderStart.bind(this))
        map.on('loaded', this.onMapLoad.bind(this))
        map.on('info', info => {
            this.projectionEl.innerHTML = info.projection
            this.centerPointEl.innerHTML = `${info.center[0].toFixed(2)}, ${info.center[1].toFixed(2)}`
            this.scaleEl.innerHTML = Math.round(info.scale)
            this.simplificationEl.innerHTML = info.simplification.toFixed(5);
        })

    }

    onMapLoad() {
        this.autocomplete.loadOptions(this.map.locationList);
        this.createDimensions();
        bean.on(document.getElementById('reset'), 'click', _ => this.map.reset())
        bean.on(document.getElementById('zoom-in'), 'click', _ => this.map.zoomIn() )
        bean.on(document.getElementById('zoom-out'), 'click', _ => this.map.zoomOut() )
        this.loadState();
    }

    createDimensions() {
        bean.on(document.getElementById('update-btn'), 'click', _ => {
            this.map.resize({
                width: Number(document.getElementById('w').value),
                height: Number(document.getElementById('h').value)
            });
        })
    }

    createDropDownMenu() {
        this.autocomplete = new AutocompleteDropdown({
            el: document.getElementById('autocomplete'),
            placeholder: 'find a location...'
        });
    }

    generateOutputSvg(data) {
        return this.svgo.load(data).then( svg => {
            return new Promise(function(resolve, reject) {
                this.svgo.process(
                    {plugins: svgoPlugins, gzip: true, floatPrecision: 1},
                    resultFile => resolve(resultFile));
            }.bind(this));
        });
    }

    loadState() {
        var match = /^\?state=(.+)$/.exec(location.search);
        if (match && match[1]) {
            var state = JSON.parse(atob(match[1]));
            this.map.loadState(state);
        }
    }

    processSVG() {
        this.sizeEl.innerHTML = sizeToStr(this.mapEl.innerHTML.length);
        this.gzippedSizeEl.innerHTML = 'loading…'
        if (this.mapEl.innerHTML.length < 10 * 1000 * 1000) {
            this.gzippedSizeEl.innerHTML = 'calculating…';
            this.generateOutputSvg(this.mapEl.innerHTML).then(outputSvg => {
                window.svg = outputSvg;
                var svgBody = outputSvg.text.replace(/^<svg (.*?)>/, "<svg $1 xmlns='http://www.w3.org/2000/svg'>")
                this.downloadButtonEl.href = `data:image/svg+xml,${svgBody}`;
                var dateString = (new Date()).toJSON().replace(':', '-');
                this.downloadButtonEl.download = `magicmap_${dateString}.svg`;

                outputSvg.size({compress: true}).then(size =>
                    this.gzippedSizeEl.innerHTML = sizeToStr(size)
                )
            })
        } else this.gzippedSizeEl.innerHTML = 'TOO BIG';
    }

    onRenderStart() {
        var state = this.map.getState();
        var b64state = btoa(JSON.stringify(state));
        this.linkButtonEl.href = location.origin + '/?state=' + b64state;
        this.sizeEl.innerHTML = this.gzippedSizeEl.innerHTML = 'loading…'

    }
}

var svgoPlugins = {
    cleanupAttrs: false,
    cleanupEnableBackground: false,
    cleanupIDs: false,
    cleanupListOfValues: false,
    cleanupNumericValues: false,
    collapseGroups: false,
    convertColors: false,
    convertPathData: true,
    convertShapeToPath: false,
    convertStyleToAttrs: false,
    convertTransform: false,
    mergePaths: false,
    moveElemsAttrsToGroup: false,
    moveGroupAttrsToElems: false,
    removeComments: false,
    removeDesc: false,
    removeDoctype: false,
    removeEditorsNSData: false,
    removeEmptyAttrs: false,
    removeEmptyContainers: false,
    removeEmptyText: false,
    removeHiddenElems: false,
    removeMetadata: false,
    removeNonInheritableGroupAttrs: false,
    removeRasterImages: false,
    removeTitle: false,
    removeUnknownsAndDefaults: false,
    removeUselessDefs: false,
    removeUnusedNS: false,
    removeUselessStrokeAndFill: false,
    removeViewBox: false,
    removeXMLProcInst: false,
    sortAttrs: false,
    transformsWithOnePath: false
};

domready(() => new App())
