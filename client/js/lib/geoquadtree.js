import { chunk, flatten } from 'lodash/array'
import { sortBy } from 'lodash/collection'
import { boundsPolygon } from './bounds.js'

var quadtreeId = 0;
export default class GeoQuadTree {
    constructor(features, maxLeafSize, isRoot = true) {
        this.id = quadtreeId++;
        if (isRoot) {
            features.forEach(d => {
                d.centroid = d3.geo.centroid(d)
                d.boundsPolygon = boundsPolygon(d)
            })
        }

        this.numFeatures = features.length;

        this.boundingBox = boundsPolygon({
            type: 'FeatureCollection',
            features: features
        });
        this.boundingBox.properties = { id: this.id }

        if (features.length > maxLeafSize) {
            this.children = this.subdivide(features, maxLeafSize)
        } else {
            this.features = {
                type: 'FeatureCollection',
                features: features,
                properties: { id: this.id }
            }
        }
    }

    getLeafNodes() {
        return this.children ? flatten(this.children.map(c => c.getLeafNodes())) : this;
    }

    subdivide(features, maxLeafSize) {
        var sortedX = sortBy(features, d => d.centroid[0]);
        var [left, right] = chunk(sortedX, Math.round(sortedX.length / 2));
        var leftSortedY = sortBy(left, d => d.centroid[1]);
        var rightSortedY = sortBy(right, d => d.centroid[1]);
        var [topleft, bottomleft] = chunk(leftSortedY, Math.round(leftSortedY.length / 2));
        var [topright, bottomright] = chunk(rightSortedY, Math.round(rightSortedY.length / 2));
        return [
            new GeoQuadTree(topleft, maxLeafSize, false),
            new GeoQuadTree(topright, maxLeafSize, false),
            new GeoQuadTree(bottomleft, maxLeafSize, false),
            new GeoQuadTree(bottomright, maxLeafSize, false)
        ];
    }

    getVisibleLeaves(intersectFn) {
        if (intersectFn(this.boundingBox)) {
            if (this.children) return flatten(this.children.map(c => c.getVisibleLeaves(intersectFn)))
            else return this;
        } else return [];
    }

    getFeatures(intersectFn) {
        return this.getVisibleLeaves(intersectFn).map(l => l.features);
    }
}
