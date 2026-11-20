import {writeFile} from 'node:fs/promises';
import {createCanvas,ImageData} from '@napi-rs/canvas';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {TextureSource} from 'three';

globalThis.document = {createElement: () => createCanvas(1,1)};
globalThis.ImageData = ImageData;
globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend();
  }
};

const {room,makeCamera,setCamera,sideYaw} = await import('./build-room.js');
const model = room.clone();
const cached = new Map();
model.traverse(object=>{
  if(!object.material) return;
  const mat=object.material;
  if(!mat.map&&!mat.emissiveMap)return;
  object.material=mat.clone();
  for(const key of ['map','emissiveMap']){
    const source=mat[key];
    if(!source)continue;
    if(!cached.has(source)){
      const texture=source.clone();
      const canvas=source.image;
      const {width,height}=canvas;
      const pixels=canvas.getContext('2d').getImageData(0,0,width,height);
      const data=new Uint8ClampedArray(pixels.data.length);
      const stride=width*4;
      for(let y=0;y<height;y++){
        const row=source.flipY?height-1-y:y;
        data.set(pixels.data.subarray(row*stride,(row+1)*stride),y*stride);
      }
      texture.source=new TextureSource({width,height,data});
      texture.flipY=false;
      cached.set(source,texture);
    }
    object.material[key]=cached.get(source);
  }
});
const frontCamera=setCamera(makeCamera());
frontCamera.name='网页默认视角';
const sideCamera=setCamera(makeCamera(),sideYaw,.27);
sideCamera.name='侧视角';
model.add(frontCamera,sideCamera);

const binary=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true});
await writeFile(process.argv[2] ?? 'dist/skill-library-room.glb',new Uint8Array(binary));
