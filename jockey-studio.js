/* One material/light setup for the personal editor and newspaper portrait. */
import * as T from './vendor/three.module.min.js';
import {environmentTexture} from './studio-materials.js?v=studio-9';
import {material} from './studio-geometry.js?v=studio-9';
import {createJockey} from './jockey-model.js?v=club-53';
import {styleColors,paintSilks} from './horse-style.js?v=studio-9';
export function studioLights(scene,{shadows=false,mobile=false}={}){
 scene.environment=environmentTexture({studio:true});scene.environmentIntensity=.30;scene.background=new T.Color('#142b23');
 scene.add(new T.HemisphereLight('#eee9de','#263e31',1.5));const key=new T.DirectionalLight('#fff0d8',2.8);key.position.set(4,6,5);key.castShadow=shadows;if(shadows){key.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);Object.assign(key.shadow.camera,{left:-4,right:4,top:5,bottom:-3});key.shadow.bias=-.0003;}scene.add(key);const rim=new T.DirectionalLight('#abd0c7',1.7);rim.position.set(-3,3,-4);scene.add(rim);return {key,rim};
}
export function studioJockey(appearance,{standing=true,showHelmet}={}){
 const s=styleColors(appearance),canvas=document.createElement('canvas');canvas.width=canvas.height=512;paintSilks(canvas.getContext('2d'),512,512,s);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=2;
 return createJockey({custom:s,standing,showHelmet,silk:material('#fff',{map}),breeches:material(s.breechesColor,{roughness:.85}),gloves:material(s.glovesColor,{roughness:.55}),helmet:material(s.helmetColor,{roughness:.35,clearcoat:.45})});
}
