namespace hahaApp {

    export class HangingBall extends SoftBody {

        private hp = 10

        constructor(
            worldInfo: Ammo.btSoftBodyWorldInfo,
            geometry: THREE.BufferGeometry,
            material: THREE.Material
        ){
            super(worldInfo, geometry, material)
        }

        update(app: App, deltaTime: number){

            super.update(app, deltaTime)

            if( this.hp>0 ){
                this.hp = Math.min(10,this.hp+1*deltaTime)
            }

        }

        protected onDeform( app: App, deform: number, position: THREE.Vector3 ){
            if( this.hp>0 )
                super.onDeform(app,deform, position)

            if( deform>0.2 ){
                if( this.hp>0 ){
                    this.hp -= deform
                    if( this.hp<=0 ){
                        this.onDie( app, position )
                    }
                }
            }
        }

        private onDie( app: App, position: THREE.Vector3 ){

            this.softbody.m_cfg.kPR = 0

            app.audio.playSound("star")
            Stars.explodStar( app, position.clone() )
        }
    }
}