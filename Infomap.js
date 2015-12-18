import d3 from './d3.v3.min.js'
import topojson from './topojson.v1.min.js'
import Scalecolor from './client/js/lib/Scalecolor.js'
import TouchEvents from './TouchEvents.js'



export default class Infomap
{
	constructor({container, width = 200, height = 700, geo = {topojson, className}, data = {csv, className, data}, quantile = {domain:[0,100], range:10}, colors = ['#4BC6DF','#951C55'], callback})	
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
			.attr("viewBox", '0 0 '+ self.width + " " + self.height )//"0 0 300 205")
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

		this.callback = callback;

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
	    .attr("d", this.path)

	    this.centroids_map={};
	    

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
			.on('mouseout', function(){that.interact.selectAll('g').remove()})
			)

			var centroids = this.setCentroids(this.map, this.centroids_map, "path.node", this);

			this.map.on('mousemove',function(){
				var coords=d3.mouse(this)
				
				var node=that.findClosest(coords,centroids.centroids)
	    		that.interact.selectAll('g').remove()
	    		that.setClone(node.node, that.interact); if(that.callback)that.callback(node)
			})

			var touchevents = new TouchEvents(this.map, {
		    element:this.map.node(),

		    touchStartCallback:function(coords){console.log('start')},
		    touchEndCallback:function(coords){that.interact.selectAll('g').remove();console.log('end')},
		    touchMoveCallback:function(coords){

		    		coords[1]-=30;
		    		
		    		
		    		var node=that.findClosest(coords,centroids.centroids)
		    		that.interact.selectAll('g').remove()
		    		that.setClone(node.node, that.interact); if(that.callback)that.callback(node)
		    	}
			})


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
			.on('mouseout', function(){that.interact.selectAll('g').remove()})
			)

			var centroids = this.setCentroids(this.map, this.centroids_map, "path.node", this);

			this.map.on('mousemove',function(){
				var coords=d3.mouse(this)
				
				var node=that.findClosest(coords,centroids.centroids)
	    		that.interact.selectAll('g').remove()
	    		that.setClone(node.node, that.interact); if(that.callback)that.callback(node)
			})

			var touchevents = new TouchEvents(this.map, {
		    element:this.map.node(),

		    touchStartCallback:function(coords){console.log('start')},
		    touchEndCallback:function(coords){that.interact.selectAll('g').remove();console.log('end')},
		    touchMoveCallback:function(coords){

		    		coords[1]-=30;
		    		
		    		
		    		var node=that.findClosest(coords,centroids.centroids)
		    		that.interact.selectAll('g').remove()
		    		that.setClone(node.node, that.interact); if(that.callback)that.callback(node)
		    	}
			})
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

	getMap()
	{
		return this.map;
	}

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


	getPath()
	{	
		return this.path;
	}

	findClosest(coords,array) {
		var self=this;
	  	var closest_node=null,
	  	dist=100;
	  	//console.log(coords)
	 
	  	array.every(function(node){

		    var c_centre=node.box,
		    __dist=self.getDistance(coords[0],coords[1],c_centre[0],c_centre[1]);

		    if(__dist<dist)
		      {
		        closest_node=node;
		        dist=__dist;
		      }

		    return __dist>5;
	            
	    });

	  	return closest_node;
	}

	getDistance(x1,y1,x2,y2)
	{
	  return Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
	}

	getCentroid(element)
	{

	  var bbox = element.getBBox();
	  return [bbox.x + bbox.width/2, bbox.y + bbox.height/2];
	}

	setCentroids(_svg, object,selector,self)
	{
		object={
			centroids:[]
		};
		_svg.selectAll(selector)
			.each(function(d) {

				var box=self.getCentroid(this);
				object.centroids.push({
					id:this.id,
					node:this,
					box:box
				});

	   		}
	   	);
	   	
	return object;
	

	}

	

	
}