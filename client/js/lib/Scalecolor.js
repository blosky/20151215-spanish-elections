export default class Scalecolor
{
	constructor(color1, color2, steps)
	{
			
				var color1 = color1.split('#')[1];
				var color2 = color2.split('#')[1];
				var ratio = 1 / steps;
				var ratioTemp = ratio;
				var colors = ['#' + color2];

				var hex = function(x) {
					x = x.toString(16);
					return (x.length == 1) ? '0' + x : x;
				};

				for (var i = 1; i < steps-1; i++)
				{

					var r = Math.ceil(parseInt(color1.substring(0,2), 16) * ratioTemp + parseInt(color2.substring(0,2), 16) * (1-ratioTemp));
					var g = Math.ceil(parseInt(color1.substring(2,4), 16) * ratioTemp + parseInt(color2.substring(2,4), 16) * (1-ratioTemp));
					var b = Math.ceil(parseInt(color1.substring(4,6), 16) * ratioTemp + parseInt(color2.substring(4,6), 16) * (1-ratioTemp));
					var color = '#' + hex(r) + hex(g) + hex(b);
					colors.push(color);
					ratioTemp += ratio;

				};
				colors.push('#' + color1);

				this.colors=colors;
	}
	
}