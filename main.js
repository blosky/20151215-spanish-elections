import Infomap from './Infomap.js';
import queue from './client/js/lib/queue.v1.min.js'
import Activemap from './ActiveMap.js'

class App
{
	constructor()
	{
		
		var self = this;

		queue()
		.defer(d3.json, 'client/json/esp_adm2.json')
		.defer(d3.json, 'http://interactive.guim.co.uk/docsdata-test/13ByyTtZpwpfKgu1dycuLn72jh5Au2BPLSlTiDGEr9yY.json')
		.await(self.createMap);
	}

	createMap(error, topojson, json)
	{
			//console.log(json);
			//return;
			//var self=this;

			var RATIO=1;

			var colors = [];
			colors["PP"]='#4DC6DD';
			colors["PSOE"]='#B41700';
			colors["PSC-PSOE"]='#B41700';
			colors["PSE-EE (PSOE)"]='#B41700';
			colors["IU-UPeC"]='#AAD801';
			colors["UPyD"]='#DB58A4';
			colors["EH BILDU"]='#595959';
			colors["EAJ-PNV"]='#669893';
			colors["C's"]='#FF9B0B';
			colors["PODEMOS"]='#7D0069';
			colors["EN COMÚ"]='#005789';
			colors["UNIO.CAT"]='#7F3A14';
			colors["ERC-CATSÍ"]='#C5D4EA';
			colors["Others"]='#DADADA';


			var mapsWidths = [620,620,620,620,620];
			var mapsHeights= [300,300,300,300,300];

			var map1 = self.infomap = new Infomap(
			{
				container:document.getElementById("container1"),
				width:mapsWidths[0],
				height:mapsHeights[0],
				geo:{topojson:topojson,className:'ID_2'},
				data:{
					csv:json.sheets.Sheet1.map(function(d){
						return {
							code:"c"+d.code,
							party:d.party
						}
					}
					),
					className:'code',
					data:"party"
				},
				colors:colors,
				callback:map1Callback
			});

			map1.setProjection(d3.geo.azimuthalEqualArea());
			map1.getProjection().center([-1.8,39]);
			map1.getProjection().scale(1400);
			map1.createMap('choropleth');

			
			function map1Callback(node)
			{
				var id = node.id
				var result;
				var tooltip = d3.select('#tooltip-results1');

				d3.map(json.sheets.Sheet1, function(d)
				{
					if(d.code == id.split('c')[1])result = d; return;
				});

				var h=mapsHeights[0],
					y=h/2-((h/2-node.box[1])*RATIO);

				var posX = (node.box[0]*RATIO);

				
				tooltip
				.html
					(
						'<p><b>' + result.province + '</b></p>' + 
						'<p>'+result.party+'</p>'

					)
				

				if(posX > window.innerWidth / 2)posX = posX - document.getElementById('tooltip-results1').offsetWidth - 20;

				tooltip
				.style('left', posX + 'px')
				.style('top', y + 'px');
			}


			var map2 = self.infomap = new Infomap(
			{
				container:document.getElementById("container2"),
				width:mapsWidths[1],
				height:300,
				geo:{topojson:topojson,className:'ID_2'},
				data:{
					csv:json.sheets.Sheet1.map(function(d){
						return {
							code:"c"+d.code,
							percentage:d['pp-percentage']
						}
					}
					),
					className:'code',
					data:"percentage"
				},
				colors:colors["PP"],
				callback:map2Callback
			});

			map2.setProjection(d3.geo.azimuthalEqualArea());
			map2.getProjection().center([-1.8,39]);
			map2.getProjection().scale(1400);
			map2.createMap('heatmap');

			function map2Callback(node)
			{
				var id = node.id
				var result;
				var tooltip = d3.select('#tooltip-results2');

				d3.map(json.sheets.Sheet1, function(d)
				{
					if(d.code == id.split('c')[1])result = d; return;
				});

				var h=mapsHeights[0],
					y=h/2-((h/2-node.box[1])*RATIO);

				var posX = (node.box[0]*RATIO);

				tooltip
				.html
					(
						'<p><b>' + result.province + '</b></p>' + 
						'<p>'+result['pp-percentage']+'%</p>'

					)
				

				if(posX > window.innerWidth / 2)posX = posX - document.getElementById('tooltip-results2').offsetWidth - 20;

				tooltip
				.style('left', posX + 'px')
				.style('top', y + 'px');
			}

			var map3 = self.infomap = new Infomap(
			{
				container:document.getElementById("container3"),
				width:mapsWidths[2],
				height:300,
				geo:{topojson:topojson,className:'ID_2'},
				data:{
					csv:json.sheets.Sheet1.map(function(d){
						return {
							code:"c"+d.code,
							percentage:d['psoe-percentage']
						}
					}
					),
					className:'code',
					data:"percentage"
				},
				colors:colors["PSOE"],
				callback:map3Callback
			});

			map3.setProjection(d3.geo.azimuthalEqualArea());
			map3.getProjection().center([-1.8,39]);
			map3.getProjection().scale(1400);
			map3.createMap('heatmap');

			function map3Callback(node)
			{
				var id = node.id
				var result;
				var tooltip = d3.select('#tooltip-results3');

				d3.map(json.sheets.Sheet1, function(d)
				{
					if(d.code == id.split('c')[1])result = d; return;
				});

				var h=mapsHeights[0],
					y=h/2-((h/2-node.box[1])*RATIO);

				var posX = (node.box[0]*RATIO);
				console.log(result)
				tooltip
				.html
					(
						'<p><b>' + result.province + '</b></p>' + 
						'<p>'+result['psoe-percentage']+'%</p>'

					)
				

				if(posX > window.innerWidth / 2)posX = posX - document.getElementById('tooltip-results3').offsetWidth - 20;

				tooltip
				.style('left', posX + 'px')
				.style('top', y + 'px');
			}


			var map4 = self.infomap = new Infomap(
			{
				container:document.getElementById("container4"),
				width:mapsWidths[3],
				height:300,
				geo:{topojson:topojson,className:'ID_2'},
				data:{
					csv:json.sheets.Sheet1.map(function(d){
						return {
							code:"c"+d.code,
							percentage:d["podemos-percentage"]
						}
					}
					),
					className:'code',
					data:"percentage"
				},
				colors:colors["PODEMOS"],
				callback:map4Callback
			});

			map4.setProjection(d3.geo.azimuthalEqualArea());
			map4.getProjection().center([-1.8,39]);
			map4.getProjection().scale(1400);
			map4.createMap('heatmap');

			function map4Callback(node)
			{
				var id = node.id
				var result;
				var tooltip = d3.select('#tooltip-results4');

				d3.map(json.sheets.Sheet1, function(d)
				{
					if(d.code == id.split('c')[1])result = d; return;
				});

				var h=mapsHeights[0],
					y=h/2-((h/2-node.box[1])*RATIO);

				var posX = (node.box[0]*RATIO);

				tooltip
				.html
					(
						'<p><b>' + result.province + '</b></p>' + 
						'<p>'+result['podemos-percentage']+'%</p>'

					)
				

				if(posX > window.innerWidth / 2)posX = posX - document.getElementById('tooltip-results4').offsetWidth - 20;

				tooltip
				.style('left', posX + 'px')
				.style('top', y + 'px');
			}

			var map5 = self.infomap = new Infomap(
			{
				container:document.getElementById("container5"),
				width:mapsWidths[4],
				height:300,
				geo:{topojson:topojson,className:'ID_2'},
				data:{
					csv:json.sheets.Sheet1.map(function(d){
						return {
							code:"c"+d.code,
							percentage:d["cs-percentage"]
						}
					}
					),
					className:'code',
					data:"percentage"
				},
				colors:colors["C's"],
				callback:map5Callback
			});

			map5.setProjection(d3.geo.azimuthalEqualArea());
			map5.getProjection().center([-1.8,39]);
			map5.getProjection().scale(1400);
			map5.createMap('heatmap');

			function map5Callback(node)
			{
				var id = node.id
				var result;
				var tooltip = d3.select('#tooltip-results5');

				d3.map(json.sheets.Sheet1, function(d)
				{
					if(d.code == id.split('c')[1])result = d; return;
				});

				var h=mapsHeights[0],
					y=h/2-((h/2-node.box[1])*RATIO);

				var posX = (node.box[0]*RATIO);

				tooltip
				.html
					(
						'<p><b>' + result.province + '</b></p>' + 
						'<p>'+result['podemos-percentage']+'%</p>'

					)
				

				if(posX > window.innerWidth / 2)posX = posX - document.getElementById('tooltip-results5').offsetWidth - 20;

				tooltip
				.style('left', posX + 'px')
				.style('top', y + 'px');
			}




			resizeMaps();
			window.onresize = () => resizeMaps(event);

			function resizeMaps()
			{

				if(window.innerWidth >= mapsWidths[0])
				{
					d3.selectAll(".container")
					.data(mapsWidths)
					.selectAll('svg')
					.style('width', d => d);
				}
				else
				{
					d3.selectAll(".container")
					.selectAll('svg')
					.style('width', '100%');
				}
				var ratio=window.innerWidth/mapsWidths[0];
				//console.log(window.innerWidth,mapsWidths[0])
				RATIO=1;
				if(ratio<=1){
					//map1.resize(ratio);	
					RATIO=ratio;
				}
				
			}
		}

	}

	new App()
