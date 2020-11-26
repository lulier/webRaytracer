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
    constructor(color,albedo,specularExponent,refractiveIndex){
        this.color = color;
        this.albedo = albedo;
        this.specularExponent = specularExponent;
        this.refractiveIndex = refractiveIndex;
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
    let ivoryMaterial = new Material(new TGAColor(102,102,76,255),[0.6,0.3,0.1,0.0],50,1.0);
    let glassMaterial = new Material(new TGAColor(153,178,204,255),[0.0,0.5,0.1,0.8],125,1.5);
    let redMaterial = new Material(new TGAColor(76,25,25,255),[0.9,0.1,0.0,0.0],10,1.0);
    let mirrorMaterial = new Material(new TGAColor(255,255,255,255),[0.0,10,0.8,0.0],1425,1.0);

    let spheres = [];
    spheres.push(new Sphere(new Vector(-3,0,-16),2,ivoryMaterial));
    spheres.push(new Sphere(new Vector(-1,-1.5,-12),2,glassMaterial));
    spheres.push(new Sphere(new Vector(1.5,-0.5,-18),3,redMaterial));
    spheres.push(new Sphere(new Vector(7,5,-18),4,mirrorMaterial));

    let lights = [];
    lights.push(new Light(new Vector(-20,20,20),1.5));
    lights.push(new Light(new Vector(30,50,-25),1.8));
    lights.push(new Light(new Vector(30,20,30),1.7));

    scene.spheres = spheres;
    scene.lights = lights;
    scene.background = new TGAColor(0.2*255,0.7*255,0.8*255);
    render();
})()

function reflect(dir,normal){
    return Vector.sub(dir,Vector.mul(normal,2*Vector.dot(dir,normal)));
}

// https://en.wikipedia.org/wiki/Snell%27s_law Vector form
function refract(dir,normal,refractiveIndex){
    let cosi = - Vector.dot(dir,normal)
    let etai = 1;
    let etar = refractiveIndex;
    if(cosi < 0){
        cosi = - cosi;
        etai = refractiveIndex;
        etar = 1;
        normal = Vector.mul(normal,-1);
    }

    let eta = etai / etar;
    let cosr = 1 - eta*eta*(1-cosi*cosi);
    // 没有折射
    if(cosr < 0){
        return new Vector(0,0,0);
    }

    return Vector.add(Vector.mul(dir,eta),Vector.mul(normal,eta*cosi - Math.sqrt(cosr)));
}

function castRay(origin,dir,depth){
    let {intersect,point,normal,material} = sceneIntersect(origin,dir);
    if(!intersect || depth > 4){
        return scene.background;
    }

    let reflectDir = reflect(dir,normal).normalize();
    let reflectPoint = Vector.add(point,Vector.mul(normal,Vector.dot(reflectDir,normal) < 0? -0.001:0.001));
    let reflectColor = castRay(reflectPoint,reflectDir,depth+1);

    let refractColor = new TGAColor(0,0,0);
    if(material.albedo[3]){
        let refractDir = refract(dir,normal,material.refractiveIndex);
        let refractPoint = Vector.add(point,Vector.mul(normal,Vector.dot(refractDir,normal) < 0? -0.001:0.001));
        refractColor = castRay(refractPoint,refractDir,depth+1);
    }
    

    let diffuseIntensity = 0;
    let specularIntensity = 0;
    let viewDir = Vector.neg(dir);
    for (let i = 0; i < scene.lights.length; i++) {
        let lightDir = Vector.sub(scene.lights[i].position,point);
        let lightDistance = lightDir.len();
        lightDir.normalize();
    
        let shadowPoint = Vector.add(point,Vector.mul(normal,Vector.dot(lightDir,normal) < 0? -0.001:0.001));
        let shadowIntersect = sceneIntersect(shadowPoint,lightDir);
        if(!shadowIntersect.intersect || Vector.sub(shadowIntersect.point,point).len() >= lightDistance){
            diffuseIntensity += Math.max(0,Vector.dot(lightDir,normal)) * scene.lights[i].intensity;
            let halfVector = Vector.add(lightDir,viewDir).normalize();
            specularIntensity += Math.pow(Math.max(0,Vector.dot(reflect(lightDir,normal),dir)),material.specularExponent)*scene.lights[i].intensity;
        }
    }

    diffuseIntensity = diffuseIntensity * material.albedo[0];
    specularIntensity = specularIntensity * material.albedo[1];

    let result = new TGAColor(material.color.r*diffuseIntensity,material.color.g*diffuseIntensity,material.color.b*diffuseIntensity);
    result.r = Math.floor(result.r + 255 * specularIntensity + reflectColor.r * material.albedo[2] + refractColor.r * material.albedo[3]);
    result.g = Math.floor(result.g + 255 * specularIntensity + reflectColor.g * material.albedo[2] + refractColor.g * material.albedo[3]);
    result.b = Math.floor(result.b + 255 * specularIntensity + reflectColor.b * material.albedo[2] + refractColor.b * material.albedo[3]);
    let max = Math.max(result.r,Math.max(result.g,result.b));
    if(max > 255){
        result.r = Math.floor(result.r * (255/max));
        result.g = Math.floor(result.g * (255/max));
        result.b = Math.floor(result.b * (255/max));
    }
    
    return result;
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
    const image = new TGAImage(1024,768);
    const camera = new Vector(0,0,0);
    const fov = Math.PI / 3;
    const half_fov = fov / 2;
    for (let j = 0; j < image.height; j++) {
        let y = (2*(j+0.5)/image.height - 1)*Math.tan(half_fov);
        for (let i = 0; i < image.width; i++) {
            let x = (2*(i + 0.5)/image.width - 1)*Math.tan(half_fov)*image.width/image.height;
            let dir = new Vector(x,y,-1).normalize();
            image.set(i,j,castRay(camera,dir,0));
        }
    }

    image.output();
}