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

        protected onDeform( app: App, deform: number ){
            if( this.hp>0 )
                super.onDeform(app,deform)

            if( deform>0.2 ){
                this.hp -= deform
                if( this.hp<=0 ){
                    this.onDie()
                }
            }
        }

        private onDie(){

            this.softbody.m_cfg.kPR = 0

        }
    }
}