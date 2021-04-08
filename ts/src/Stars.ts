namespace hahaApp {
    const numParticle = 6
    const m = new THREE.Matrix4
    const m2 = new THREE.Matrix4
    const q = new THREE.Quaternion
    
    const btV = new Ammo.btVector3
    const btT = new Ammo.btTransform
    
    const startLoadingPromise = new Promise<{
        geometry: THREE.BufferGeometry
        material: THREE.Material,
        collisionShape: Ammo.btCollisionShape,
        localInteria: Ammo.btVector3
    }>((resolve, reject)=>
        new (THREE as any).GLTFLoader().load("./models/gold_star/scene.gltf", gltf =>{
            const scene: THREE.Scene = gltf.scene
            const mesh = scene.getObjectByName("Star_Gold_0") as THREE.Mesh

            const g = mesh.geometry
            g.computeBoundingBox()
            const center = g.boundingBox.getCenter(new THREE.Vector3())
            const size = g.boundingBox.getSize(new THREE.Vector3)
            const s = new THREE.Vector3(.8,.8,.4).divide(size)
            g.translate(-center.x, -center.y, -center.z).scale(s.x,s.y,s.z)
            g.computeBoundingBox()


            const colShape = btConvexHullShapeFromGeometry(g)
            const localInteria = new Ammo.btVector3
            colShape.calculateLocalInertia(1,localInteria)

            resolve( {
                geometry: mesh.geometry,
                material: mesh.material as THREE.Material,
                collisionShape: colShape,
                localInteria: localInteria
            } )
        }, undefined, reject)
    )


    class StarObject extends Object {
        constructor(
            readonly instancedMesh: THREE.InstancedMesh,
            readonly index: number,
            mass: number,
            collisionShape: Ammo.btCollisionShape,
            object3D: THREE.Object3D,
            localInertia?: Ammo.btVector3,
        ){
            super(mass, collisionShape,object3D,localInertia)
        }

        sync(){
            this.motionState.getWorldTransform(btT)
            const origin = btT.getOrigin()
            const rotation = btT.getRotation()

            m.makeRotationFromQuaternion( q.set(rotation.x(), rotation.y(), rotation.z(), rotation.w()))
            .premultiply(m2.makeTranslation(origin.x(), origin.y(), origin.z()))

            this.instancedMesh.setMatrixAt(this.index, m)
            this.instancedMesh.instanceMatrix.needsUpdate = true
        }
    }

    export class Stars {

        public static async explodStar( app: App, position: THREE.Vector3 ){

            const data = await startLoadingPromise

            const mesh = new THREE.InstancedMesh( data.geometry, data.material, numParticle )

            for( let i=0; i<numParticle; i++ ){
                const o3d = new THREE.Object3D()
                o3d.position.copy(position)
                o3d.quaternion.set(
                    Math.random()*2-1,
                    Math.random()*2-1,
                    Math.random()*2-1,
                    Math.random()*2-1
                ).normalize()

                const obj = new StarObject(mesh, i, 1, data.collisionShape, o3d, data.localInteria )

                const starSpeed = 5
                btV.setX( (Math.random()*2-1)*starSpeed )
                btV.setY( (Math.random()*2-1)*starSpeed )
                btV.setZ( (Math.random()*2-1)*starSpeed )
                obj.rigidBody.setLinearVelocity( btV )
                const starAngularSpeed = 5
                btV.setX( (Math.random()*2-1)*starAngularSpeed )
                btV.setY( (Math.random()*2-1)*starAngularSpeed )
                btV.setZ( (Math.random()*2-1)*starAngularSpeed )
                obj.rigidBody.setAngularVelocity(btV)

                app.world.addRigidBody(obj.rigidBody)
                app.objects.push( obj )

                m.makeTranslation( position.x, position.y, position.z )
                mesh.setMatrixAt(i, m)
            }

            app.scene.add(mesh)
        }
    }
}