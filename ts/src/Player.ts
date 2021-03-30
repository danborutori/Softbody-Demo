namespace hahaApp {

    const ballInterval = 0.02
    const ballRadius = 0.2
    const ballMass = 1
    const ballSpeed = 30
    let ballData: {
        material: THREE.Material
        geometry: THREE.BufferGeometry
    } | undefined
    const ballShape = new Ammo.btSphereShape(ballRadius)
    const ballLocalInteria = new Ammo.btVector3
    ballShape.calculateLocalInertia(ballMass, ballLocalInteria)

    const m = new THREE.Matrix4
    const m2 = new THREE.Matrix4
    const v = new THREE.Vector3
    const v4 = new THREE.Vector4
    const btV = new Ammo.btVector3

    export class Player {
        static async init(){
            return new Promise<void>( (resolve, reject)=>{
                new (THREE as any).GLTFLoader().load("./models/worn_baseball_ball/scene.gltf", gltf =>{
                    const scene = gltf.scene as THREE.Scene
                    setAnisotropic(scene)
                    const mesh = scene.getObjectByName("polySurface5_lambert1_0") as THREE.Mesh        
                    const ballMat = mesh.material as THREE.Material
                    const ballGeo = mesh.geometry as THREE.BufferGeometry
                    ballGeo.computeBoundingSphere()
                    v.copy(ballGeo.boundingSphere.center).negate()
                    const s = ballRadius/ballGeo.boundingSphere.radius
                    ballGeo.translate(v.x, v.y, v.z).scale(s,s,s)
                    ballData = {
                        material: ballMat,
                        geometry: ballGeo
                    }
                    resolve()
                }, undefined, reject)
            })
        }

        readonly object3D = new THREE.Object3D()
        private fireBallCooldown = 0
        private circling = {
            angle: 0,
            distance: 5
        }

        constructor(){
            
        }

        update( app: App, deltaTime: number ){
            this.movement(app, deltaTime)
            this.firingBalls(app, deltaTime)
        }

        private movement( app: App, deltaTime: number ) {
            // this.circling.angle += app.pointerMove.x
            // this.circling.distance = Math.max( 5, this.circling.distance+app.pointerMove.y )

            this.object3D.position.set(
                Math.sin(this.circling.angle)*this.circling.distance,
                0,
                -Math.cos(this.circling.angle)*this.circling.distance
            )

            app.camera.lookAt(0,0,0)
        }            

        private firingBalls(app: App, deltaTime: number){
            this.fireBallCooldown -= deltaTime

            if( app.mousePressed ){
                if( this.fireBallCooldown<0 ){
                    this.fireBall(app)
                    this.fireBallCooldown = ballInterval
                }
            }
        }

        private fireBall( app: App ){
            if( ballData == undefined) return

            m.multiplyMatrices(app.camera.projectionMatrix, app.camera.matrixWorldInverse)
            m2.copy(m).invert()
            v4.set( app.pointerPosition.x, app.pointerPosition.y, 0, 1 )
            v4.applyMatrix4(m2)
            v4.divideScalar(v4.w)

            const ball = new THREE.Mesh( ballData.geometry, ballData.material)
            ball.castShadow = true
            ball.receiveShadow = true
            ball.position.set(v4.x, v4.y, v4.z)
            ball.quaternion.set( Math.random(), Math.random(), Math.random(), Math.random() ).normalize()
            app.scene.add( ball )

            const ballObj = new Object(ballMass, ballShape, ball, ballLocalInteria)
            v.setFromMatrixPosition(app.camera.matrixWorld).sub(ball.position).multiplyScalar(-1)
            v.x += Math.random()*0.01
            v.y += Math.random()*0.01
            v.z += Math.random()*0.01
            v.normalize().multiplyScalar(ballSpeed)
            btV.setValue(v.x, v.y, v.z)
            ballObj.rigidBody.setLinearVelocity(btV)
            ballObj.rigidBody.setUserIndex(AudioIndex.baseballHit)

            app.world.addRigidBody(ballObj.rigidBody, 1, -1)

            app.objects.push(ballObj)
            app.hud.numObjects = app.objects.length

            app.audio.playSound( "throw" )
        }

    }

}