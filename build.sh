#! /bin/bash

cd ./ts
tsc-plus

cd ../
uglifyjs -c -m -o ./html/script/all.min.js ./build/all.js
mkdir -p ./html/script/lib/
cp bower_components/three.js/build/three.min.js ./html/script/lib/
cp bower_components/three.js/examples/js/utils/BufferGeometryUtils.js ./html/script/lib/
cp bower_components/ammo.js/builds/ammo.wasm.js ./html/script/lib/
cp bower_components/ammo.js/builds/ammo.wasm.wasm ./html/script/lib/
cp bower_components/three.js/examples/js/loaders/GLTFLoader.js ./html/script/lib/
cp bower_components/three.js/examples/js/loaders/STLLoader.js ./html/script/lib/
cp bower_components/three.js/examples/js/postprocessing/ShaderPass.js ./html/script/lib/
cp bower_components/three.js/examples/js/shaders/CopyShader.js ./html/script/lib/
cp bower_components/three.js/examples/js/postprocessing/EffectComposer.js ./html/script/lib/
cp bower_components/three.js/examples/js/postprocessing/RenderPass.js ./html/script/lib/
cp bower_components/three.js/examples/js/shaders/SMAAShader.js ./html/script/lib/
cp bower_components/three.js/examples/js/postprocessing/SMAAPass.js ./html/script/lib/
cp bower_components/three.js/examples/js/shaders/BokehShader.js ./html/script/lib/
cp bower_components/three.js/examples/js/shaders/LuminosityHighPassShader.js ./html/script/lib/
cp bower_components/three.js/examples/js/postprocessing/UnrealBloomPass.js ./html/script/lib/
cp bower_components/three.js/examples/js/math/ConvexHull.js ./html/script/lib/


