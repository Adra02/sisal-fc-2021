import {buildFace} from './jockey-face.js?v=paper-pages';
import {styleColors} from './horse-style.js?v=paper-pages';
import * as T from './vendor/three.module.min.js';
// One geometry factory for both the real race and editorial portraits.
export function createJockey({ball,link,mat,mats,silk,breeches,gloves,helmet,custom,index=0,showHelmet=true}){
    const rider=new T.Group();
    const torso=ball(rider,silk,[.23,.48,0],[.23,.43,.22]);torso.rotation.z=-.8;
    ball(rider,breeches,[-.1,.15,0],[.25,.17,.23]);
    const arms=[];
    for(const z of [-.28,.28]){
      link(rider,breeches,[-.1,.15,z],[.24,-.12,z*1.2],.095);link(rider,mats.black,[.24,-.12,z*1.2],[-.12,-.49,z*1.15],.07);ball(rider,mats.black,[-.04,-.5,z*1.15],[.16,.065,.08]);
      const arm=new T.Group();arm.name=`jockey-arm-${index}-${z>0?'salute':'reins'}`;arm.position.set(.4,.66,z*.62);rider.add(arm);
      link(arm,silk,[0,0,0],[.14,-.33,z*.38],.085);link(arm,silk,[.14,-.33,z*.38],[.42,-.39,z*.04],.055);ball(arm,gloves,[.44,-.39,z*.04],[.065,.06,.07]);arms.push(arm);
    }
    const head=new T.Group();head.position.set(.6,.89,0);rider.add(head);
    custom=custom||styleColors({});
    buildFace(head,{ball,link,mat,s:custom,showHelmet});
    if(showHelmet){
    ball(head,helmet||silk,[0,.19,0],[.26,.15,.23]);ball(head,mats.dark,[0,.13,.13],[.26,.03,.17]);
    if(custom){const stripe=ball(head,mat(custom.accentColor,{roughness:.5}),[0,.325,0],[.19,.016,.045]);stripe.name='jockey-helmet-stripe';}

    }
return {rider,head,arms};
}
