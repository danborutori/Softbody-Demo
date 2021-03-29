namespace hahaApp {

    const grassWindTime = {
        value: performance.now()/1000
    }

    setInterval(()=>{
        grassWindTime.value += 1/60
    }, 1000/60)

    export class GrassWinding {
        static modify( material: THREE.Material ){

            const defines = material.defines || (material.defines = {})
            defines.GRASS_WINDING = "1"

            const superOnBeforeCompile = material.onBeforeCompile
            material.onBeforeCompile = (shader, renderer)=>{
                superOnBeforeCompile( shader, renderer )

                shader.uniforms.grassWindTime = grassWindTime

                shader.vertexShader = `
                    uniform float grassWindTime;
                `+shader.vertexShader.replace(
                    "#include <project_vertex>",
                    `
                    #include <project_vertex>

                    float phaseX = ( mvPosition.x + grassWindTime/3.0 ) * PI * 2.0;
                    float phaseZ = ( mvPosition.z + grassWindTime/3.0 ) * PI * 2.0;
                    float str = mvPosition.y*0.01;
                    mvPosition.x += cos( phaseX )*str;
                    mvPosition.z -= sin( phaseZ )*str;

                    gl_Position = projectionMatrix * mvPosition;
                    `
                )
            }

            return material
        }
    }
}