# Graphics licensing

`human-head.js` and `human-body.js` derive from MakeHuman Community core graphics:
- https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj
- https://github.com/makehumancommunity/makehuman/tree/master/makehuman/data/targets
- https://static.makehumancommunity.org/about/license.html
- https://static.makehumancommunity.org/mpfb/faq/build_other_chargen.html

The core graphical assets, base mesh and targets are dedicated under **CC0 1.0 Universal**:
https://creativecommons.org/publicdomain/zero/1.0/

They were adapted (coordinate system, anatomical shape options, clothed body, reduced topology, skin weights) for this update. No MakeHuman program code is included. Its software license does not replace the CC0 license of these graphical assets.

`horse-body.js` derives from the **Rigged Horse** model by **Lyndon Daniels**, rig by **Chad M**, published in 2012 under **CC0**:
- https://opengameart.org/content/rigged-horse
- Original: https://opengameart.org/sites/default/files/riggedHorse.blend

Adaptations: baked subdivision, coordinate system, lighter silhouette, head carriage, 19-joint runtime skeleton, exported weights, per-account coat materials and fitted saddle/bridle. The source .blend and Blender software are not required by the web app. Equipment and animation code are local to the app.

The existing bundled Three.js distribution keeps its existing MIT notice. The existing Sisal logo is reused from the repository.

No externally hosted models, textures, analytics or paid graphics API are used at runtime.
