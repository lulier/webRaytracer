const { Vector } = require("./vector");

class Sphere{
    constructor(center,radius,material){
        this.center = center;
        this.radius = radius;
        this.radiusP = this.radius * this.radius;
        this.material = material;
    }

    // http://www.lighthouse3d.com/tutorials/maths/ray-sphere-intersection
    rayIntersect(origin,direction){
        let distance = Vector.sub(this.center,origin);
        let proj = Vector.dot(distance,direction);
        let distance2 = Vector.dot(distance,distance) - proj * proj;
        if(distance2 > this.radiusP){
            return {intersect:false,distanceH:0};
        }

        let thc = Math.sqrt(this.radiusP - distance2);
        let t0 = proj - thc;
        let t1 = proj + thc;
        if(t0 < 0)
            t0 = t1;
        if(t0 < 0)
            return {intersect:false,distanceH:0};
        return {intersect:true,distanceH:t0};
    }
}

module.exports = {Sphere};