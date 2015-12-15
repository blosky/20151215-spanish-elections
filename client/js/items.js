import config from '../json/config.json!json'
import bean from 'fat/bean'
import Emitter from './lib/emitter'

class MapItem extends Emitter {
    render() {
        throw Error('not implemented')
    }
}

export class LocationMarker extends MapItem {
    constructor({coords, text = 'Marker', direction = 'up', length = 40}) {
        super(arguments[0])
        this.opts = {coords, text, direction, length};

        var clickOffsetX, clickOffsetY;
        this.dragger = d3.behavior.drag()
            .on("dragstart", _ => {
                var [screenX, screenY] = this.lastProjection(this.opts.coords);
                var [clickX, clickY] = [d3.event.sourceEvent.pageX, d3.event.sourceEvent.pageY];
                [clickOffsetX, clickOffsetY] = [screenX - clickX, screenY - clickY];
                d3.event.sourceEvent.stopPropagation()
            })
            .on("drag", _ => {
                var [mouseX, mouseY] = [d3.event.sourceEvent.pageX, d3.event.sourceEvent.pageY];
                this.opts.coords = this.lastProjection.invert([mouseX + clickOffsetX, mouseY + clickOffsetY])
                this.render()
            })
            .on("dragend", _ => this.emit('changed'))
    }

    init(map) {

        var coeff = this.opts.direction === 'up' ? -1 : 1;

        this.group = map.groups.items.append('g')
            .attr('class', 'locationmarker')
            .call(this.dragger)

        var textInput = document.createElement('input')
        var editOnMouseUp = false;
        textInput.className = 'locationmarker-input'
        textInput.style.position = 'absolute'
        textInput.style.minWidth = '50px'
        textInput.style.width

        this.hoverbox = this.group.append('rect')
            .attr('stroke', 'transparent')
            .attr('fill', 'transparent')
            .attr('width', 50)
            .attr('height', (this.opts.length + 20))
            .attr('x', -25)
            .attr('y', coeff*(this.opts.length + 20))
        this.dot = this.group.append('circle')
            .attr('r', config.styles.markerRadius)
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('fill', config.styles.textNodes.marker.color)
        this.line = this.group.append('line')
            .attr('stroke', config.styles.textNodes.marker.color)
            .attr('fill', 'none')
            .attr('shape-rendering', 'crispEdges')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', 0)
            .attr('y2', coeff*this.opts.length)
        this.text = this.group.append('text')
            .attr('fill', config.styles.textNodes.marker.color)
            .attr('font-size', config.styles.textNodes.marker.fontSize)
            .attr('font-family', config.styles.textNodes.marker.fontFamily)
            .attr('font-weight', config.styles.textNodes.marker.fontWeight)
            .attr('text-anchor', 'middle')
            .attr('dy', coeff * (this.opts.length + 6))
            .on('mousedown', _ => editOnMouseUp = true)
            .on('mouseup', function() {
                if (editOnMouseUp) {
                    var textRect = this.getBoundingClientRect()
                    var mapRect = map.el.getBoundingClientRect()
                    textInput.style.left = `${textRect.left - mapRect.left}px`
                    textInput.style.top = `${textRect.top - mapRect.top}px`
                    map.el.appendChild(textInput);
                    textInput.focus();
                    this.setAttribute('display', 'none');
                }
            })

        map.svg.node().addEventListener('mousemove', _ => editOnMouseUp = false)

        bean.on(textInput, 'keyup', e => {
            if (e.keyCode === 13) {
                map.el.removeChild(textInput);
                // this.text.attr('display', '');
                this.opts.text = textInput.value;
                this.render();
            }
        })
    }

    setText(val, width = 150) {
        this.text.attr('display', '');
        if (val !== this.lastRendered) {

            this.text.text(val);
            this.lastRendered = val;

            var text = this.text,
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 20,
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy),
                tspan1 = tspan,
                tspanCount = 1;
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", lineHeight).text(word);
                    tspanCount++;
                }
            }
            tspan1.attr('dy', dy - (tspanCount-1)*lineHeight);
        }
        this.emit('changed');
    }

    render(projection) {
        var proj = this.lastProjection = projection || this.lastProjection;
        var [x,y] = proj(this.opts.coords);
        this.group.attr("transform", `translate(${x},${y})`)
        this.setText(this.opts.text);
    }
}
