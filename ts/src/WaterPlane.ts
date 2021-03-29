namespace hahaApp {
    const zero2 = new THREE.Vector2(0,0)
    const m = new THREE.Matrix4
    const v2 = new THREE.Vector2

    THREE.ShaderChunk.quaternion = `

        vec4 quaternionFromUnitVectors( vec3 vFrom, vec3 vTo ){
            // assumes direction vectors vFrom and vTo are normalized

            vec4 q;

            float EPS = 0.000001;

            float r = dot(vFrom, vTo ) + 1.0;

            if ( r < EPS ) {

                r = 0.0;

                if ( abs( vFrom.x ) > abs( vFrom.z ) ) {

                    q.x = - vFrom.y;
                    q.y = vFrom.x;
                    q.z = 0.0;
                    q.w = r;

                } else {

                    q.x = 0.0;
                    q.y = - vFrom.z;
                    q.z = vFrom.y;
                    q.w = r;

                }

            } else {

                // crossVectors( vFrom, vTo ); // inlined to avoid cyclic dependency on Vector3

                q.x = vFrom.y * vTo.z - vFrom.z * vTo.y;
                q.y = vFrom.z * vTo.x - vFrom.x * vTo.z;
                q.z = vFrom.x * vTo.y - vFrom.y * vTo.x;
                q.w = r;

            }

            return normalize(q);

        }

        vec3 applyQuaternion( vec3 v, vec4 q ){
            vec3 result;
            
            float x = v.x, y = v.y, z = v.z;
            float qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    
            // calculate quat * vector
    
            float ix = qw * x + qy * z - qz * y;
            float iy = qw * y + qz * x - qx * z;
            float iz = qw * z + qx * y - qy * x;
            float iw = - qx * x - qy * y - qz * z;
    
            // calculate result * inverse quat
    
            result.x = ix * qw + iw * - qx + iy * - qz - iz * - qy;
            result.y = iy * qw + iw * - qy + iz * - qx - ix * - qz;
            result.z = iz * qw + iw * - qz + ix * - qy - iy * - qx;
    
            return result;
        }

    `

    class WaterMaterial extends THREE.MeshStandardMaterial {

        readonly uniforms: {
            tFramebuffer: THREE.IUniform
            framebufferSize: THREE.IUniform
            waterTransforms: THREE.IUniform
            time: THREE.IUniform
        }

        constructor(){

            super({
                transparent: true,
                blending: THREE.NoBlending
            })

            this.uniforms = {
                tFramebuffer: {
                    value: null
                },
                framebufferSize: {
                    value: new THREE.Vector2(0,0)
                },
                waterTransforms: { value: [
                    new THREE.Matrix4,
                    new THREE.Matrix4,
                    new THREE.Matrix4
                ] },
                time: {
                    value: 0
                }
            }

            const  defines = this.defines || (this.defines = {})
            defines.WATER_TRANSFORM_COUNT = (this.uniforms.waterTransforms.value as []).length.toString()

            const superOnBeforeCompile = this.onBeforeCompile
            this.onBeforeCompile = ( shader, renderer )=>{
                superOnBeforeCompile( shader, renderer )

                shader.uniforms.tFramebuffer = this.uniforms.tFramebuffer
                shader.uniforms.framebufferSize = this.uniforms.framebufferSize
                shader.uniforms.waterTransforms = this.uniforms.waterTransforms
                shader.uniforms.time = this.uniforms.time

                shader.vertexShader = `
                    uniform float time;
                `+shader.vertexShader.replace(
                    "#include <project_vertex>",
                    `

                    float phase = PI*2.0*(transformed.x/2.0+time);
                    transformed.y += (cos( phase ) - sin(  phase ))*0.01;

                    #include <project_vertex>
                    `
                )

                shader.fragmentShader = `
                    #include <quaternion>

                    uniform sampler2D tFramebuffer;
                    uniform vec2 framebufferSize;
                    uniform mat4 waterTransforms[WATER_TRANSFORM_COUNT];
                `+shader.fragmentShader.replace(
                    "#include <normal_fragment_maps>",
                    `
                    #ifdef USE_UV
                    vec3 n = vec3(0,0,0);
                    for( int i=0; i<WATER_TRANSFORM_COUNT; i++  ){
                        vec2 uv = (waterTransforms[i]*vec4(vUv,0,1)).xy;
                        n += texture2D( normalMap, uv ).rgb*2.0-1.0;
                    }
                    n = normalize( n );

                    vec4 q = quaternionFromUnitVectors( vec3(0,0,1),  normal );
                    normal = applyQuaternion( n, q );
                    #endif
                    `
                ).replace(
                    "#include <dithering_fragment>",
                    `
                    #include <dithering_fragment>

                    vec2 framebufferUV = gl_FragCoord.xy/framebufferSize;

                    vec2 offset = normalize(refract( normalize(-vViewPosition), normal, 1.0/1.33 )).xy*0.01;

                    framebufferUV += offset;
                    vec4 framebufferColor = texture2D( tFramebuffer, framebufferUV );

                    gl_FragColor.rgb = mix( gl_FragColor.rgb, framebufferColor.xyz, 0.9 );

                    `
                )
            }

            const loader = new THREE.TextureLoader()
            loader.load("./textures/9110-normal.jpg", tex=>{
                tex.wrapS = THREE.RepeatWrapping
                tex.wrapT = THREE.RepeatWrapping
                tex.anisotropy = 16
                tex.generateMipmaps = true
                tex.minFilter = THREE.LinearMipMapLinearFilter
                tex.magFilter = THREE.LinearFilter
                tex.needsUpdate = true
                this.normalMap = tex
                this.needsUpdate = true
            })
        }

    }

    export class WaterPlane extends THREE.Mesh{

        constructor(){
            const bufferTextureSize = new THREE.Vector2(0,0)
            let bufferTexture: THREE.DataTexture
            const mat = new WaterMaterial()

            super(new THREE.PlaneBufferGeometry(10,10,50,50).rotateX(-Math.PI/2), mat)

            this.onBeforeRender = (renderer, scene, camera)=>{
                renderer.getDrawingBufferSize(v2)
                if( bufferTextureSize.x<v2.x || bufferTextureSize.y<v2.y ){
                    bufferTextureSize.x = THREE.Math.ceilPowerOfTwo(v2.x)
                    bufferTextureSize.y = THREE.Math.ceilPowerOfTwo(v2.y)
                    bufferTexture = new THREE.DataTexture(null, bufferTextureSize.x, bufferTextureSize.y, THREE.RGBAFormat, THREE.UnsignedByteType, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter, 16)
                    bufferTexture.needsUpdate = true
                    mat.uniforms.tFramebuffer.value = bufferTexture
                    mat.uniforms.framebufferSize.value.copy(bufferTextureSize)
                }

                const copyFramebufferToTexture: (position: {x: number, y: number}, texture: THREE.Texture)=>void = (renderer as any).copyFramebufferToTexture
                copyFramebufferToTexture(zero2, bufferTexture)
                
                const ms = mat.uniforms.waterTransforms.value as THREE.Matrix4[]
                for( let i=0; i<ms.length; i++){
                    ms[i].makeTranslation( 0.5*performance.now()/1000, 0, 0 )
                    .multiply(m.makeRotationZ(i*Math.PI*4/3))
                    .multiply( m.makeScale(5,5,5) )
                }
                mat.uniforms.time.value = performance.now()/1000
            }

            this.receiveShadow = true
            this.castShadow = false

        }
    }

}