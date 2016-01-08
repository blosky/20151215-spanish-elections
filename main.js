import Infomap from './Infomap.js';
import queue from './client/js/lib/queue.v1.min.js'
/*import Activemap from './ActiveMap.js'*/

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

			var RATIO=0;

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
			colors["EN COMÚ"]='#7D0069';
			colors["UNIO.CAT"]='#7F3A14';
			colors["ERC-CATSÍ"]='#C5D4EA';
			colors["DL"]='#01C6A4';
			colors["PNV"]='#B9BF01';


			var map1 = new Infomap(
			{
				container:"map1",
				width:620,
				height:300,
				geo:{topojson:topojson,className:'ID_2'},
				data:{
					csv:json.sheets.Sheet1.map(function(d){console.log(d)
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
				callback:map1Callback,
				callbackOut:map1CallbackOut
			});

			map1.setProjection(d3.geo.azimuthalEqualArea());
			map1.getProjection().center([-1.8,39]);
			map1.getProjection().scale(1900);
			map1.createMap('choropleth');

			
			function map1Callback(node)
			{
				var id = node.id
				var result;
				var tooltip = d3.select('#tooltip-results1');
				var ratio = map1.getRatio();

				console.log('main: ',ratio)

				d3.map(json.sheets.Sheet1, function(d)
				{
					if(d.code == id.split('c')[1])result = d; return;
				});

				var h=300,
					y=h/2-((h/2-node.box[1])*ratio);

				var posX = (node.box[0]*ratio);

				
				tooltip
				.html
					(
						'<p><b>' + result.province + '</b></p>' + 
						'<p>' + result.party + '</p>'

					)
				

				if(posX > window.innerWidth / 2)posX = posX - document.getElementById('tooltip-results1').offsetWidth - 20;

				tooltip
				.style('display', 'block')
				.style('left', posX + 'px')
				.style('top', y + 'px');
			}

			function map1CallbackOut(event)
			{
				var tooltip = d3.select('#tooltip-results1');
				tooltip
				.style('display', 'none')
			}


			var map2 = new Infomap(
			{
				container:"map2",
				width:620,
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
				callback:map2Callback,
				callbackOut:map2CallbackOut
			});

			map2.setProjection(d3.geo.azimuthalEqualArea());
			map2.getProjection().center([-1.8,39]);
			map2.getProjection().scale(1900);
			map2.createMap('heatmap');

			function map2Callback(node)
			{
				var id = node.id
				var result;
				var tooltip = d3.select('#tooltip-results2');
				var ratio = map2.getRatio();

				d3.map(json.sheets.Sheet1, function(d)
				{
					if(d.code == id.split('c')[1])result = d; return;
				});

				var h=300,
					y=h/2-((h/2-node.box[1])*ratio);

				var posX = (node.box[0]*ratio);

				tooltip
				.html
					(
						'<p><b>' + result.province + '</b></p>' + 
						'<p>'+result['pp-percentage']+'%</p>'

					)
				

				if(posX > window.innerWidth / 2)posX = posX - document.getElementById('tooltip-results2').offsetWidth - 20;

				tooltip
				.style('display', 'block')
				.style('left', posX + 'px')
				.style('top', y + 'px');
			}

			function map2CallbackOut(event)
			{
				var tooltip = d3.select('#tooltip-results2');
				tooltip
				.style('display', 'none')
			}

			var map3 = new Infomap(
			{
				container:"map3",
				width:620,
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
			map3.getProjection().scale(1900);
			map3.createMap('heatmap');

			function map3Callback(node)
			{
				var id = node.id
				var result;
				var tooltip = d3.select('#tooltip-results3');
				var ratio = map3.getRatio();

				d3.map(json.sheets.Sheet1, function(d)
				{
					if(d.code == id.split('c')[1])result = d; return;
				});

				var h=300,
					y=h/2-((h/2-node.box[1])*ratio);

				var posX = (node.box[0]*ratio);
				console.log('**', result, posX)
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


			var map4 = new Infomap(
			{
				container:"map4",
				width:620,
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
			map4.getProjection().scale(1900);
			map4.createMap('heatmap');

			function map4Callback(node)
			{
				var id = node.id
				var result;
				var tooltip = d3.select('#tooltip-results4');
				var ratio = map4.getRatio();

				d3.map(json.sheets.Sheet1, function(d)
				{
					if(d.code == id.split('c')[1])result = d; return;
				});

				var h=300,
					y=h/2-((h/2-node.box[1])*ratio);

				var posX = (node.box[0]*ratio);

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

			var map5 = new Infomap(
			{
				container:"map5",
				width:620,
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
			map5.getProjection().scale(1900);
			map5.createMap('heatmap');

			function map5Callback(node)
			{
				if(node)
				{
					var id = node.id
					var result;
					var tooltip = d3.select('#tooltip-results5');
				}
				var ratio = map5.getRatio();


				d3.map(json.sheets.Sheet1, function(d)
				{
					if(d.code == id.split('c')[1])result = d; return;
				});

				var h=300,
					y=h/2-((h/2-node.box[1])*ratio);

				var posX = (node.box[0]*ratio);

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
