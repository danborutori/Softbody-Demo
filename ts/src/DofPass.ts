namespace hahaApp {

    export class DofPass extends ((THREE as any).Pass as {new ():Pass}) {

        private materialBokeh: THREE.ShaderMaterial
        private uniforms: {[key: string]: THREE.IUniform}
        private fsQuad: any
        private camera: THREE.PerspectiveCamera

        constructor( camera: THREE.PerspectiveCamera, params: {
            focus?: number
            aspect?: number
            aperture?: number
            maxblur?: number
        } ){
            super()

            const focus = ( params.focus !== undefined ) ? params.focus : 1.0
            const aspect = ( params.aspect !== undefined ) ? params.aspect : camera.aspect
            const aperture = ( params.aperture !== undefined ) ? params.aperture : 0.025
            const maxblur = ( params.maxblur !== undefined ) ? params.maxblur : 1.0
        
            this.camera = camera

        	// bokeh material

            const bokehShader = (THREE as any).BokehShader;
            const bokehUniforms = THREE.UniformsUtils.clone( bokehShader.uniforms );

            bokehUniforms[ 'focus' ].value = focus;
            bokehUniforms[ 'aspect' ].value = aspect;
            bokehUniforms[ 'aperture' ].value = aperture;
            bokehUniforms[ 'maxblur' ].value = maxblur;
            bokehUniforms[ 'nearClip' ].value = camera.near;
            bokehUniforms[ 'farClip' ].value = camera.far;

            this.materialBokeh = new THREE.ShaderMaterial( {
                defines: window.Object.assign( {}, bokehShader.defines ),
                uniforms: bokehUniforms,
                vertexShader: bokehShader.vertexShader,
                fragmentShader: bokehShader.fragmentShader
            } );
            this.materialBokeh.defines.DEPTH_PACKING = "0"

            this.uniforms = bokehUniforms;
            this.needsSwap = true;

            this.fsQuad = new (THREE as any).Pass.FullScreenQuad( this.materialBokeh );
        }

        render( renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget/*, deltaTime, maskActive*/ ) {

            // Render bokeh composite
    
            this.uniforms[ 'tDepth' ].value = readBuffer.depthTexture
            this.uniforms[ 'tColor' ].value = readBuffer.texture
            this.uniforms[ 'nearClip' ].value = this.camera.near
            this.uniforms[ 'farClip' ].value = this.camera.far
    
            if ( this.renderToScreen ) {
    
                renderer.setRenderTarget( null )
    
            } else {
    
                renderer.setRenderTarget( writeBuffer )
                renderer.clear()
    
            }
            this.fsQuad.render( renderer )
        }
    }

}