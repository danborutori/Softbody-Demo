namespace hahaApp {

    const v2 = new THREE.Vector2
    const v2_2 = new THREE.Vector2
    const v = new THREE.Vector3
    const v4 = new THREE.Vector4
    const flipYV2 = new THREE.Vector2(1,-1)
    const m = new THREE.Matrix4
    const m2 = new THREE.Matrix4

    const btV = new Ammo.btVector3
    const btT = new Ammo.btTransform

    class RotateObject extends Object {

        update(deltaTime: number){
            super.update(deltaTime)

            this.object3D.rotateY(Math.PI*deltaTime/10)
            this.object3D.updateMatrixWorld()
            this.updateRigidBodyTransform()
        }
    }

    export declare class Pass {
        enabled: boolean
        needsSwap: boolean
        renderToScreen: boolean
    }

    declare class EffectComposer {
        renderTarget1: THREE.WebGLRenderTarget
        renderTarget2: THREE.WebGLRenderTarget
        writeBuffer: THREE.WebGLRenderTarget
        readBuffer: THREE.WebGLRenderTarget
        passes: Pass[]

        render( deltaTime: number )
        addPass( pass: Pass)
        setSize( width: number, height: number)
    }

    export function setAnisotropic( object: THREE.Object3D ){
        object.traverse( (mesh: THREE.Mesh)=>{
            if( mesh.isMesh ){
                const material = mesh.material
                if( material instanceof THREE.MeshStandardMaterial){
                    for( let tex of [material.map, material.normalMap, material.roughnessMap, material.metalnessMap]){
                        if(tex && tex.anisotropy!=16){
                            tex.anisotropy = 16
                            tex.needsUpdate = true
                        }
                    }
                    if( material.side == THREE.DoubleSide ){
                        material.side = THREE.FrontSide
                        material.needsUpdate = true
                    }
                }
            }
        })
    }

    export class App {
        hud = new HUD()
        loadingBar = new LoadingBar()

        readonly renderer: THREE.WebGLRenderer
        readonly effectComposer: EffectComposer
        readonly scene: THREE.Scene
        readonly camera: THREE.PerspectiveCamera
        private light: THREE.Light

        world: Ammo.btSoftRigidDynamicsWorld
        readonly objects: Object[] = []
        readonly softBodies: SoftBody[] = []
        private passes = new Map<string, Pass>()

        private timeElapsed = 0

        mousePressed = false
        readonly pointerMove = new THREE.Vector2
        readonly pointerPosition = new THREE.Vector2

        private fpsCounter = 0
        private running = true

        private player = new Player()
        readonly audio = new AudioManager()

        constructor( readonly canvas: HTMLCanvasElement ){
            let rect = canvas.getBoundingClientRect()
            canvas.width = rect.width
            canvas.height = rect.height
            const ctx = canvas.getContext("webgl2", {})

            this.renderer = new THREE.WebGLRenderer({
                context: ctx
            })
            this.renderer.shadowMap.enabled = true
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap


            this.renderer.setSize(rect.width, rect.height)
            this.renderer.setClearColor("#0000ff")

            this.effectComposer = new (THREE as any).EffectComposer( this.renderer )
            this.effectComposer.renderTarget1.depthTexture = new THREE.DepthTexture( rect.width, rect.height )
            this.effectComposer.renderTarget2.depthTexture = new THREE.DepthTexture( rect.width, rect.height )

            this.scene = new THREE.Scene()
            this.camera = new THREE.PerspectiveCamera(50,rect.width/rect.height)

            this.scene.add( new OutlinePlane() )

            const renderPass = new (THREE as any).RenderPass( this.scene, this.camera )
            this.effectComposer.addPass(renderPass)

            const maxblur = 0.005
            const bokenPass = new DofPass(this.camera, {focus: 5, maxblur: maxblur, aperture: maxblur/2})
            this.effectComposer.addPass(bokenPass)

            const smaaPass = new (THREE as any).SMAAPass( rect.width, rect.height )
            this.effectComposer.addPass(smaaPass)

            const bloomPass = new (THREE as any).UnrealBloomPass(new THREE.Vector2( rect.width, rect.height ), 0.2)
            this.effectComposer.addPass(bloomPass)

            this.passes.set("smaa", smaaPass)
            this.passes.set("dof", bokenPass)
            this.passes.set("bloom", bloomPass)

            canvas.addEventListener("mousedown", ev=>{
                this.onMouseDown(ev)
            })
            canvas.addEventListener("mouseup", ev=>{
                this.onMouseUp(ev)
            })
            canvas.addEventListener("mousemove", ev=>{
                this.onMouseMove(ev)
            })
            canvas.addEventListener("touchstart", ev=>{
                this.onTouchStart(ev)
            })
            canvas.addEventListener("touchmove", ev=>{
                this.onTouchMove(ev)
            })
            canvas.addEventListener("touchend", ev=>{
                this.onTouchEnd(ev)
            })
            canvas.addEventListener("touchcancel", ev=>{
                
            })

            document.body.appendChild( this.hud.domElement )
            document.body.appendChild( this.loadingBar.htmlElement )
            document.body.appendChild( new InfoPanel().htmlElement )
            document.addEventListener("visibilitychange", ev=>{
                switch (document.visibilityState) {
                    case "visible":
                        this.running = true
                        break
                    case "hidden":
                        this.running = false
                        break
                }
            })

            //this.setupPassControl()
        }
    
        init(){
            this.setupAmmo(),
            this.setupScene()

            const loading = this.loadingBar.startLoading()
            Player.init().then(()=>loading.end())

            window.addEventListener("resize", ()=>{
                this.onResize()
            })

            this.hud.numObjects = this.objects.length

            return this
        }

        start(){

            let requestingAnimationFrame = false
            setInterval(()=>{
                if( this.running ){
                    this.updateLoop( 1/60 )
                    if( !requestingAnimationFrame ){
                        requestingAnimationFrame = true
                        requestAnimationFrame(()=>{
                            requestingAnimationFrame = false
                            this.render()
                            this.fpsCounter += 1
                        })
                    }
                }
            }, 1000/60)

            setInterval(()=>{
                this.hud.fps = this.fpsCounter
                this.fpsCounter = 0
            }, 1000)

            return this
        }

        private setupScene(){

            this.scene.add(this.camera)

            this.scene.add(this.player.object3D)

            const floorSize = 10

            const textureLoader = new THREE.TextureLoader()
            const loading = this.loadingBar.startLoading()
            Promise.all([
                new Promise<THREE.Texture>((resolve, reject)=>textureLoader.load("./textures/dirty_concrete_1k_jpg/dirty_concrete_diff_1k.jpg", tex=>resolve(tex), undefined, ev=>reject(ev))),
                new Promise<THREE.Texture>((resolve, reject)=>textureLoader.load("./textures/dirty_concrete_1k_jpg/dirty_concrete_nor_1k.jpg", tex=>resolve(tex), undefined, ev=>reject(ev))),
                new Promise<THREE.Texture>((resolve, reject)=>textureLoader.load("./textures/dirty_concrete_1k_jpg/dirty_concrete_rough_1k.jpg", tex=>resolve(tex), undefined, ev=>reject(ev)))
            ]).then(results=>{
                loading.end()

                const diff = results[0]
                const nor = results[1]
                const roughness = results[2]

                results.forEach(tex=>{
                    tex.anisotropy = 16
                    tex.needsUpdate = true
                })

                roomMat.map = diff
                roomMat.normalMap = nor
                roomMat.normalMapType = THREE.TangentSpaceNormalMap
                roomMat.roughnessMap = roughness
                roomMat.needsUpdate = true
            })

            const roomMat = new THREE.MeshStandardMaterial({
                metalness: 0,
                side: THREE.BackSide
            })
            const room = new THREE.Mesh( new THREE.BoxBufferGeometry(floorSize, floorSize,floorSize), roomMat)
            room.position.set(0,floorSize/2,0)
            room.castShadow = false
            room.receiveShadow = true
            this.scene.add(room)
            btV.setValue(floorSize/2,floorSize/2,floorSize/2)
            const floorBoxShape = new Ammo.btCompoundShape()

            btT.setIdentity()
            btV.setValue(0,-floorSize/2-0.5,0)
            btT.setOrigin(btV)
            btV.setValue(floorSize/2,0.5,floorSize/2)
            floorBoxShape.addChildShape(
                btT,
                new Ammo.btBoxShape(btV)
            )
            btT.setIdentity()
            btV.setValue(0,floorSize/2+0.5,0)
            btT.setOrigin(btV)
            btV.setValue(floorSize/2,0.5,floorSize/2)
            floorBoxShape.addChildShape(
                btT,
                new Ammo.btBoxShape(btV)
            )
            btT.setIdentity()
            btV.setValue(floorSize/2+0.5,0,0)
            btT.setOrigin(btV)
            btV.setValue(0.5,floorSize/2,floorSize/2)
            floorBoxShape.addChildShape(
                btT,
                new Ammo.btBoxShape(btV)
            )
            btT.setIdentity()
            btV.setValue(-floorSize/2-0.5,0,0)
            btT.setOrigin(btV)
            btV.setValue(0.5,floorSize/2,floorSize/2)
            floorBoxShape.addChildShape(
                btT,
                new Ammo.btBoxShape(btV)
            )
            btT.setIdentity()
            btV.setValue(0,0,-floorSize/2-0.5)
            btT.setOrigin(btV)
            btV.setValue(floorSize/2,floorSize/2,0.5)
            floorBoxShape.addChildShape(
                btT,
                new Ammo.btBoxShape(btV)
            )
            btT.setIdentity()
            btV.setValue(0,0,floorSize/2+0.5)
            btT.setOrigin(btV)
            btV.setValue(floorSize/2,floorSize/2,0.5)
            floorBoxShape.addChildShape(
                btT,
                new Ammo.btBoxShape(btV)
            )

            const floorBoxObj = new Object(0, floorBoxShape, room)
            this.world.addRigidBody( floorBoxObj.rigidBody, 1, 0xffffffff )
            this.objects.push(floorBoxObj)

            this.camera.position.set(0,2,0)
            this.camera.up.set(0,1,0)
            this.player.object3D.add(this.camera)

            const light = new THREE.SpotLight(new THREE.Color(0.9,0.9,0.9))
            light.angle = Math.PI/8
            light.penumbra = 0.2
            light.shadow.mapSize.set(1024,1024)
            light.shadow.camera.fov = light.angle
            light.target = new THREE.Object3D()
            light.castShadow = true
            this.scene.add(light)
            this.light = light

            const ambLit = new THREE.AmbientLight(new THREE.Color(0.2,0.2,0.2))
            this.scene.add(ambLit)

            this.scene.fog = new THREE.Fog(0,5,12)

            this.setupTargets()

            // new (THREE as any).GLTFLoader().load( "./models/duck/Duck.gltf", gltf=>{
            //     const mesh = (gltf.scene as THREE.Scene).getObjectByName("LOD3spShape") as THREE.Mesh

            //     const g = mesh.geometry as THREE.BufferGeometry
            //     const mat = mesh.material as THREE.Material
            //     g.scale(0.005,0.005,0.005)
                
            //     this.setupSoftBody( g, mat, new THREE.Vector3(0,2,0))
            // } )

            // new (THREE as any).STLLoader().load("./models/Low_Poly_Stanford_Bunny/files/Bunny-LowPoly.stl", (geometry: THREE.BufferGeometry) =>{

            //     geometry.computeBoundingSphere()
            //     const scale = 1/geometry.boundingSphere.radius
            //     geometry.scale(scale,scale,scale)
            //     geometry.computeBoundingSphere()

            //     this.setupSoftBody( geometry, new THREE.MeshStandardMaterial(), new THREE.Vector3(0,3,0))

            // })
            const loading2 = this.loadingBar.startLoading()
            new (THREE as any).GLTFLoader().load("./models/corgishiba_texturing_challenge/scene.gltf", gltf =>{
                loading2.end()

                const scene = gltf.scene as THREE.Scene
                setAnisotropic(scene)

                let cnt = 0
                scene.traverse( (mesh: THREE.Mesh)=>{
                    if( mesh.isMesh ){
                        if( cnt==1 ){
                            const g = mesh.geometry as THREE.BufferGeometry
                            g.computeBoundingSphere()
                            v.copy(g.boundingSphere.center).negate()
                            const s = 1/g.boundingSphere.radius
                            g.translate(v.x, v.y, v.z).scale(s,s,s).rotateY(Math.PI)

                            const mat = mesh.material as THREE.Material
                            mat.side = THREE.FrontSide
                            mat.depthWrite = true
                            mat.needsUpdate = true

                            const sb = this.setupSoftBody(g, mat, new THREE.Vector3(0,1,-2))
                            sb.softbody.setUserIndex(AudioIndex.ar)
                        }
                        cnt++
                    }

                })
            })

            this.addHangingBall()
            // this.addWater()
            this.addGrass()
        }

        private setupAmmo(){
            const config = new Ammo.btSoftBodyRigidBodyCollisionConfiguration()
            const dispatcher = new Ammo.btCollisionDispatcher(config)            
            const pairCache = new Ammo.btDbvtBroadphase()
            const solver = new Ammo.btSequentialImpulseConstraintSolver()
            const softBodySolver = new Ammo.btDefaultSoftBodySolver()
            const world = new Ammo.btSoftRigidDynamicsWorld(dispatcher, pairCache as any, solver, config, softBodySolver)
            this.world = world
        }

        private setupTargets(){
            const spacingRatio = 1.2
            const headRadius = 0.4

            const positions = [
                new THREE.Vector3(0,0,0),

                new THREE.Vector3(-0.5,0,1),
                new THREE.Vector3(0.5,0,1),

                new THREE.Vector3(-1,0,2),
                new THREE.Vector3(0,0,2),
                new THREE.Vector3(1,0,2),

                new THREE.Vector3(-1.5,0,3),
                new THREE.Vector3(-0.5,0,3),
                new THREE.Vector3(0.5,0,3),
                new THREE.Vector3(1.5,0,3),

                new THREE.Vector3(-2,0,4),
                new THREE.Vector3(-1,0,4),
                new THREE.Vector3(0,0,4),
                new THREE.Vector3(1,0,4),
                new THREE.Vector3(2,0,4),
            ]

            const loading = this.loadingBar.startLoading()
            new (THREE as any).GLTFLoader().load("./models/bottle_old_wine/scene.gltf", gltf =>{
                loading.end()

                const scene = gltf.scene as THREE.Scene
                setAnisotropic(scene)
                const mesh = scene.getObjectByName("bottle_05L_1_03_-_Default_0") as THREE.Mesh

                let coneGeo = mesh.geometry as THREE.BufferGeometry
                coneGeo.rotateX(-Math.PI/2)
                coneGeo.computeBoundingBox()
                coneGeo.boundingBox.getCenter(v)
                coneGeo.translate(-v.x, -v.y, -v.z)
                coneGeo.boundingBox.getSize(v)
                const s = headRadius/v.x
                coneGeo.scale(s,s,s)
                coneGeo.computeBoundingBox()

                const coneMat = mesh.material

                const coneColShape = btConvexHullShapeFromGeometry(coneGeo)
                const localInertia = new Ammo.btVector3
                coneColShape.calculateLocalInertia(1, localInertia)
                
                const coneHeight = coneGeo.boundingBox.getSize(v).y
                positions.forEach( p=>{
                    p.add( new THREE.Vector3(0,0.5,-2.5) ).multiply( new THREE.Vector3( headRadius*2*spacingRatio, coneHeight, headRadius*2 ))
                })
    
    
                for( let pos of positions ){
        
                    const cone = new THREE.Mesh( coneGeo, coneMat )
                    cone.castShadow = true
                    cone.receiveShadow = true
                    cone.position.copy(pos)
                    this.scene.add(cone)
                    const coneObj = new Object( 1, coneColShape, cone, localInertia )
                    coneObj.rigidBody.setUserIndex(AudioIndex.bottlelHit)
                    this.world.addRigidBody(coneObj.rigidBody, 1, -1)
        
                    this.objects.push(coneObj)    
                }
    
                Ammo.destroy( localInertia )
            })
            
        }

        private setupSoftBody(
            geometry: THREE.BufferGeometry,
            material: THREE.Material, 
            position: THREE.Vector3, 
            clz: {
                new(
                    worldInfo: Ammo.btSoftBodyWorldInfo,
                    geometry: THREE.BufferGeometry,
                    material: THREE.Material ): SoftBody
                } = SoftBody
            ){
            const softBody = new clz(this.world.getWorldInfo(), geometry.clone().translate(position.x, position.y, position.z), material)
            softBody.mesh.receiveShadow = true
            softBody.mesh.castShadow = true
            this.scene.add(softBody.mesh)

            this.world.addSoftBody(softBody.softbody, 1, -1)
            this.softBodies.push(softBody)

            return softBody
        }

        private addHangingBall(){

            const loading = this.loadingBar.startLoading()
            new (THREE as any).GLTFLoader().load("./models/wood_stick_04/scene.gltf", gltf =>{
                loading.end()

                const scene = gltf.scene as THREE.Scene
                setAnisotropic(scene)
                const mesh = scene.getObjectByName("wood_stick_04_wood_stick_04_0") as THREE.Mesh

                const barGeo = mesh.geometry
                barGeo.rotateY(Math.PI/2)
                barGeo.computeBoundingBox()
                barGeo.boundingBox.getCenter(v)
                barGeo.translate(-v.x, -v.y, -v.z)
                barGeo.boundingBox.getSize(v)
                const s = 0.4/v.y
                barGeo.scale(s,s,s)
                barGeo.computeBoundingBox()

                const barMesh = new THREE.Mesh( barGeo, mesh.material )
                barMesh.receiveShadow = true
                barMesh.castShadow = true
                barMesh.position.set(0,2,0)
                this.scene.add( barMesh )

                barGeo.boundingBox.getSize(v)
                btV.setValue(v.x/2,v.y/2,v.z/2)
                const barShape = new Ammo.btCylinderShapeX(btV)
                const barObj = new RotateObject(0,barShape,barMesh)
                this.world.addRigidBody(barObj.rigidBody, 1, -1)

                this.objects.push(barObj)

                const ballMat = new THREE.MeshStandardMaterial({
                    metalness: 0
                })

                const loading2 = this.loadingBar.startLoading()
                const loading3 = this.loadingBar.startLoading()
                const loading4 = this.loadingBar.startLoading()
                const loader = new THREE.TextureLoader()
                loader.load("./textures/fabric_leather_01_1k_jpg/fabric_leather_01_diff_1k.jpg", tex=>{
                    loading2.end()
                    ballMat.map = tex
                    ballMat.needsUpdate = true
                })
                loader.load("./textures/fabric_leather_01_1k_jpg/fabric_leather_01_nor_1k.jpg", tex=>{
                    loading3.end()
                    ballMat.normalMap = tex
                    ballMat.normalMapType = THREE.TangentSpaceNormalMap
                    ballMat.needsUpdate = true
                })
                loader.load("./textures/fabric_leather_01_1k_jpg/fabric_leather_01_rough_1k.jpg", tex=>{
                    loading4.end()
                    ballMat.roughnessMap = tex
                    ballMat.needsUpdate = true
                })

                for( let i=0; i<3; i++ ){
                    const ballGeometry = new THREE.SphereBufferGeometry(0.5,16,16)
                    const sb = this.setupSoftBody(ballGeometry, ballMat, new THREE.Vector3(i-1,1.5), HangingBall)
                    sb.softbody.getCollisionShape().setMargin(0.1)
                    sb.softbody.setUserIndex(AudioIndex.punch)

                    for( let i = 0; i< sb.softbody.m_nodes.size(); i++ ){
                        const n = sb.softbody.m_nodes.at(i)
                        if( Math.abs(n.m_x.y()-2)<0.0001 ){
                            sb.softbody.appendAnchor( i, barObj.rigidBody, true, 1)
                        }
                    }
                }
                setAnisotropic(this.scene)
            })
         }

        private addWater(){
            const water = new WaterPlane()
            water.position.set(0,0.1,0)
            this.scene.add(water)
        }

        private addGrass(){
            THREE.MathUtils.seededRandom(0.93738)
            const initialTransform = new THREE.Matrix4().makeRotationX(-Math.PI/2).premultiply(m.makeScale(0.005,0.005,0.005))
            const instancePosition = new Array<THREE.Matrix4>(100)
            for( let i = 0; i<instancePosition.length; i++ ){
                const s = THREE.MathUtils.seededRandom()*1+0.2
                instancePosition[i] = new THREE.Matrix4().copy(initialTransform)
                    .premultiply(
                        m.makeScale(1,s,1)
                    ).premultiply(
                        m.makeRotationY(THREE.MathUtils.seededRandom()*Math.PI*2)
                    ).premultiply(m.makeTranslation(
                        (THREE.MathUtils.seededRandom()*2-1)*5,
                        0,
                        (THREE.MathUtils.seededRandom()*2-1)*5
                    ))
            }
    
            const loading = this.loadingBar.startLoading()
            new (THREE as any).GLTFLoader().load("./models/clover_grass/scene.gltf", gltf=>{
                loading.end()
                const scene = gltf.scene as THREE.Scene

                scene.traverse( (mesh: THREE.Mesh)=>{
                    if( mesh.isMesh ){                        
                        const mat = GrassWinding.modify( mesh.material as THREE.Material)
                        const instancedMesh = new THREE.InstancedMesh(mesh.geometry, mat, instancePosition.length)
                        instancedMesh.customDepthMaterial = instancedMesh.customDistanceMaterial = GrassWinding.modify( new THREE.MeshDepthMaterial({
                            map: (mesh.material as THREE.MeshStandardMaterial).map,
                            alphaTest: (mesh.material as THREE.MeshStandardMaterial).alphaTest,
                            depthPacking: THREE.RGBADepthPacking
                        }))
                        instancedMesh.castShadow = true
                        instancedMesh.receiveShadow = true
                        for( let i=0; i<instancePosition.length; i++ ){
                            instancedMesh.setMatrixAt(i, instancePosition[i])
                        }
                        this.scene.add(instancedMesh)
                    }
                })
            })
        }

        private setupPassControl(){
            const panel = document.createElement("div")
            panel.style.position = "absolute"
            panel.style.right = "0"
            panel.style.top = "0"
            panel.style.backgroundColor = "white"
            panel.innerHTML = `<div>Pass:</div>`

            for( let e of this.passes ){
                const name = e[0]
                const pass = e[1]
                const row = document.createElement("div")
                const checkbox = document.createElement("input")
                checkbox.type = "checkbox"
                checkbox.checked = pass.enabled
                checkbox.onchange = ev=>{
                    pass.enabled = (ev.target as HTMLInputElement).checked
                }
                row.innerHTML = `${name}`
                row.appendChild(checkbox)
                panel.appendChild(row)
            }


            document.body.appendChild(panel)
        }

        private updateLoop( deltaTime: number ){
            this.timeElapsed += deltaTime

            const period = 10
            const angle = Math.PI*2*this.timeElapsed/period
            const dist = 10

            this.light.position.set( -Math.cos(angle)*dist, 20, Math.sin(angle)*dist )

            this.player.update(this, deltaTime)

            this.world.stepSimulation(deltaTime)
            this.traceContact()

            for( let obj of this.objects ){
                obj.update(deltaTime)
            }
            for( let sb of this.softBodies ){
                sb.update(this, deltaTime)
            }

            this.pointerMove.set(0,0)
        }

        private contacts = new WeakMap< Ammo.btCollisionObject, WeakMap< Ammo.btCollisionObject, number >>()

        private traceContact(){

            const dispatcher = this.world.getDispatcher()
            const numManifolds = dispatcher.getNumManifolds()

            for( let i=0; i<numManifolds; i++ ){
                const manifold = dispatcher.getManifoldByIndexInternal(i)
                const numContact = manifold.getNumContacts()

                const obj0 = manifold.getBody0()
                const obj1 = manifold.getBody1()

                let impulse = 0
                for( let j=0; j<numContact; j++ ){
                    const contact = manifold.getContactPoint(j)
                    impulse += contact.getAppliedImpulse()
                }
                if( numContact!=0 )
                    impulse /= numContact

                for( let pair of [{a: obj0, b: obj1}, {a: obj1, b: obj0}]){
                    const map0 = this.contacts.get(pair.a) || new WeakMap()
                    if( map0.get(pair.b)!=numContact ){
                        map0.set(pair.b, numContact)
                        this.contacts.set(pair.a, map0)
    
                        if( impulse>1 ){
                            this.audio.playSoundByIndex( pair.a.getUserIndex() )
                        }
                    }
                }
            }

        }

        private render(){
            this.effectComposer.render(1.0/60)
        }

        private onMouseDown( ev: MouseEvent ){
            this.mousePressed = true

            const rect = (ev.target as HTMLCanvasElement).getBoundingClientRect()
            v2_2.set(rect.width, rect.height)

            this.pointerPosition.set(ev.offsetX, ev.offsetY).divide(v2_2).multiplyScalar(2).addScalar(-1).multiply(flipYV2)
        }

        private onMouseUp( ev: MouseEvent ){
            this.mousePressed = false
            this.pointerMove.set(0,0)
        }

        private onMouseMove( ev: MouseEvent ){
            const rect = (ev.target as HTMLCanvasElement).getBoundingClientRect()
            v2_2.set(rect.width, rect.height)

            this.pointerPosition.set(ev.offsetX, ev.offsetY).divide(v2_2).multiplyScalar(2).addScalar(-1).multiply(flipYV2)

            if( this.mousePressed ) {
                v2.set(ev.movementX, ev.movementY).divideScalar(v2_2.y).multiply(flipYV2)
                this.pointerMove.add(v2)
            }
        }

        private onTouchStart( ev: TouchEvent ){
            this.mousePressed = true

            const rect = (ev.target as HTMLCanvasElement).getBoundingClientRect()
            v2_2.set(rect.width, rect.height)

            for( let touch of ev.touches )
                this.pointerPosition.set(touch.clientX, touch.clientY).divide(v2_2).multiplyScalar(2).addScalar(-1).multiply(flipYV2)
        }

        private onTouchMove( ev: TouchEvent ){
            const rect = (ev.target as HTMLCanvasElement).getBoundingClientRect()
            v2_2.set(rect.width, rect.height)

            for( let touch of ev.touches ){

                this.pointerPosition.set(touch.clientY, touch.clientY).divide(v2_2).multiplyScalar(2).addScalar(-1).multiply(flipYV2)

                // if( this.mousePressed ) {
                //     v2.set(ev.movementX, ev.movementY).divideScalar(v2_2.y).multiply(flipYV2)
                //     this.pointerMove.add(v2)
                // }
            }
        }

        private onTouchEnd( ev: TouchEvent ){
            this.mousePressed = false
            this.pointerMove.set(0,0)
        }
    
        private onResize(){
            const rect = this.canvas.getBoundingClientRect()
            
            this.canvas.width = rect.width
            this.canvas.height = rect.height
            this.renderer.setSize(rect.width, rect.height)
            this.renderer.setViewport(0,0,rect.width,rect.height)
            this.camera.aspect = rect.width/rect.height
            this.camera.updateProjectionMatrix()

            this.effectComposer.setSize(rect.width, rect.height)
        }
    }
}

