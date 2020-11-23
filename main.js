const { TGAImage, TGAColor, TGALoader } = require("./tga");
var fs = require('fs');
const { Vector } = require("./vector");
const { Sphere } = require("./geometry");
const { number } = require("yargs");

class Light{
    constructor(position,intensity){
        this.position = position;
        this.intensity = intensity;
    }
}

class Material{
    constructor(color){
        this.color = color;
    }
}

class Scene{
    constructor(){
        this.spheres = null;
        this.Lights = null;
        this.background = null;
    }
}

let scene = new Scene();

(()=>{
    let redMaterial = new Material(new TGAColor(76,25,25,255));
    let ivoryMaterial = new Material(new TGAColor(102,102,76,255))

    let spheres = [];
    spheres.push(new Sphere(new Vector(-3,0,-16),2,ivoryMaterial));
    spheres.push(new Sphere(new Vector(-1,-1.5,-12),2,redMaterial));
    spheres.push(new Sphere(new Vector(1.5,0.5,-18),3,redMaterial));
    spheres.push(new Sphere(new Vector(7,5,-18),4,ivoryMaterial));

    let lights = [];
    lights.push(new Light(new Vector(-20,20,20),1.5));

    scene.spheres = spheres;
    scene.lights = lights;
    scene.background = new TGAColor(0.2*255,0.7*255,0.8*255);
    render();
})()

function castRay(origin,dir){
    let {intersect,point,normal,material} = sceneIntersect(origin,dir);
    if(!intersect){
        return scene.background;
    }

    let diffuseIntensity = 0
    for (let i = 0; i < scene.lights.length; i++) {
        let lightDir = Vector.sub(scene.lights[i].position,point).normalize();
        diffuseIntensity += Math.max(0,Vector.dot(lightDir,normal));
    }

    return new TGAColor(material.color.r*diffuseIntensity,material.color.g*diffuseIntensity,material.color.b*diffuseIntensity);
}

function sceneIntersect(origin,dir){
    let distance = Number.MAX_SAFE_INTEGER;
    let material = new Material(scene.background);
    let index = -1;
    for (let i = 0; i < scene.spheres.length; i++) {
        let tryintersect = scene.spheres[i].rayIntersect(origin,dir);
        if(tryintersect.intersect && tryintersect.distanceH < distance){
            index = i;
            distance = tryintersect.distanceH;
            material = scene.spheres[i].material;
        }
    }

    if(index !== -1){
        let point = new Vector(origin.x + dir.x * distance,
            origin.y + dir.y * distance,
            origin.z + dir.z * distance);
        let normal = Vector.sub(point,scene.spheres[index].center).normalize();
        return {intersect:true,point:point,normal:normal,material:material}
    } else {
        return {intersect:false}
    }
}

function render(){
    const image = new TGAImage(1024,1024);
    const camera = new Vector(0,0,0);
    const fov = Math.PI / 2;
    const half_fov = fov / 2;
    for (let j = 0; j < image.height; j++) {
        let y = (2*(j+0.5)/image.height - 1)*Math.tan(half_fov);
        for (let i = 0; i < image.width; i++) {
            let x = (2*(i + 0.5)/image.width - 1)*Math.tan(half_fov)*image.width/image.height;
            let dir = new Vector(x,y,-1).normalize();
            image.set(i,j,castRay(camera,dir));
        }
    }

    image.output();
}