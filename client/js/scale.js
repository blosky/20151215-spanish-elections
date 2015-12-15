import config from '../json/config.json!json'

export class Scale {
    constructor({g}) {
        this.milesPerKm = 0.621371192;
        this.textKm = g.append('text')
            .attr('text-anchor', 'start')
            .attr('font-size', config.styles.scale.fontSize)
            .attr('font-family', config.styles.scale.fontFamily)
            .attr('font-weight', config.styles.scale.fontWeight)
            .attr('fill', config.styles.scale.color)
            .attr('dy', -5)
        this.textMiles = g.append('text')
            .attr('text-anchor', 'start')
            .attr('font-size', config.styles.scale.fontSize)
            .attr('font-family', config.styles.scale.fontFamily)
            .attr('font-weight', config.styles.scale.fontWeight)
            .attr('fill', config.styles.scale.color)
            .attr('dy', 15)
        this.line = g.append('path')
            .attr('stroke', '#aaa')
            .attr('fill', 'none')
            .attr('shape-rendering', 'crispEdges')
            .attr('stroke-width', 2)
        this.ticks = g.append('path')
            .attr('stroke', '#aaa')
            .attr('fill', 'none')
            .attr('shape-rendering', 'crispEdges')
            .attr('stroke-width', 1)

    }

    getParams(km, px) {
        // in - km and px distance from left to right most point in the viewport
        // out - render parameters (px width and unit)

        var stops = [1, 2, 2.5, 5] // possible scale multipliers at each order of magnitude
        var minSize = 100 // min size in px for the scale bar
        // rough start point that is smaller than minsize
        var exp = Math.floor(Math.log10(0.5 * km * (minSize / px)))
        var stop = 0
        var scaleExtent, size;
        do {
            if (stop === stops.length) { stop = 0; exp++; } // next order of magnitutde

            scaleExtent = Math.pow(10, exp) * stops[stop++]
            let sizeKm = px * (scaleExtent / km)
            // size of the miles scale is bigger so use that for checking against minsize
            size = sizeKm / this.milesPerKm
        } while (size < minSize)

        return {
            units: scaleExtent,
            px: size
        }
    }

    render({lat1, lon1, lat2, lon2, width}) {
        // left and right most geo points in the viewport
        // and the px width of the viewport
        var dist = this.dist(lat1, lon2, lat2, lon2)
        var params = this.getParams(dist, width)

        var scaleWidth = params.px.toFixed(0);
        var kmScaleWidth = (scaleWidth * this.milesPerKm).toFixed(0);
        this.textKm
            .text(`${params.units}km`)
            .attr('dx', -scaleWidth)
        this.textMiles
            .text(`${params.units}m`)
            .attr('dx', -scaleWidth)
        this.line.attr('d', `M-${scaleWidth},0L1,0`)
        this.ticks.attr('d', `M0,0L0,8M${kmScaleWidth-scaleWidth},0L${kmScaleWidth-scaleWidth},-8`)
    }

    dist(lat1, lon1, lat2, lon2) {
        // km dist between two points using haversine formula
        var toRad = deg => deg * Math.PI / 180

        var r = 6371; // earth's radius in km
        var x1 = lat2-lat1;
        var dLat = toRad(x1);
        var x2 = lon2-lon1;
        var dLon = toRad(x2);
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return r * c;
    }
}
