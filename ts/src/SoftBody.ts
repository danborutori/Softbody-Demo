namespace hahaApp {
    const epsilon = 0.0001
    const v = new THREE.Vector3
    const v3 = new THREE.Vector3

    function toKey( v: THREE.Vector3 ) {
        return `${Math.round(v.x/epsilon)},${Math.round(v.y/epsilon)},${Math.round(v.z/epsilon)}`
    }

    function processGeometry( bufGeo: THREE.BufferGeometry ){

        const clonedG = bufGeo.clone()
        for( let name in clonedG.attributes ){
            switch (name) {
                case "position":
                    break
                default:
                    clonedG.deleteAttribute(name)
            }
        }
        const geometry: THREE.BufferGeometry = (THREE.BufferGeometryUtils as any).mergeVertices(clonedG, epsilon)

        const position = geometry.attributes.position
        const index = geometry.index
        const vtxIdxLookup = new Map<string, number>()
        for( let i=0; i<position.count; i++ ){
            v.fromBufferAttribute(position, i)
            vtxIdxLookup.set(toKey(v), i)
        }
        const pos = bufGeo.attributes.position
        const mapping = new Array<number>(pos.count)
        for( let i=0; i<pos.count; i++ ){
            v.fromBufferAttribute( pos, i )
            mapping[i] = vtxIdxLookup.get( toKey(v) )
        }

        return {
            position: Array.from(position.array),
            index: Array.from(index.array),
            mapping: mapping
        }
    }

    export class SoftBody {

        readonly mesh: THREE.Mesh
        readonly softbody: Ammo.btSoftBody
        readonly geometry: THREE.BufferGeometry
        private mapping: number[]
        soundCooldown = 1

        constructor(
            worldInfo: Ammo.btSoftBodyWorldInfo,
            geometry: THREE.BufferGeometry,
            material: THREE.Material
        ){
            this.geometry = geometry
            const info = processGeometry(geometry)

            const helper = new Ammo.btSoftBodyHelpers()

            this.softbody = helper.CreateFromTriMesh(
                worldInfo,
                info.position,
                info.index,
                info.index.length/3,
                true
            )
            this.softbody.m_cfg.kPR = 5
            this.softbody.m_cfg.viterations = 10
            this.softbody.m_cfg.piterations = 10
            this.softbody.setTotalMass(0.1,true)
            this.softbody.getCollisionShape().setMargin(0.05)

            this.mapping = info.mapping

            Ammo.destroy(helper)

            this.mesh = new THREE.Mesh(geometry, material)            
        }

        protected onDeform( app: App, deform: number, position: THREE.Vector3 ){
            if( deform > 0.2 ){
                if( this.soundCooldown<=0 ){
                    app.audio.playSoundByIndex(this.softbody.getUserIndex())
                    this.soundCooldown = 0.5
                }
            }
        }

        update(app: App, deltaTime: number){
            this.soundCooldown -= deltaTime

            const position = this.geometry.attributes.position as THREE.BufferAttribute
            const normal = this.geometry.attributes.normal as THREE.BufferAttribute
            const n = position.count
            const v = new THREE.Vector3
            const v2 = new THREE.Vector3
            let deform = 0
            let totalDeform = 0
            v3.set(0,0,0)
            for( let i=0; i<n; i++ ){
                const n = this.softbody.m_nodes.at(this.mapping[i])
                const m_x = n.m_x
                const m_n = n.m_n

                v.fromBufferAttribute(position, i)
                v2.set(m_x.x(), m_x.y(), m_x.z())
                const d = v.distanceTo(v2)
                deform = Math.max(deform,d)
                totalDeform += d
                v3.addScaledVector(v2, d)

                v2.toArray(position.array, i*3)
                normal.setXYZ(i, m_n.x(), m_n.y(), m_n.z())
            }
            v3.divideScalar(totalDeform)
            position.needsUpdate = true
            normal.needsUpdate = true

            this.onDeform(app, deform, v3)
        }

    }

}