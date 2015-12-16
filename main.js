import Infomap from './Infomap.js';
import queue from './client/js/lib/queue.v1.min.js'
import Activemap from './ActiveMap.js'

class App
{
	constructor()
	{
		
		var self = this;

		queue()
		.defer(d3.json, 'client/json/spain_admin2.json')
		.defer(d3.json, 'http://interactive.guim.co.uk/docsdata-test/13ByyTtZpwpfKgu1dycuLn72jh5Au2BPLSlTiDGEr9yY.json')
		.await(self.createMap);
	}

	createMap(error, topojson, json)
	{
			//console.log(json);
			//return;
			var colors = [];
			colors["PP"]='#4DC6DD';
			colors["PSOE"]='#B41700';
			colors["PSC-PSOE"]='#B41700';
			colors["PSE-EE (PSOE)"]='#B41700';
			colors["IU-UPeC"]='#AAD801';
			colors["UPyD"]='#DB58A4';
			colors["EH BILDU"]='#595959';
			colors["EAJ-PNV"]='#669893';
			colors["ERC"]='#FCDD03';
			colors["C's"]='#FF9B0B';
			colors["PODEMOS"]='#7D0069';
			colors["EN COMÚ"]='#005789';
			colors["UNIO.CAT"]='#7F3A14';
			colors["ERC-CATSÍ"]='#C5D4EA';
			colors["Others"]='#DADADA';


			var map1 = self.infomap = new Infomap(
			{
				container:document.getElementById("container1"),
				width:900,
				height:300,
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
				colors:colors
			});

			map1.setProjection(d3.geo.azimuthalEqualArea());
			map1.getProjection().center([-1.8,39]);
			map1.getProjection().scale(1400);
			map1.createMap('choropleth');


			var map2 = self.infomap = new Infomap(
			{
				container:document.getElementById("container2"),
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
				colors:colors["PP"]
			});

			map2.setProjection(d3.geo.azimuthalEqualArea());
			map2.getProjection().center([-1.8,39]);
			map2.getProjection().scale(1400);
			map2.createMap('heatmap');

			var map3 = self.infomap = new Infomap(
			{
				container:document.getElementById("container3"),
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
				colors:colors["PSOE"]
			});

			map3.setProjection(d3.geo.azimuthalEqualArea());
			map3.getProjection().center([-1.8,39]);
			map3.getProjection().scale(1400);
			map3.createMap('heatmap');


			var map4 = self.infomap = new Infomap(
			{
				container:document.getElementById("container4"),
				width:300,
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
				colors:colors["C's"]
			});

			map4.setProjection(d3.geo.azimuthalEqualArea());
			map4.getProjection().center([-1.8,39]);
			map4.getProjection().scale(1400);
			map4.createMap('heatmap');

			var map5 = self.infomap = new Infomap(
			{
				container:document.getElementById("container5"),
				width:300,
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
				colors:colors["PODEMOS"]
			});

			map5.setProjection(d3.geo.azimuthalEqualArea());
			map5.getProjection().center([-1.8,39]);
			map5.getProjection().scale(1400);
			map5.createMap('heatmap');


			var temp = [900,620,620,300,300];

			resizeMaps();
			window.onresize = () => resizeMaps(event);

			function resizeMaps()
			{
				console.log(self,self.width);
				if(window.innerWidth >= self.width)
				{
					d3.selectAll(".container")
					//.style('height', self.height)
					//.style('height', document.querySelector(".container").offsetWidth)
					.data(temp)
					.selectAll('svg')
					.style('width', d => d);
				}
				else
				{
					d3.selectAll(".container")
					//.style('height', document.querySelector(".container").offsetWidth)
					.selectAll('svg')
					.style('width', '100%');
				}
			}
		}

	}

	new App()
