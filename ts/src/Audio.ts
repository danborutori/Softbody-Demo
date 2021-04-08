namespace hahaApp {

    export class AudioIndex {
        static readonly baseballHit = 1
        static readonly bottlelHit = 2
        static readonly punch = 3
        static readonly ar = 4
        static readonly star = 5
    }

    export class AudioManager{
        private context = new AudioContext()
        private outputNode: GainNode
        private audioBuffers: {
            [key: string]: AudioBuffer
        } = {}

        private get rootNode(){
            return this.outputNode
        }

        constructor(){
            const gainNode = this.context.createGain()
            gainNode.gain.setValueAtTime(0.05,0)
            gainNode.connect(this.context.destination)
            this.outputNode = gainNode

            const samples = {
                throw: "./sound/419341__wizardoz__swoosh.ogg",
                baseballHit: "./sound/516974__plucinskicasey__normalpunch.wav",
                bottlelHit: "./sound/178660__hanbaal__bottle-tink2.wav",
                punch: "./sound/81042__rock-savage__blood-hitting-window.wav",
                ar: "./sound/ar.mp3",
                star: "./sound/522159__magnuswaker__gutsy-spillage-1.wav"
            }
            for( let name in samples ){
                const n = name
                this.createBuffer(samples[n]).then(buf=>{
                    this.audioBuffers[n] = buf
                })
            }
        }

        playSound(name: string){
            const bufSrc = this.context.createBufferSource()
            bufSrc.buffer = this.audioBuffers[name]
            bufSrc.connect(this.rootNode)
            bufSrc.start()
        }

        playSoundByIndex( index: number ){
            switch (index) {
                case AudioIndex.baseballHit:
                    this.playSound("baseballHit")
                    break
                case AudioIndex.bottlelHit:
                    this.playSound("bottlelHit")
                    break
                case AudioIndex.punch:
                    this.playSound("punch")
                    break
                case AudioIndex.ar:
                    this.playSound("ar")
                    break
                case AudioIndex.star:
                    this.playSound("star")
                    break
            }
        }

        async createBuffer( url: string ){
            const buffer = await (await fetch(url)).arrayBuffer()

            return this.context.decodeAudioData(buffer)
        }
    }

}