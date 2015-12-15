import d3 from 'd3'
import d3geo from 'd3/d3-geo-projection'
import queue from 'mbostock/queue'
import topojson from 'mbostock/topojson'
import _ from 'lodash'
import { debounce } from 'lodash/function'
import { sortBy, partition } from 'lodash/collection'
import { uniq } from 'lodash/array'
import { GilbertMinimap, FeatureMinimap } from './minimap'
import { boundsPolygon } from './lib/bounds.js'
import externalFontCss from './styles/fonts.css!text'
import GeoQuadTree from './lib/geoquadtree.js'
import config from '../json/config.json!json'
import { Scale } from './scale.js'
import Emitter from './lib/emitter'

Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
}

Number.prototype.map = function (in_min, in_max, out_min, out_max, fn = _=>_) {
    var linear = (this - in_min) / (in_max - in_min);
    return fn(linear) * (out_max - out_min)  + out_min;
}

export default class WorldMap extends Emitter {
    constructor({el, width = 620, height = 485, initialScale = 100, jsonRoot = 'json/'}) {
        super()

        var self = this;
        this.version = '0.0.1';
        this.el = el;
        this.jsonRoot = jsonRoot;
        this.ratio = window.devicePixelRatio || 1;

        // state
        this.scale = this.initialScale = initialScale;
        this.textNodes = [];
        this.mapItems = [];
        this.highlighted = { iso3s: new Set() };
        this.width = width;
        this.height = height;
        this.mapHeight = this.height - config.styles.bottomPadding;
        this.mapWidth = this.width;

        this.initProjections();
        this.initZoomAndPan();
        this.textDrag = this.createTextDragger();

        this.svg = d3.select(this.el).append('svg')
            .attr("width", this.width)
            .attr("height", this.height)
            .call(this.zoom)
            .on("dblclick.zoom", null)
            .on('mousemove', d => this.selectCountryOnMouseup = false)

        this.clipPath = this.svg
            .append('defs')
                .append('clipPath')
                .attr('id', 'mapClipPath')
                    .append('rect')
                    .attr('x', 0).attr('y', 0)
                    .attr('width', this.mapWidth)
                    .attr('height', this.mapHeight);

        this.svg.append("rect") // background
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill", "white");

        this.style = this.svg.append('style');
        this.style.html(externalFontCss);

        var mapGroup = this.svg.append('g').attr('clip-path', `url(#mapClipPath)`)
        this.groups = { // layer order - bottom to top
            map: mapGroup,
            countries: mapGroup.append('g')
                .attr('fill', '#e0e0e0'),
            majorRoads: mapGroup
                .append('g')
                .attr('class', 'major-roads')
                .attr('fill', 'none')
                .attr('stroke-width', '1.5')
                .attr('stroke', '#e0e0e0'),
            otherRoads: mapGroup
                .append('g')
                .attr('class', 'other-roads')
                .attr('fill', 'none')
                .attr('stroke', '#e0e0e0'),
            boundaries: mapGroup
                .append('g')
                .attr('fill', 'none')
                .attr('stroke-line-join', 'round')
                .attr('stroke', '#A8B0B2'),
            conflictBordersBg: mapGroup
                .append('g')
                .attr('class', 'confict-borders-bg')
                .attr('stroke', 'white')
                .attr('stroke-width', '1px')
                .attr('fill', 'none'),
            conflictBorders: mapGroup
                .append('g')
                .attr('class', 'confict-borders')
                .attr('stroke', '#647882')
                .attr('stroke-width', '1px')
                .attr('fill', 'none')
                .attr('stroke-dasharray', '3, 3'),
            icons: mapGroup.append('g').attr('class', 'icons'),
            labels: mapGroup.append('g').attr('class', 'labels'),
            items: mapGroup.append('g').attr('class', 'items'),
            scale: this.svg.append('g').attr('class', 'scale')
        };

        this.paths = {
            boundaries: this.groups.boundaries.append('path')
        }

        this.loadData()
    }

    initProjections() {
        this.projection = this.kavrayskiy7 =
            d3.geo.kavrayskiy7()
                .rotate([0, 0])
                .translate(this.viewportCenter)
                .scale(this.scale)
                .precision(.3)
                .clipExtent([
                    [0, 0],
                    [this.mapWidth, this.mapHeight]
                ]);

        this.azimuthalEquidistant =
            d3.geo.azimuthalEquidistant()
                .rotate([0, 0])
                .translate(this.viewportCenter)
                .scale(this.scale)
                .precision(.3)
                .clipAngle(45)
                .clipExtent([
                    [0, 0],
                    [this.mapWidth, this.mapHeight]
                ]);

        this.transverseMercator =
            d3.geo.transverseMercator()
                .rotate([0, 0])
                .translate(this.viewportCenter)
                .scale(this.scale)
                .precision(.3)
                .clipExtent([
                    [0, 0],
                    [this.mapWidth, this.mapHeight]
                ]);
        var self = this;
        this.simplify = d3.geo.transform({
          point: function(x, y, z) {
            if (z >= self.simplifyArea) this.stream.point(x, y);
          }
        });
    }

    createPaths() {
        this.path = d3.geo.path().projection(this.projection)
        this.simplifyingPath = d3.geo.path().projection({stream: s => this.simplify.stream(this.projection.stream(s))});
    }

    createTextDragger() {
        var clickOffset;
        var self = this;
        return d3.behavior.drag()
            .on("dragstart", function() {
                var screenAnchorPoint = self.projection(this.__data__.textCoords);
                var screenClickPoint = self.currentMousePos;
                clickOffset = [screenAnchorPoint[0] - screenClickPoint[0], screenAnchorPoint[1] - screenClickPoint[1]];
                d3.event.sourceEvent.stopPropagation()
            })
            .on("drag", function() {
                var mousePos = self.currentMousePos;
                var afterOffset = [mousePos[0] + clickOffset[0], mousePos[1] + clickOffset[1]];
                this.__data__.textCoords = self.projection.invert(afterOffset);
                self.drawTextNodes();
            });
    }

    initZoomAndPan() {
        this.zoomDebouncedRedraw = debounce(function() {
            this.fullRedraw();
        }.bind(this), 50)

        this.onZoomEnd = function() {
            this.oldMousePos = undefined;
            this.zoomDebouncedRedraw();
        }

        this.zoom = d3.behavior.zoom()
            .on('zoomstart', this.onZoomStart.bind(this))
            .on('zoom', this.onZoom.bind(this) )
            .on('zoomend', this.onZoomEnd.bind(this))
            .size([this.mapWidth, this.mapHeight])
            .center(this.viewportCenter)
            .scaleExtent([this.initialScale, 40000])
            .translate(this.projection.translate())
        this.zoom.scale(this.projection.scale());
    }

    getState() {
        return {
            ver: this.version,
            center: this.geoCenter,
            highlighted: this.highlighted,
            scale: this.projection.scale(),
            width: this.width,
            height: this.height,
            nodes: this.textNodes,
            minimap: this.minimapName
        }
    }

    resetZoom() {
        var [lat,lon] = this.projection.translate();
        this.zoom.scale(this.projection.scale());
        this.zoom.translate(this.projection.translate());
    }

    loadState(state) {
        this.highlighted = state.highlighted
        this.highlighted.iso3s = new Set(this.highlighted.iso3s)
        this.centerOnPoint(state.center, state.scale)
        this.width = state.width
        this.height = state.height
        this.textNodes = state.nodes
        this.minimap = this.minimaps[state.minimap]
        this.fullRedraw();
    }

    get viewportCenter() { return [this.mapWidth / 2, this.mapHeight / 2] }
    get geoCenter() {return this.projection.invert(this.viewportCenter) }

    getProjectionForZoom(scale) {
        if (scale > 10000) return this.transverseMercator;
        if (scale > 500) return this.azimuthalEquidistant;
        else return this.kavrayskiy7;
    }

    centerOnPoint(point, scale) {
        if (scale) {
            this.projection = this.getProjectionForZoom(scale)
            this.projection.scale(scale);
        }
        if (this.projection === this.kavrayskiy7) {
            this.kavrayskiy7.rotate([-1*point[0], 0])
            this.kavrayskiy7.translate([this.mapWidth / 2, this.mapHeight / 2])
            var diff = this.viewportCenter[1] - this.kavrayskiy7(point)[1];
            this.kavrayskiy7.translate([this.mapWidth / 2, (this.mapHeight / 2) + diff])
        } else {
            this.projection.rotate([-1*point[0], -1*point[1]])
            this.projection.translate([this.mapWidth/2,this.mapHeight/2])
        }
        this.resetZoom();
    }

    get projectionName() {
        var projections = ['kavrayskiy7', 'azimuthalEquidistant', 'transverseMercator'];
        return projections.find(p => this.projection === this[p])
    }

    get minimapName() {
        var minimaps = ['country','continent','world'];
        return minimaps.find(p => this.minimap === this.minimaps[p])
    }

    addItem(item) {
        item.init(this)
        item.on('changed', _ => this.emit('changed'))
        item.render(this.projection)
        this.emit('changed')
        this.mapItems.push(item)
    }

    onZoom() {
        // scale/zoom
        var changingProjection = this.projection !== this.getProjectionForZoom(d3.event.scale);
        this.centerOnPoint(this.geoCenter, d3.event.scale)
        // click-drag behaviour
        var mousePos = this.currentMousePos;
        if (!changingProjection && d3.event.sourceEvent && d3.event.sourceEvent.type === 'mousemove' && this.oldMousePos) {
            let dx = this.oldMousePos[0] - mousePos[0]
            let dy = this.oldMousePos[1] - mousePos[1]
            let [oldYaw, oldPitch, oldRoll] = this.projection.rotate()
            let [oldTranslateX, oldTranslateY] = this.projection.translate()
            let scale = this.projection.scale()
            let mouseScale = 70 / scale

            if (this.projection === this.kavrayskiy7) {
                // x-axis = rotation yaw, y-axis = vertical translation
                let yaw = oldYaw - dx*mouseScale;
                this.projection.rotate([yaw, 0, 0]);
                this.projection.translate([oldTranslateX, oldTranslateY - dy])
                // translate Y clamping
                var padding = 20;
                var diffTop = this.projection([0,90])[1] - padding;
                var diffBottom = this.mapHeight - padding - this.projection([0,-90])[1];
                if (diffTop > 0) {
                    var trans = this.projection.translate()
                    this.projection.translate([trans[0], trans[1] - diffTop]);
                } else if (diffBottom > 0) {
                    var trans = this.projection.translate()
                    this.projection.translate([trans[0], trans[1] + diffBottom]);
                }
            } else { // equidistant and mercator
                // x-axis = rotation yaw, y-axis = rotation pitch
                let yaw = oldYaw - dx*mouseScale;
                let pitch = (oldPitch + (dy * mouseScale)).clamp(-80, 120);
                this.projection.rotate([yaw, pitch, 0]);
            }
        }

        this.quickRedraw();
        this.oldMousePos = mousePos;
    }

    get currentMousePos() {
        return d3.event.sourceEvent && [d3.event.sourceEvent.pageX, d3.event.sourceEvent.pageY];
    }

    onZoomStart() {
        if(d3.event.sourceEvent) {
            this.newMousePos = this.currentMousePos;
            this.zoomDebouncedRedraw.cancel();
        }
    }

    getSimplifyArea() {
        var scale = this.zoom.scale();
        var mostComplex = 0, zoomedInLimit = 10000
        var mostSimple = 0.1, zoomedOutLimit = 100
        var clampedScale = scale.clamp(zoomedOutLimit, zoomedInLimit);
        return clampedScale.map(zoomedInLimit, zoomedOutLimit, mostComplex, mostSimple, x => Math.pow(x, 20))
    }

    asyncRender(data, step, renderFn) {
        return new Promise(function(resolve, reject) {
            var len = data.length;
            var i = 0;
            var drawNext = function() {
                if (i < len) {
                    this.asyncRedrawTimeout = window.requestAnimationFrame(function() {
                        var start = i++ * step
                        renderFn(d3.selectAll(data.slice(start, start + step)))
                        drawNext();
                    }.bind(this))
                } else resolve();
            }.bind(this)
            drawNext();
        }.bind(this))
    }

    drawBoundingBoxes(data) {
        if (config.showBoundingBoxes) {
            this.groups.boundingBox =
                this.groups.boundingBox ||
                this.svg.append('g').attr('class', 'bounding-boxes')
                    .attr('opacity', 0.3)
                    .attr('fill', 'red')
                    .attr('stroke', 'black')

            var path = d3.geo.path().projection(this.projection);

            var countries = this.groups.boundingBox.selectAll('path').data(data, d => d.properties.id)
            // append new
            countries.enter().append('path').attr('class', d => d.properties.iso3)
            // remove old
            countries.exit().remove();
            // update all
            countries.attr('d', d => path(d.boundsPolygon));

        } else if (this.groups.boundingBox) {
            this.groups.boundingBox.remove();
            this.groups.boundingBox = undefined;
        }
    }

    drawLand(quick) {
        var useLowData = quick && this.projection.scale() < 2000;
        var data = this.data.mergedWorld

        this.simplifyArea = quick ? 0.0035 : this.getSimplifyArea();

        this.paths.land
            .datum(data)
            .attr('d', this.simplifyingPath);
    }

    drawCountries(quick) {
        var useLowData = quick && this.projection.scale() < 2000;
        var path = this.path
        var data = (useLowData ? this.data.worldLow : this.data.worldHigh);

        if (config.countryCulling) {
            data = data.filter(d =>
                d.boundsPolygon.coordinates[0].length === 1 || /*quick-fix for broken polygons*/
                d.properties.id === "RUA" || /* quick-fix for russia's broken bounding box */
                path(d.boundsPolygon));
        }

        var path = useLowData ? this.path : this.simplifyingPath;
        this.simplifyArea = quick ? 0.0035 : this.getSimplifyArea();

        var countries = this.groups.countries.selectAll('path').data(data, d => d.properties.id)
        // append new
        countries.enter().append('path')
            .on('mousedown', d => this.selectCountryOnMouseup = true)
            .on('mouseup', d => { if (this.selectCountryOnMouseup) this.clickCountry(d) })
        // remove old
        countries.exit().remove();
        // update all
        countries.attr('class', d => d.properties.iso3);
        var renderCountries = selection =>
            selection
                .attr('d', path)
                .attr('fill', d => this.highlighted.iso3s.has(d.properties.iso3) ? config.styles.highlightedCountryColor : '')

        if (quick) renderCountries(countries);
        else {
            this.asyncRender(countries[0], 25, renderCountries)
                .then(_ => {
                    this.el.classList.remove('map--rendering');
                    this.emit('changed');
                })
        }
    }

    drawBorders(quick) {
        var path = quick ? this.path : this.simplifyingPath;
        var boundaryData = quick ? this.data.boundariesLow : this.data.boundariesHigh;
        this.paths.boundaries.attr("d", path(boundaryData));
        this.conflictBordersBgSelection.attr('d', this.path);
        this.conflictBordersSelection.attr('d', this.path);
    }

    drawRoads(quick) {

       if (this.highlighted.iso3s.size > 0 && this.projection.scale() > config.showRoadsScale) {
            this.simplifyArea = quick ? 0.009 : this.getSimplifyArea();
            var intersectFn = d => !!this.path(d)

            // major roads
            var majorRoadFeatures = this.majorRoadTree.getFeatures(intersectFn);
            var roads = this.groups.majorRoads.selectAll('path').data(majorRoadFeatures, d => d.properties.id)
            roads.enter().append('path')
            roads.exit().attr('d','')
            roads.attr('d', quick ? this.simplifyingPath : this.path);

            // other roads
            var otherRoadFeatures = this.otherRoadTree.getFeatures(intersectFn);
            var roads = this.groups.otherRoads.selectAll('path').data(otherRoadFeatures, d => d.properties.id)
            roads.enter().append('path')
            roads.exit().attr('d','')
            roads.attr('d', quick ? this.simplifyingPath : this.path);
        } else {
            this.groups.otherRoads.selectAll('path').attr('d', '');
            this.groups.majorRoads.selectAll('path').attr('d', '');
        }
    }

    setMinimap(name) {
        if (this.minimap) this.minimap.hide();
        this.minimap = /^none$/i.test(name) ? null : this.minimaps[name];
        this.drawMinimap(false);
        this.emit('changed');
    }

    drawMinimap(quick) {
        if (this.minimap) {
            var fastUpdating =
                this.minimap === this.minimaps.country ||
                this.minimap === this.minimaps.continent;
            if (!quick || fastUpdating) {
                var showBox = this.projection !== this.kavrayskiy7 || fastUpdating;
                this.minimap.render({
                    cx: this.geoCenter[0],
                    box: showBox && [
                        this.projection.invert([0,0]),
                        this.projection.invert([this.mapWidth, 0]),
                        this.projection.invert([this.mapWidth, this.mapHeight]),
                        this.projection.invert([0, this.mapHeight]),
                        this.projection.invert([0,0])
                    ]
                })
            }
        } else Object.keys(this.minimaps).forEach(k => this.minimaps[k].hide());
    }

    drawItems() {
        this.mapItems.forEach(i => i.render(this.projection));
    }

    drawTextNodes() {
        var styles = config.styles.textNodes;
        var positionDefinitions = config.styles.textNodes.positions;
        var positions = [
            'bottom', 'bottomleft', 'left', 'topleft',
            'top', 'topright', 'right', 'bottomright'
        ]

        this.textNodes
            .filter(node => !node.position)
            .forEach(node => {
                node.position = 'top';
                var distBetween = (dx, dy) => Math.sqrt(dx*dx + dy*dy);
                var nodes = this.textNodes
                    .filter(target => target !== node)
                    .map(target => {
                        var dx = target.coords[0] - node.coords[0], dy = target.coords[1] - node.coords[1];
                        var angle = (Math.atan2(dy, dx) * 180 / Math.PI);
                        return {
                            d: target,
                            angle: (-(angle - 90) + 360 + 22 ) % 360,
                            dist: distBetween(dx, dy)
                        };;
                    })
                    .sort((a,b) => a.dist - b.dist)
                if (nodes.length) {
                    var closest = nodes[0];
                    var index = Math.floor(Math.abs(closest.angle) / 45);
                    node.position = positions[index];
                }

            })

        var text = this.groups.labels.selectAll('text')
            .data(this.textNodes, d => d.id)
        text.exit().remove()
        text.enter().append('text')
            .attr('font-family', d => styles[d.type].fontFamily)
            .attr('fill', d => styles[d.type].color)
            .attr('font-size', d => styles[d.type].fontSize)
            .attr('font-weight', d => styles[d.type].fontWeight)
            .attr('text-anchor', d => positionDefinitions[d.position][0])
            .attr('dx', d => positionDefinitions[d.position][1])
            .attr('dy', d => positionDefinitions[d.position][2])
            .call(this.textDrag)

        text
            .attr("transform", d => "translate(" + this.projection(d.textCoords) + ")")
            .text(d => d.text)
    }

    drawCapital() {
        var capital = this.groups.icons.selectAll('rect')
            .data(this.textNodes.filter(n => n.type === 'capital'), d => d.id)

        capital.enter().append('rect')
            .attr('fill', '#808080')
            .attr('shape-rendering', 'crispEdges')
            .attr('width', config.styles.icons.capitalSize)
            .attr('height', config.styles.icons.capitalSize)
        capital.exit().remove()

        capital
            .attr('x', d => this.projection(d.coords)[0] - config.styles.icons.capitalSize/2)
            .attr('y', d => this.projection(d.coords)[1] - config.styles.icons.capitalSize/2)
    }

    drawCities() {
        var cities = this.groups.icons.selectAll('circle')
            .data(this.textNodes.filter(n => n.type === 'city'), d => d.id)

        cities.exit().remove();
        cities.enter().append('circle')
            .attr('fill', '#808080')
            .attr('r', config.styles.icons.citySize)
        cities
            .attr('cx', d => this.projection(d.coords)[0])
            .attr('cy', d => this.projection(d.coords)[1])
    }

    drawNodes() {
        this.drawCapital();
        this.drawCities();
        this.drawTextNodes();
    }

    drawScale() {
        if (this.projection.scale() > config.showScaleScale) {
            this.groups.scale.attr('display', '')
            this.groups.scale.attr('transform', `translate(${this.width - 1}, ${this.height - 20})`);

            var cy = this.mapHeight / 2;
            var [lat1, lon1] = this.projection.invert([0, cy]);
            var [lat2, lon2] = this.projection.invert([this.mapWidth, cy]);
            var width = this.mapWidth;
            this.scale.render({lat1, lon1, lat2, lon2, width});
        } else {
            this.groups.scale.attr('display', 'none')
        }
    }


    sendInfoEvents() {
        this.emit('info', {
            projection: this.projectionName,
            center: this.geoCenter,
            scale: this.projection.scale(),
            simplification: this.getSimplifyArea()
        });
    }

    quickRedraw() {
        this.cancelAsyncRedraw()

        this.createPaths()
        this.drawCountries(true)
        this.drawBoundingBoxes(this.data.worldLow)
        this.drawBorders(true)
        this.drawCities(true)
        this.drawRoads(true)
        this.drawMinimap(true)
        this.drawNodes(true)
        this.drawItems(true)
        this.drawScale()
        this.sendInfoEvents()
    }

    fullRedraw() { // asyncronous, cancellable redraw function to stop UI freezing
        this.cancelAsyncRedraw();
        this.createPaths();
        this.el.classList.add('map--rendering');
        this.emit('fullredraw.start');

        this.drawCountries(false);
        this.drawBoundingBoxes(this.data.worldHigh);
        this.drawBorders(false);
        this.drawCities();
        this.drawMinimap();
        this.drawNodes()
        this.drawItems()
        this.drawRoads(false);
        this.drawScale()
        this.sendInfoEvents();
    }

    cancelAsyncRedraw() {
        this.el.classList.remove('map--rendering');
        window.cancelAnimationFrame(this.asyncRedrawTimeout);
    }

    zoomToCountry(d) {
        var centroid = d3.geo.centroid(d);
        var rotate = [-centroid[0], -centroid[1]];
        var bounds = d3.geo.bounds(d),
            dx = bounds[1][0] - bounds[0][0],
            dy = bounds[1][1] - bounds[0][1],
            scale = 40 / Math.max(dx / this.mapWidth, dy / this.mapHeight);

        this.centerOnPoint(centroid, scale);
    }

    isCapital(d) { return d.properties.featurecla === "Admin-0 capital"; }

    textNodeFromCityData(d) {
        var type = this.isCapital(d) ? 'capital' : 'city';
        return {
            id: `${type}-${d.properties.name}`,
            iso3: d.properties.adm0_a3,
            coords: d.geometry.coordinates,
            textCoords: d.geometry.coordinates,
            text: d.properties.name,
            type: type
        };
    }

    getTextNodesForCountry(id) {
        var d = this.data.worldHigh.find(d => d.properties.id === id)

        var centroid = d3.geo.centroid(d);

        var countryNode = {
            id: 'country-' + d.properties.admin,
            iso3: d.properties.iso3,
            coords: centroid,
            textCoords: centroid,
            text: config.merged.indexOf(d.properties.name) !== -1 || d.properties.admin === d.properties.name ?
                d.properties.admin :
                `${d.properties.name} (${d.properties.admin})`,
            type: 'country'
        }

        var iso3 = d.properties.iso3

        var capitalNodes = this.data.capitalCities
            .filter(d => d.properties.adm0_a3 === iso3)
            .map(this.textNodeFromCityData.bind(this))

        var populusNodes = this.data.populusCities
            .filter(d => d.properties.adm0_a3 === iso3)
            .sort((a,b) => b.properties.pop_max - a.properties.pop_max)
            .slice(0,2)
            .map(this.textNodeFromCityData.bind(this));

        return populusNodes.concat(countryNode, capitalNodes)

    }

    loadCountryIntoMinimaps(d) {
        this.minimaps.continent.selectFeature(this.data.minimapFeatures[d.properties.continent])
        this.minimaps.subregion.selectFeature(this.data.minimapFeatures[d.properties.subregion])
        this.minimaps.country.selectFeature(this.data.minimapFeatures[d.properties.name])
    }

    clickCountry(d) {
        if (!this.highlighted.iso3s.has(d.properties.iso3)) this.selectCountry(d)
        else this.deselectCountry(d);
        this.quickRedraw()
        this.fullRedraw()
    }

    deselectCountry(d) {
        this.highlighted.iso3s.delete(d.properties.iso3)
        this.textNodes = this.textNodes.filter(n => n.iso3 !== d.properties.iso3)
    }

    selectCountry(d) {
        this.highlighted.iso3s.add(d.properties.iso3)
        this.loadCountryIntoMinimaps(d)
        this.textNodes = this.textNodes.concat(this.getTextNodesForCountry(d.properties.id))
    }

    focusCountry(d) {
        this.selectCountry(d)
        this.zoomToCountry(d)
        this.quickRedraw();
        this.fullRedraw();
    }

    focusCity(d) {
        var iso3 = d.properties.adm0_a3;
        var country = this.data.worldHigh.find(d => d.properties.iso3 === iso3)
        this.selectCountry(country)
        this.zoomToCountry(country)
        this.centerOnPoint(d.geometry.coordinates)
        this.textNodes = this.textNodes.concat(this.textNodeFromCityData(d))
    }

    reset() {
        this.textNodes = [];
        this.zoom
            .scale(this.initialScale)
            .translate(this.viewportCenter)
            .size([this.mapWidth, this.mapHeight])
            .center(this.viewportCenter)
        this.initProjections();
        this.quickRedraw();
        this.fullRedraw();
    }

    setDimensions({width, height}) {
        if (width) this.width = width;
        if (height) this.height = height;
        this.svg
            .attr("width", this.width)
            .attr("height", this.height);
    }

    resize(dimensions) {
        this.setDimensions(dimensions);
        this.fullRedraw();
    }

    get locationList() {
        // [[name, selectCallback],...]

        var iso3ToName = {};
        this.data.worldHigh.map(d => iso3ToName[d.properties.iso3] = d.properties.admin);

        var countries = this.data.worldHigh
            .filter(d => d.properties && d.properties.admin)
            .map(d => {
                return {
                    text: d.properties.admin === d.properties.name ?
                            d.properties.admin :
                            `${d.properties.name} (${d.properties.admin})`,
                    callback: this.focusCountry.bind(this,d)
                };
            });
        var cities = this.data.allCities
            .filter(d => d.properties && d.properties.name)
            .map(d => {
                return {
                    text: `${d.properties.name}, ${iso3ToName[d.properties.adm0_a3]}`,
                    callback: this.focusCity.bind(this, d)
                }
            })
        return countries.concat(cities);
    }

    generateMinimapData() {
        // merged subunits will appear as their parent country
        // in the minimap and in country labels
        var [merged, unmerged] = _.partition(this.data.worldHigh,
            d =>  _.contains(config.merged, d.properties.name))
        var mergeGroups = _(merged)
            .groupBy(d => d.properties.admin)
            .mapValues(features => { return {type: 'FeatureCollection', features: features} }).valueOf();
        var mergedFeatures = _(merged)
            .map(d => [d.properties.name, mergeGroups[d.properties.admin]])
            .zipObject().valueOf();
        var unmergedFeatures = _.zipObject(unmerged.map(d => d.properties.name), unmerged);
        // continents
        var continentFeatures = _(this.topojsons.low.objects.ne_10m_admin_0_map_subunits.geometries)
            .groupBy(d => d.properties.continent)
            .mapValues(topojsonFeatures => topojson.merge(this.topojsons.low, topojsonFeatures))
            .valueOf();
        // override europe centroid
        var europeCentroid = d3.geo.centroid(continentFeatures['Europe']);
        continentFeatures['Europe'].properties = {
            centroid: [europeCentroid[0] - 15, europeCentroid[1]]
        };
        // subregions
        var subregionFeatures = _(this.topojsons.low.objects.ne_10m_admin_0_map_subunits.geometries)
            .groupBy(d => d.properties.subregion)
            .mapValues(topojsonFeatures => topojson.merge(this.topojsons.low, topojsonFeatures))
            .valueOf();

        this.data.minimapFeatures = _.defaults(unmergedFeatures, mergedFeatures, continentFeatures, subregionFeatures);
    }

    loadData() {
        queue()
            .defer(d3.json, this.jsonRoot + "world-simple.topojson")
            .defer(d3.json, this.jsonRoot + "world.topojson")
            .defer(d3.json, this.jsonRoot + 'borders.topojson')
            .defer(d3.json, this.jsonRoot + 'cities.topojson')
            .defer(d3.json, this.jsonRoot + 'roads.topojson')
            .await(function(error, low, high, borders, cities, roads) {

                this.topojsons = { low: low, high: high, borders: borders, cities: cities, roads: roads };

                high.objects.merged = topojson.mergeArcs(high, high.objects.ne_10m_admin_0_map_subunits.geometries);
                topojson.presimplify(high)
                topojson.presimplify(roads)


                var allCities = topojson.feature(cities, cities.objects.populated_places).features

                var roadTypes = ["Secondary Highway", "Major Highway", "Bypass", "Road", "Unknown"];
                var roadFeatures = topojson.feature(roads, roads.objects.ne_10m_roads).features
                    .filter(d => roadTypes.indexOf(d.properties.type) !== -1)
                var [majorRoads, otherRoads] = partition(roadFeatures, d => d.properties.type === 'Major Highway')

                this.majorRoadTree = new GeoQuadTree(majorRoads, 1000)
                this.otherRoadTree = new GeoQuadTree(otherRoads, 1000)

                this.data = {
                    worldHigh: topojson.feature(high, high.objects.ne_10m_admin_0_map_subunits).features,
                    worldLow: topojson.feature(low, low.objects.ne_10m_admin_0_map_subunits).features,
                    mergedWorld: topojson.feature(high, high.objects.merged),
                    borders: topojson.feature(borders, borders.objects.gm_disputed_areas).features,
                    boundariesHigh: topojson.mesh(high, high.objects.ne_10m_admin_0_map_subunits, (a,b) => a.properties.iso3 !== b.properties.iso3),
                    boundariesLow: topojson.mesh(low, low.objects.ne_10m_admin_0_map_subunits, (a,b) => a.properties.iso3 !== b.properties.iso3),
                    allCities: allCities,
                    capitalCities: allCities.filter(this.isCapital),
                    populusCities: allCities.filter(d => !this.isCapital(d))
                }

                this.data.worldHigh.forEach(d => d.boundsPolygon = boundsPolygon(d))
                this.data.worldLow.forEach(d => d.boundsPolygon = boundsPolygon(d))

                this.conflictBordersSelection = this.groups.conflictBorders
                    .selectAll('path')
                    .data(this.data.borders)
                    .enter().append("path")

                this.conflictBordersBgSelection = this.groups.conflictBordersBg
                    .selectAll('path')
                    .data(this.data.borders)
                    .enter().append("path")

                this.generateMinimapData();

                this.minimaps = {
                    world: new GilbertMinimap({svg: this.svg, data: low, width: 85, height: 85, paddingLeft: 20, paddingBottom: 0}),
                    country: new FeatureMinimap({svg: this.svg, width: 250, height: 300, paddingLeft: 20, paddingBottom: 12}),
                    subregion: new FeatureMinimap({svg: this.svg, width: 250, height: 300, paddingLeft: 20, paddingBottom: 12}),
                    continent: new FeatureMinimap({svg: this.svg, width: 250, height: 300, paddingLeft: 20, paddingBottom: 12})
                };

                this.minimap = this.minimaps.world;

                this.scale = new Scale({g: this.groups.scale})

                this.quickRedraw();
                this.fullRedraw();

                this.el.classList.remove('map--loading');
                this.emit('loaded');

                window.map = this;

            }.bind(this));
    }
}
