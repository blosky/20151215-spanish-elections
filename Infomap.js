import d3 from './d3.v3.min.js'
import topojson from './topojson.v1.min.js'
import Scalecolor from './client/js/lib/Scalecolor.js'



export default class Infomap
{
	constructor({container, width = 200, height = 700, geo = {topojson, className}, data = {csv, className, data}, quantile = {domain:[0,100], range:10}, colors = ['#4BC6DF','#951C55'], callback, callbackOut})	
	{
		var self = this;
		this.container = container;

		console.log(this.container)

		this._container=d3.select("#"+this.container);
		this.width = width;
		this.height = height;

		var RATIO=0;

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
			return d3.select('#' + self.container).style('height', self.height)
			.append('svg')
			.attr('id', id)
			.attr("viewBox", '0 0 '+ self.width + " " + self.height )//"0 0 300 205")
			.attr("preserveAspectRatio", "xMinYMin")
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
		this.callbackOut = callbackOut;
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
			this.map.select('#'+this.container+' #'+ this.getClassname(d[this.csvClassName]))
			.attr('fill', this.colors[d[this.csvData]])
			.attr('stroke', '#ffffff')
			.attr('stroke-width', '0.5')
			.on('mouseout', function(){that.interact.selectAll('g').remove()})
			)

			var centroids = this.setCentroids(this.map, this.centroids_map, "path.node", this);

			this.map.on('mousemove',function(){

				that.onMouseMoveCallBack(this, centroids.centroids);
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

			this.map.select('#'+this.container+' #'+ this.getClassname(d[this.csvClassName]))
			.attr('fill', this.colors)
			.attr('opacity', parseInt(d[this.csvData]) / 100)
			.attr('stroke', '#ffffff')
			.attr('stroke-width', '0.5')
			.on('mouseout', function(){that.interact.selectAll('g').remove();})
			)

			var centroids = this.setCentroids(this.map, this.centroids_map, "path.node", this);

			this.map.on('mousemove',function(){

				that.onMouseMoveCallBack(this, centroids.centroids);
			})
	    	break;


	    	//TODO make independent bubblemap selection of coloured maps. If there is no color scale then represent just sizes in b&w
			
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


	//GETTERS


	getProjection()
	{
		return this.projection
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

	getRatio()
	{
		return this.RATIO;
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

	onMouseMoveCallBack(coordinates, centroids)
	{
		var coords=d3.mouse(coordinates);
		var node=this.findClosest(coords,centroids)
	    this.interact.selectAll('g').remove()
	    if(node)
	    {
	    	this.setClone(node.node, this.interact);
	    	if(this.callback)this.callback(node)
	    }
		else
		{
			if(this.callbackOut)this.callbackOut(event)	
		}
	    
	    	
	}


	resizeMap(event)
	{
		var that = this;
		setTimeout(function()
		{
			
			if(window.innerWidth >= that.width)
			{
				that.RATIO=1;
				that._container//.select(".map")
				.style('height', that.height)
				.selectAll('svg')
				.style('width', that.width)
				.style('height', that.height);
			}
			else
			{
				var ratio=window.innerWidth/that.width;
				that.RATIO=1;
				if(ratio<=1)that.RATIO=ratio;

				console.log('Infomap: ',that.RATIO)

				that._container//.select(".map")
				.style('height', that.height * ratio)
				.selectAll('svg')
				.style('width', '100%')
				.style('height', that.height * ratio);
			}

			//if(that.callback)that.callback()	

		}, 500)
	}
}