function normalise(x) {
  return (x + 180) % 360 - 180;
}

function parallel(φ, λ0, λ1) {
  if (λ0 > λ1) λ1 += 360;
  var dλ = λ1 - λ0,
      step = dλ / Math.ceil(dλ);
  return d3.range(λ0, λ1 + .5 * step, step).map(function(λ) { return [normalise(λ), φ]; });
}

export function boundsPolygon(geometry) {
    var bounds = d3.geo.bounds(geometry);
    if (bounds[0][0] === -180 && bounds[0][1] === -90 && bounds[1][0] === 180 && bounds[1][1] === 90) {
      return {type: "Sphere"};
    }
    if (bounds[0][1] === -90) bounds[0][1] += 1e-6;
    if (bounds[1][1] === 90) bounds[0][1] -= 1e-6;
    if (bounds[0][1] === bounds[1][1]) bounds[1][1] += 1e-6;

    return {
      type: "Polygon",
      coordinates: [
        [bounds[0]]
          .concat(parallel(bounds[1][1], bounds[0][0], bounds[1][0]))
          .concat(parallel(bounds[0][1], bounds[0][0], bounds[1][0]).reverse())
      ]
    };
}