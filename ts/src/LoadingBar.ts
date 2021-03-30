namespace hahaApp {
    export class LoadingBar {
        readonly htmlElement: HTMLDivElement
        private loadingCount = 0

        constructor(){
            const htmlElement = document.createElement("div")
            htmlElement.style.backgroundColor = "white"
            htmlElement.style.position = "absolute"
            htmlElement.style.top = "50%"
            htmlElement.style.left = "50%"
            htmlElement.style.transform = "translate(-50%, -50%)"
            htmlElement.style.padding = "8px"
            htmlElement.style.fontFamily = "Arial, Helvetica, sans-serif"
            htmlElement.style.borderRadius = "4px"
            htmlElement.style.visibility = "hidden"
            htmlElement.style.userSelect = "none"
            htmlElement.innerHTML = "Loading..."
            this.htmlElement = htmlElement
        }

        startLoading(){
            this.loadingCount++
            this.htmlElement.style.visibility = "visible"

            return {
                end: ()=>{
                    if( --this.loadingCount == 0 ){
                        this.htmlElement.style.visibility = "hidden"
                    }
                }
            }
        }

    }
}