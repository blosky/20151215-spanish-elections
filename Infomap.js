import d3 from './d3.v3.min.js'
import topojson from './topojson.v1.min.js'
import Scalecolor from './client/js/lib/Scalecolor.js'



export default class Infomap
{
	constructor({container, width = 200, height = 700, geo = {topojson, className}, data = {csv, className, data}, quantile = {domain:[0,100], range:10}, colors = ['#4BC6DF','#951C55']})	
	{
		var self = this;
		this.container = container;
		this.width = width;
		this.height = height;
		/*this.quantile = d3.scale.quantile()
		.domain(quantile.domain)
		.range(d3.range(quantile.range).map(function(i) { return i; }));*/

		this.colors = colors;

		//projection
		this.projection = d3.geo.mercator()
		.scale(100)
		.translate([this.width/2, this.height/2]);

		this.topojson = geo.topojson;
		this.geoClassName = geo.className;
		this.unit = this.topojson.objects[Object.keys(this.topojson.objects)[0]];

		this.csv = data.csv;
		this.csvClassName = data.className;
		this.csvData = data.data;

		this.path;
		
		var createSvg = function(id, position, left, top, events){
			return d3.select(self.container).style('height', self.height).append('svg')
			.attr('id', id)
			.attr("viewBox", "0 0 300 205")// + self.width + " " + self.height )
			.attr("preserveAspectRatio", "xMidYMid")
			.style('width', self.width)
			.style('height', self.height)
			.style('position', position)
			.style('left', left)
			.style('top', top)
			.style('pointer-events', events)

		}
		
		this.map = createSvg('map', 'absolute', 0, 0,'');
		this.annotations = createSvg('annotations', 'absolute', 0, 0, 'none');
		this.interact = createSvg('interact', 'absolute', 0, 0,'none');
		
		/*/resizeMaps();
		window.onresize = () => resizeMaps(event);

		function resizeMaps()
		{
			console.log(self,self.width);
			if(window.innerWidth >= self.width)
			{
				d3.select(self.container)
				//.style('height', self.height)
				.selectAll('svg')
				.style('width', self.width);
			}
			else
			{
				d3.select(self.container)
				//.style('height', document.querySelector(".container").offsetWidth)
				.selectAll('svg')
				.style('width', '100%');
			}
		}*/
	}



	createMap(type)
	{
		var that = this;
		var map = this.map;
		var interact = this.interact;
		var features = topojson.feature(this.topojson, this.unit);

		this.path = d3.geo.path()
		.projection(this.projection);

		var className = this.geoClassName;
		var getClassname = this.getClassname;

		this.map.append("path")
	    .datum(features, d => topojson.merge(d.geometry))
	    .attr("id", "base_map")
	    .attr("d", this.path);

	    switch(type)
	    {
	    	case 'choropleth':
	    	this.map.selectAll('.nodes')
			.data(features.features)
			.enter()
			.append('path')
			.attr('class', 'node')
			.attr("id", d => ('c'+ getClassname(d.properties[className])))
			.attr("d", this.path);

			d3.map(this.csv, d => 
			this.map.select('#'+this.container.id+' #'+ this.getClassname(d[this.csvClassName]))
			.attr('fill', this.colors[d[this.csvData]])
			.attr('stroke', '#ffffff')
			.attr('stroke-width', '0.5')
			.on('mouseover', function(d){that.setClone(this, that.interact); })
			.on('mouseout', function(){that.interact.selectAll('g').remove()})
			)
	    	break;

	    	case 'heatmap':
	    	this.map.selectAll('.nodes')
			.data(features.features)
			.enter()
			.append('path')
			.attr('class', 'node')
			.attr("id", d => ('c'+ getClassname(d.properties[className])))
			.attr("d", this.path);
	
			d3.map(this.csv, d => 

			this.map.select('#'+this.container.id+' #'+ this.getClassname(d[this.csvClassName]))
			.attr('fill', this.colors)
			.attr('opacity', parseInt(d[this.csvData]) / 100)
			.attr('stroke', '#ffffff')
			.attr('stroke-width', '0.5')
			.on('mouseover', function(d){that.setClone(this, d3.select('#' + that.container.id + ' #interact')); })
			.on('mouseout', function(){that.interact.selectAll('g').remove()})
			)
	    	break;
			
	    	case 'bubbles':
	    	 this.map.selectAll('.nodes')
		    .data(features.features)
		    .enter()
		    .append('circle')
		    .attr("id", d => getClassname(d.properties[className]))
		    .attr('transform', d => 'translate(' + this.path.centroid(d) + ')')
		    .attr('fill', 'white')

		    d3.map(this.csv, d=> d3.select('#'+ this.getClassname(d[this.csvClassName]))
			.attr('r', this.quantile(d[this.csvData])))
	    	break;

	    	case 'scalerank':
	    	var colorScale = new Scalecolor(colors[0], colors[1], quantile.range);
			this.colors = colorScale.colors;
	    	break;
	    }

	}


	redraw()
	{
		d3.selectAll('path')
		.attr('d', this.path.projection(this.getProjection()));
	}


	//GETTERS

	getCenter(features)
	{
		var bbox = d3.geo.bounds(features);
		var x = (bbox[0][0] + bbox[1][0]) / 2;
		var y = (bbox[0][1] + bbox[1][1]) / 2;

		return [x,y];
	}

	getUnit()
	{
		return this.unit;
	}

	getProjection()
	{
		return this.projection
	}


	getScaleRadius(radius1, radius2, steps)
	{
		var range = radius2-radius1 / steps;
		var rads = [];
		for (var i = 1; i <= steps; i++) {
			rads.push(range * i);
		};

		return rads;
	}

	getClassname(string)
	{
		if(isNaN(string))return string.replace(/ /g, "_").replace(/'|&/g, "");
		else return string
	}

	//SETTERS


	setProjection(projection)
	{
		if(projection)this.projection = projection.translate([this.width/2, this.height/2]);
		else console.log('There is no projection assigned');
	}

	setClone(d, interact)
	{
		return interact
		.append("g")
		.attr("id","clone")
		.append("path")
		.attr("class","selected")
		.attr("d",d3.select(d).attr('d'))
		.style('fill', 'none')
		.style('stroke', 'black')
		.style('stroke-width', 1);
	}

}