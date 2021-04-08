namespace hahaApp {

    const t = new Ammo.btTransform()
    const v = new Ammo.btVector3()
    const q = new Ammo.btQuaternion(1,0,0,0)
    const m = new THREE.Matrix4
    const m2 = new THREE.Matrix4
    const threeV = new THREE.Vector3
    const threeQ = new THREE.Quaternion
    const threeQ2 = new THREE.Quaternion

    export class Object {

        protected motionState: Ammo.btDefaultMotionState
        readonly rigidBody: Ammo.btRigidBody        

        constructor(
            readonly mass: number,
            private collisionShape: Ammo.btCollisionShape,
            readonly object3D: THREE.Object3D,
            localInertia?: Ammo.btVector3
        ){
            this.object3D.updateMatrixWorld()
            threeV.setFromMatrixPosition( this.object3D.matrixWorld )
            threeQ.setFromRotationMatrix( m.extractRotation(this.object3D.matrixWorld) )
            v.setValue(threeV.x, threeV.y, threeV.z)
            q.setValue(threeQ.x,threeQ.y,threeQ.z,threeQ.w)
            t.setOrigin(v)
            t.setRotation(q)

            const motionState = new Ammo.btDefaultMotionState(t)

            if( !localInertia && mass!=0 ){
                collisionShape.calculateLocalInertia(mass, v)
                localInertia = v
            }

            const rbInfo = new Ammo.btRigidBodyConstructionInfo(
                mass,
                motionState,
                collisionShape,
                mass!=0?localInertia:undefined)

            this.motionState = motionState
            this.rigidBody = new Ammo.btRigidBody(rbInfo)
            if( mass==0 ){
                this.rigidBody.setCollisionFlags( 1 )
            }

        }

        update( deltaTime: number ){
            this.sync()
        }

        sync(){
            if( this.mass!=0 ){
                this.motionState.getWorldTransform(t)

                const q = t.getRotation()
                const p = t.getOrigin()

                threeV.set(p.x(), p.y(), p.z())
                threeQ.set( q.x(), q.y(), q.z(), q.w() )

                if ( this.object3D.parent ) {
                    m.copy( this.object3D.parent.matrixWorld ).invert()
                    
                    threeQ2.setFromRotationMatrix(m2.extractRotation(m))
                    threeQ.premultiply(threeQ2)

                    threeV.applyMatrix4(m)
                }

                this.object3D.quaternion.copy(threeQ)
                this.object3D.position.copy(threeV)
            }
        }

        updateRigidBodyTransform(){
            threeV.setFromMatrixPosition(this.object3D.matrixWorld)
            threeQ.setFromRotationMatrix(m.extractRotation(this.object3D.matrixWorld))

            v.setValue(threeV.x,threeV.y,threeV.z)
            q.setValue(threeQ.x,threeQ.y,threeQ.z,threeQ.w)
            t.setOrigin(v)
            t.setRotation(q)

            this.rigidBody.setWorldTransform(t)
            this.motionState.setWorldTransform(t)
        }
   }

}