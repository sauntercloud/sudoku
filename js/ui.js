
class UI{
    onCapture(cb,captureImageId="captureImage"){
        const captureImage = document.getElementById(captureImageId);
        captureButton.addEventListener("change", (e) => {
            cb(e.target.files[0])
        })
    }
}
window.ui = new UI()