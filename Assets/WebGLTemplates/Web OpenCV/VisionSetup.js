var initialize = async () => {

    const unityCanvas = document.querySelector("#unity-canvas");
    const videoCanvas = document.querySelector("#video-canvas");

    window.Camera = new Camera(unityCanvas, videoCanvas);
    window.OpenCVLoader = new OpenCVLoader(window.Camera);

    try {
        await window.OpenCVLoader.initialize();
        console.log("트래커 초기화!");
    }catch (error) {
        console.error("트래커 초기화 실패: " + error);
        return Promise.reject(error);
    }

    await window.Camera.requestWebcam();
};
