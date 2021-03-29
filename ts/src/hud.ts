namespace hahaApp {

    export class HUD {

        private _fps = 0
        set fps( n: number ){
            this._fps = n
            this.update()
        }

        private _numObjects = 0
        set numObjects( n: number ){
            this._numObjects = n
            this.update()
        }

        readonly domElement = document.createElement("div")

        constructor(){
            this.domElement.style.position = "absolute"
            this.domElement.style.left = "10"
            this.domElement.style.top = "10"
            this.domElement.style.userSelect = "none"
        }

        private update(){
            this.domElement.innerHTML = `<font color="white">FPS: ${this._fps}</font>`
        }

    }

}