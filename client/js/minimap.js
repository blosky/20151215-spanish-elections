import d3 from 'd3'
import topojson from 'mbostock/topojson'

class Minimap {
    constructor({svg, width, height, paddingLeft, paddingBottom}) {
        this.width = width;
        this.height = height;
        this.paddingLeft = paddingLeft;
        this.paddingBottom = paddingBottom;
        this.svg = svg
        this.map = svg.append('g')
            .attr('class', 'minimap')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('fill', '#ebebeb');
        this.ratio = window.devicePixelRatio || 1;
        this.hide();
    }

    setElementTransform() {
        var svgHeight = Number(this.svg.attr('height'));
        this.map.attr("transform", `translate(${this.width/2 + this.paddingLeft},${svgHeight - this.paddingBottom - this.height * 1.5})`)
    }

    hide() { this.map.attr('display', 'none'); }
    show() { this.map.attr('display', 'block'); }

    renderBox(boxCoords) {
        if (!this.box) {
            this.box = this.map.append('path')
                .attr('stroke', '#B82266')
                .attr('stroke-width', '2')
                .attr('fill', 'none')
        }
        if (boxCoords) {
            var d = this.path({type: 'LineString', coordinates: boxCoords})
            this.box.attr('d', d)
        } else this.box.attr('d', '');
    }
}

export class GilbertMinimap extends Minimap {
    constructor({svg, data, width, height, paddingLeft, paddingBottom}) {
        super(arguments[0])

        this.map.classed('minimap--gilbert', true);

        this.circlePadding = 6;

        this.outline = this.map
            .append('circle')
            .attr('cx', this.width/2)
            .attr('cy', this.height/2)
            .attr('r', this.width + this.circlePadding)
            .attr('fill', '#ffffff');
        this.background = this.map
            .append('circle')
            .attr('cx', this.width/2)
            .attr('cy', this.height/2)
            .attr('r', this.width - 0.5)
            .attr('fill', '#929297');

        this.loadData(data);

        var projection = this.projection = d3.geo.orthographic()
            .clipAngle(90 - 1e-3)
            .rotate([0,0])
            .precision(.1)
            .scale(this.width)
            .translate([width / 2, height / 2])

        var gilbert = this.gilbert = d3.geo.gilbert(projection);

        var path = d3.geo.path().projection(gilbert);
        this.path = function(d) {
            var rotate = projection.rotate();
            var d1 = path(d)
            projection.rotate([rotate[0] + 180, rotate[1], rotate[2]]);
            var d2 = path(d)
            projection.rotate(rotate);
            return (d1 || '') + (d2 || '');
        };
    }

    loadData(data) {
        var mergedData = topojson.merge(data, data.objects.ne_10m_admin_0_map_subunits.geometries);
        this.world = this.map
            .append('path')
            .datum(mergedData)
            .attr('d', this.path);
    }

    render({cx, box}) {
        this.show();
        this.setElementTransform();
        this.projection.rotate([-0.5 * cx, 0])
        this.world.attr('d', this.path);
        this.renderBox(box);
    }
}

export class FeatureMinimap extends Minimap {
    constructor({svg,  width, height, paddingLeft, paddingBottom}) {
        super(arguments[0])

        this.map.classed('minimap--feature', true);

        this.backgroundEl = this.map.append('path')
            .attr('stroke-width', 10)
            .attr('stroke', 'white')
            .attr('stroke-linejoin', 'round');

        this.pathEl = this.map.append('path')
            .attr('fill', '#929297');

        // debug box
        // this.map.append('rect')
        //     .attr('fill', 'none')
        //     .attr('stroke', 'black').attr('stroke-width', 0.5)
        //     .attr('width', width).attr('height', height);

        this.projection =
            d3.geo.azimuthalEquidistant()
                .rotate([0, 0])
                .scale(100)
                .translate([width/2, height/2])
                .precision(.3)
                .clipAngle(90)
                .clipExtent([
                    [0, 0],
                    [width, height]
                ]);

        this.simplify = d3.geo.transform({
          point: function(x, y, z) {
            if (z === undefined || z >= 0.001) this.stream.point(x, y);
          }
        });

        this.path = d3.geo.path().projection(this.projection);
        this.simplifyingPath = d3.geo.path().projection({stream: s => this.simplify.stream(this.projection.stream(s))});
    }

    selectFeature(d) {
        this.selectedFeature = d;
        var centroid = d.properties && d.properties.centroid || d3.geo.centroid(d);
        this.projection
            .rotate([-centroid[0], -centroid[1]])

        this.projection.scale(100);
        var bounds = this.path.bounds(d),
            dx = bounds[1][0] - bounds[0][0],
            dy = bounds[1][1] - bounds[0][1],
            scale = Math.min(this.width / dx, this.height / dy);
        this.projection.scale(80 * scale);

        this.pathEl.datum(d);
        this.backgroundEl.datum(d);
    }

    deselect() {
        this.selectedFeature = undefined;
        this.hide();
    }

    render({cx, box}) {
        if (this.selectedFeature) {
            this.show();
            this.renderBox(box);
            if (this.lastRendered !== this.selectFeature) {
                var svgHeight = Number(this.svg.attr('height'));
                this.pathEl.attr('d', this.simplifyingPath);
                this.backgroundEl.attr('d', this.simplifyingPath);
                var [[left,top],[right,bottom]] = this.path.bounds(this.pathEl.datum());
                var fromBottom = this.height - bottom;
                this.map.attr("transform", `translate(${this.paddingLeft - left},${svgHeight - this.height + fromBottom - this.paddingBottom})`)
                this.lastRendered = this.selectedFeature;
            }
        }
    }
}
