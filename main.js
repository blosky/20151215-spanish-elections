import Infomap from './Infomap.js';
import queue from './client/js/lib/queue.v1.min.js'

class App
{
	constructor()
	{

		var container = document.getElementById("container");
		var self = this;
		this.infomap;

		var button = document.getElementById("button");


		queue()
		.defer(d3.json, 'client/json/spain_admin2.json')
		.defer(d3.json, 'http://interactive.guim.co.uk/docsdata-test/13ByyTtZpwpfKgu1dycuLn72jh5Au2BPLSlTiDGEr9yY.json')
		//.defer(d3.csv, 'client/csv/001_GNM-24062015.csv')
		.await(self.createMap);

		var tooltip;//TBC.
	}
	/*
	" 2014/15": "333"
	2011/12: "3970"
	Class: "L"
	Local authority: "Barking and Dagenham"
	ecode: "E5030"
	variation: "-91.6120906801"
	*/
	/*
	sheets: Object
Sheet1: Array[51]
0: Object
code: "13596"
party: "PP"
province: "Almería"
*/
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


            self.infomap = new Infomap(
            {
            	container:container,
            	width:620,
            	height:700,
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

            infomap.setProjection(d3.geo.azimuthalEqualArea());
            infomap.getProjection().center([-1.8,39]);
		//infomap.getProjection().rotate([3,1])
		infomap.getProjection().scale(2900);

		infomap.createMap('choropleth');

		/*infomap.getProjection().center([54,-2]);
		infomap.getProjection().scale(1500);*/

		/*infomap.getProjection().center([-1,53]);
		infomap.getProjection().scale(4000);
		infomap.redraw()*/
	}

	



}

new App()
