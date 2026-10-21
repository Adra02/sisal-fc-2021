// Pure cosmetic pose: never reads or changes rank, speed, seed or race plan.
export function signaturePose(h,kind,age,reduced=false,weight=1){
 const wave=reduced?0:Math.sin(age*4)*.15;
 h.head.rotation.y=0;for(const arm of h.arms){if(arm.userData.restRotation)arm.rotation.copy(arm.userData.restRotation);else arm.rotation.set(0,0,0);}
 if(kind==='arms'){h.arms[0].rotation.z+=2.4*weight;h.arms[1].rotation.z+=(2.4+wave)*weight;}
 else if(kind==='bow'){h.rider.rotation.z=-.45*weight;h.head.rotation.z=-.25*weight;}
 else if(kind==='crowd'){h.arms[1].rotation.z+=1.6*weight;h.arms[1].rotation.x+=(.7+wave)*weight;h.head.rotation.y=.4*weight;}
 else{h.arms[1].rotation.z+=(2.35+wave)*weight;h.rider.rotation.z+=.16*weight;}
}
