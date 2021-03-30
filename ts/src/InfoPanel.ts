namespace hahaApp {

    export class InfoPanel {

        readonly htmlElement: HTMLDivElement
        private content: HTMLDivElement

        constructor(){

            const htmlElement = document.createElement("div")
            htmlElement.style.position = "absolute"
            htmlElement.style.top = "4px"
            htmlElement.style.right = "4px"
            htmlElement.style.borderRadius = "4px"
            htmlElement.style.padding = "8px"
            htmlElement.style.backgroundColor = "white"
            htmlElement.style.fontFamily = "Arial, Helvetica, sans-serif"
            htmlElement.style.userSelect = "none"
            htmlElement.style.textAlign = "right"
            htmlElement.innerHTML = `
            ⓘ<br/>
            <div name="content">
            <table>
            <tr>
            <td><b>Version:</b></td>
            <td>${config.version}</td>
            </tr>
            <tr>
            <td><b>Author:</b></td>
            <td>${config.author}}</td>
            </tr>
            <tr>
            <td><b>Source Code:</b></td>
            <td><a name="link">${config.projectUrl}</a></td>
            </tr>
            </table>
            </div>
            `

            this.htmlElement = htmlElement
            this.content = htmlElement.querySelector("div[name=content]") as HTMLDivElement

            htmlElement.addEventListener("mousedown", ev=>{
                this.onPress()
            })
            htmlElement.addEventListener("touchstart", ev=>{
                this.onPress()
            })

            htmlElement.querySelector("a[name=link]").addEventListener("mousedown", ev=>{
                open("https://github.com/danborutori/Softbody-Demo", "new")
                ev.stopPropagation()
            })

            this.onPress()
        }

        private onPress(){
            if( this.content.parentElement === this.htmlElement ){
                this.htmlElement.removeChild(this.content)
            }else{
                this.htmlElement.appendChild(this.content)
            }
        }
    }

}