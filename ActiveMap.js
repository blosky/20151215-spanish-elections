function ActiveMap(url,options) {
	

	var container,
		svg;

	var scale=1,
		translate=[0,0]

	var constituencies=[],
		constituencies_map={};

	d3.xml(url, "image/svg+xml", function(xml) {
		console.log(xml)

  
		createMap(xml);


	});
	var clone,
		clone_center;
	function createMap(svgXML) {

		container=d3.select(options.container || "body");

		container.node()
		  	.appendChild(svgXML.documentElement);

		svg=container
				.select("svg");

		var bbox=svg.node().getBoundingClientRect();

		svg.select(options.active[0]).style("display","block");
		svg.select(options.inactive[0]).style("display","none");

		var viewBox=svg.attr("viewBox").split(" ");

		scale=bbox.width / viewBox[2];
		translate=[-viewBox[0],-viewBox[1]];
		
		setCentroids();
		
		svg.on("mousemove",function(d){
				var coords=d3.mouse(this);

				var closest=findClosest(coords,translate,scale);
				
				if(closest) {
					
					if(options.callback) {
						options.callback(closest,[(closest.centroid[0]-viewBox[0])*scale,(closest.centroid[1]-viewBox[1])*scale]);
					}
				}
		})
		.on("mouseout", function(d){
			var coords=d3.mouse(this);
			var closest=findClosest(coords,translate,scale);
				if(options.callbackOut)
				{
					options.callbackOut(closest);
				}
		})

		clone=svg.append("g").attr("id","clone")
							.append("path")
							.attr("class","selected")


		
	}
	//setClone("MXXX,XXXLXX,XX") to show a path, setClone() to hide
	this.setClone=function(path) {
		if(!path) {
			clone.attr("d","");
			clone_center=null;
			return;
		}
		clone.attr("d",path);
		clone_center=getCentroid(clone.node());
	}
	this.getCloneCenter=function() {
		return [(clone_center[0]+translate[0])*scale,(clone_center[1]+translate[1])*scale];
	}
	function setCentroids() {

		svg.selectAll(options.active+" path").each(function(d){
			var id=this.getAttribute("id"),
				cid=id.split("_")[0];
			if(!constituencies_map[cid]) {
				constituencies_map[cid]={
					centroids:[],
					paths:[]
				};
			}

			console.log('***',cid , id, getCentroid(this))


			constituencies_map[cid].centroids.push(getCentroid(this));
			constituencies_map[cid].paths.push(id);
		});

		constituencies=d3.entries(constituencies_map).map(function(d){
			return {
				id:d.key,
				paths:d.value.paths,
				centroid:[
					d3.mean(d.value.centroids,function(c){
						return c[0]
					}),
					d3.mean(d.value.centroids,function(c){
						return c[1]
					})
				]
			}
		});

	}

	function getCentroid(element) {
	    var bbox = element.getBBox();
	    return [bbox.x + bbox.width/2, bbox.y + bbox.height/2];
	}

	this.getCentroid = function(element)
	{
		return getCentroid(element);
	}

    

    

	function findClosest(coords,__translate,__scale,filter) {

        __translate=__translate || 1;
        __scale=__scale || 1;

        var closest_constituency=null,
            dist=1000000;

        constituencies.filter(function(d){
            if(!filter) {
                return 1;
            }
            return filter(d);
        }).every(function(constituency){
            
            var c_centre=constituency.centroid,
                __dist=getDistance(coords[0],coords[1],c_centre[0],c_centre[1]);

            //console.log("check",coords,"against",c_centre,__dist,constituency.key)

            if(__dist<dist) {
                closest_constituency=constituency;
                dist=__dist;
            }

            return __dist>5;
            
        });

        


        return closest_constituency;
    }
    function getMapCoords(x, y, translate, scale) {
        return [(x - translate[0])/scale,(y - translate[1])/scale];
    }
    function getDistance(x1,y1,x2,y2) {
        return Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
    }

    this.getSVG=function() {
    	return svg;
    }
}
