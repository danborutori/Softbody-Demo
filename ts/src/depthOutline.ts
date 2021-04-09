namespace hahaApp {
    const v2 = new THREE.Vector2

    const sampleRadius = 0.0005
    const sampleOffsets = [
        new THREE.Vector2(1,1).multiplyScalar(sampleRadius),
        new THREE.Vector2(0,1).multiplyScalar(sampleRadius),
        new THREE.Vector2(-1,1).multiplyScalar(sampleRadius),
        new THREE.Vector2(1,0).multiplyScalar(sampleRadius),
        new THREE.Vector2(-1,0).multiplyScalar(sampleRadius),
        new THREE.Vector2(1,-1).multiplyScalar(sampleRadius),
        new THREE.Vector2(0,-1).multiplyScalar(sampleRadius),
        new THREE.Vector2(-1,-1).multiplyScalar(sampleRadius)
    ]

    export class OutlinePlane extends THREE.Mesh {

        private depthRenderTarget = new THREE.WebGLRenderTarget(1024,1024,{
            format: THREE.RedFormat,
            type: THREE.FloatType,
            generateMipmaps: false,
            depthBuffer: false,
            stencilBuffer: false
        })
        private normalRenderTarget = new THREE.WebGLRenderTarget(1024,1024,{
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
            generateMipmaps: false,
            depthBuffer: false,
            stencilBuffer: false
        })
        private colorRenderTarget = new THREE.WebGLRenderTarget(512,512,{
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
            generateMipmaps: false,
            depthBuffer: false,
            stencilBuffer: false
        })

        private copyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: {
                    value: null
                }
            },
            vertexShader: `
                varying vec2 vUv;

                void main(){
                    vUv = uv;
                    gl_Position = vec4(position, 1);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;

                varying vec2 vUv;

                void main(){

                    gl_FragColor = texture2D( tDiffuse, vUv );

                }
            `
        })
        private depthToNormalMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDepth: { value: null },
                resolution: { value: new THREE.Vector2},
                projectMatrixInv: { value: new THREE.Matrix4}
            },
            vertexShader: `
                void main(){
                    gl_Position = vec4(position, 1);
                }
            `,
            fragmentShader: `
                #include <packing>

                uniform sampler2D tDepth;                
                uniform vec2 resolution;
                uniform mat4 projectMatrixInv;

                void main(){
                    vec2 uv = gl_FragCoord.xy/resolution;
                    vec2 uvx = (gl_FragCoord.xy+vec2(1,0))/resolution;
                    vec2 uvy = (gl_FragCoord.xy+vec2(0,1))/resolution;
                    float depth = texture2D( tDepth, uv ).r;
                    float depthx = texture2D( tDepth, uvx ).r;
                    float depthy = texture2D( tDepth, uvy ).r;

                    vec4 pt =  projectMatrixInv*(vec4( uv, depth, 1 )*2.0-1.0);
                    vec4 ptx =  projectMatrixInv*(vec4( uvx, depthx, 1 )*2.0-1.0);
                    vec4 pty =  projectMatrixInv*(vec4( uvy, depthy, 1 )*2.0-1.0);

                    pt /= pt.w;
                    ptx /= ptx.w;
                    pty /= pty.w;

                    vec3 normal = normalize( cross( ptx.xyz-pt.xyz, pty.xyz-pt.xyz ) ) * 0.5+0.5;

                    gl_FragColor = vec4(normal, 1);                    
                }
            `
        })
        private fsQuad = new (THREE as any).Pass.FullScreenQuad()

        constructor(){
            super(
                new THREE.PlaneBufferGeometry(2,2),
                new THREE.ShaderMaterial({
                    defines:{
                        SAMPLE_OFFSET_LEN: sampleOffsets.length,
                        PI: Math.PI
                    },
                    uniforms: {
                        tColor: {
                            value: null
                        },
                        tDepth: {
                            value: null
                        },
                        tNormal: {
                            value: null
                        },
                        clipNear: {
                            value: 0
                        },
                        clipFar: {
                            value: 0
                        },
                        aspectRatio:{
                            value: 1
                        },
                        sampleOffsets: {
                            value: sampleOffsets
                        }
                    },
                    vertexShader: `
                        varying vec2 vUv;

                        void main(){
                            vUv = uv;
                            gl_Position = vec4(position, 1);
                        }
                    `,
                    fragmentShader: `
                        #include <packing>

                        uniform sampler2D tColor;
                        uniform sampler2D tDepth;
                        uniform sampler2D tNormal;
                        uniform float clipNear;
                        uniform float clipFar;
                        uniform float aspectRatio;
                        uniform vec2 sampleOffsets[SAMPLE_OFFSET_LEN];

                        varying vec2 vUv;

                        void main(){
                            float depth = texture2D(tDepth, vUv).r;
                            vec3 normal = texture2D(tNormal, vUv).xyz*2.0-1.0;
                            float viewZ = perspectiveDepthToViewZ(depth, clipNear, clipFar);
                            float depthDiff = 0.0;
                            float maxNormalAngle = 0.0;
                            vec2 colorUv = vUv;
                            float closestZ = 1.0;

                            for( int i=0; i<SAMPLE_OFFSET_LEN; i++){
                                vec2 uv = vUv+sampleOffsets[i]*vec2(aspectRatio, 1.0);
                                float d = texture2D(tDepth, uv).r;
                                vec3 n = texture2D(tNormal, uv).xyz*2.0-1.0;
                                float vz = perspectiveDepthToViewZ(d, clipNear, clipFar);
                                depthDiff += abs( viewZ-vz );
                                maxNormalAngle = max( maxNormalAngle, acos(dot(normal,n)) );

                                if( d<closestZ ){
                                    closestZ = d;
                                    colorUv = uv;
                                }
                            }
                            depthDiff /= float(SAMPLE_OFFSET_LEN);

                            float opacity = clamp((depthDiff-0.1)/0.01,0.0,1.0); // depth edge
                            opacity += clamp((maxNormalAngle-60.0*PI/180.0)/0.01,0.0,1.0); // normal edge
                            vec3 lineColor = texture2D( tColor, colorUv ).rgb;
                            lineColor = (lineColor-0.5)*1.5+0.5;
                            gl_FragColor = vec4(lineColor, opacity);
                        }
                    `,
                    transparent: true,
                    depthTest: false,
                    depthWrite: false,
                    blending: THREE.NormalBlending
                })
            )

            this.renderOrder = 1
            this.frustumCulled = false
            ;(this.material as THREE.ShaderMaterial).uniforms.tColor.value = this.colorRenderTarget.texture
            ;(this.material as THREE.ShaderMaterial).uniforms.tDepth.value = this.depthRenderTarget.texture
            ;(this.material as THREE.ShaderMaterial).uniforms.tNormal.value = this.normalRenderTarget.texture
            this.layers.set(layerOutline)

            this.onBeforeRender = (renderer, scene, camera)=>{
                const restore = {
                    renderTarget: renderer.getRenderTarget() as THREE.WebGLRenderTarget,
                }

                renderer.getDrawingBufferSize(v2)
                if( this.depthRenderTarget.width!=v2.x || this.depthRenderTarget.height!=v2.y ){
                    this.depthRenderTarget.setSize(v2.x, v2.y)
                    this.normalRenderTarget.setSize(v2.x, v2.y)
                }


                this.fsQuad.material = this.copyMaterial

                this.copyMaterial.uniforms.tDiffuse.value = restore.renderTarget.depthTexture
                renderer.setRenderTarget( this.depthRenderTarget )
                this.fsQuad.render( renderer )

                this.copyMaterial.uniforms.tDiffuse.value = restore.renderTarget.texture
                renderer.setRenderTarget( this.colorRenderTarget )
                this.fsQuad.render( renderer )

                this.depthToNormalMaterial.uniforms.tDepth.value = restore.renderTarget.depthTexture
                this.depthToNormalMaterial.uniforms.resolution.value.copy(v2)
                this.depthToNormalMaterial.uniforms.projectMatrixInv.value.copy((camera as THREE.PerspectiveCamera).projectionMatrixInverse)
                this.fsQuad.material = this.depthToNormalMaterial
                renderer.setRenderTarget( this.normalRenderTarget )
                this.fsQuad.render( renderer )

                ;(this.material as THREE.ShaderMaterial).uniforms.clipNear.value = (camera as THREE.PerspectiveCamera).near
                ;(this.material as THREE.ShaderMaterial).uniforms.clipFar.value = (camera as THREE.PerspectiveCamera).far
                ;(this.material as THREE.ShaderMaterial).uniforms.aspectRatio.value = (camera as THREE.PerspectiveCamera).aspect

                renderer.setRenderTarget(restore.renderTarget)
            }
        }

    }

}