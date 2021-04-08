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

        private fsQuad = new (THREE as any).Pass.FullScreenQuad( new THREE.ShaderMaterial({
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
        }))

        constructor(){
            super(
                new THREE.PlaneBufferGeometry(2,2),
                new THREE.ShaderMaterial({
                    defines:{
                        SAMPLE_OFFSET_LEN: sampleOffsets.length
                    },
                    uniforms: {
                        tDepth: {
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

                        uniform sampler2D tDepth;
                        uniform float clipNear;
                        uniform float clipFar;
                        uniform float aspectRatio;
                        uniform vec2 sampleOffsets[SAMPLE_OFFSET_LEN];

                        varying vec2 vUv;

                        void main(){
                            float depth = texture2D(tDepth, vUv).r;
                            float viewZ = perspectiveDepthToViewZ(depth, clipNear, clipFar);
                            float depthDiff = 0.0;

                            for( int i=0; i<SAMPLE_OFFSET_LEN; i++){
                                float d = texture2D(tDepth, vUv+sampleOffsets[i]*vec2(aspectRatio, 1.0)).r;
                                float vz = perspectiveDepthToViewZ(d, clipNear, clipFar);
                                depthDiff += abs( viewZ-vz );
                            }
                            depthDiff /= float(SAMPLE_OFFSET_LEN);

                            float opacity = clamp((depthDiff-0.1)/0.01, 0.0, 1.0);
                            vec3 lineColor = vec3(0,0,0);
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
            ;(this.material as THREE.ShaderMaterial).uniforms.tDepth.value = this.depthRenderTarget.texture

            this.onBeforeRender = (renderer, scene, camera)=>{
                renderer.getDrawingBufferSize(v2)
                if( this.depthRenderTarget.width!=v2.x || this.depthRenderTarget.height!=v2.y )
                    this.depthRenderTarget.setSize(v2.x, v2.y)

                const restore = {
                    renderTarget: renderer.getRenderTarget()  as THREE.WebGLRenderTarget
                }

                this.fsQuad.material.uniforms.tDiffuse.value = restore.renderTarget.depthTexture
                renderer.setRenderTarget( this.depthRenderTarget )
                this.fsQuad.render( renderer )

                ;(this.material as THREE.ShaderMaterial).uniforms.clipNear.value = (camera as THREE.PerspectiveCamera).near
                ;(this.material as THREE.ShaderMaterial).uniforms.clipFar.value = (camera as THREE.PerspectiveCamera).far
                ;(this.material as THREE.ShaderMaterial).uniforms.aspectRatio.value = (camera as THREE.PerspectiveCamera).aspect

                renderer.setRenderTarget(restore.renderTarget)
            }
        }

    }

}