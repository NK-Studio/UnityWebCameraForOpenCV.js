var LibraryOpenCVUnity = {
    glClear: function(mask)
    {
        if (mask == 0x00004000)
        {
                var v = GLctx.getParameter(GLctx.COLOR_WRITEMASK);
                if (!v[0] && !v[1] && !v[2] && v[3])
                        // We are trying to clear alpha only -- skip.
                        return;
        }
        GLctx.clear(mask);
    },
    IsWebcamPermissionGranted: function()
    {
        return window.Camera.isWebcamPermissionGranted;
    },
    WebIsLoadOpenCV: function()
    {
        return window.cv != null;
    },
    SetWebGLARCameraSettings: function(settings)
    {
        window.Camera.setARCameraSettings(UTF8ToString(settings));
    },
    WebGLSetDeviceId: function(deviceId){
        window.Camera.selectedDeviceId = UTF8ToString(deviceId);
    },
    WebGLRequestWebcamList: function(gameObjectName, callbackFunctionName){
        window.Camera.requestWebcamList(UTF8ToString(gameObjectName), UTF8ToString(callbackFunctionName));
    },
    WebGLRequestCameraPermission: function(gameObjectName, successCallback, failMethodName){
        window.Camera.requestWebcamPermissions(UTF8ToString(gameObjectName), UTF8ToString(successCallback), UTF8ToString(failMethodName));
    },
    WebGLStartCamera: function()
    {
        window.Camera.triggerWebcam();
    },
    WebGLStopCamera: function()
    {
        window.Camera.stopWebcam();
    },   
    WebGLIsCameraStarted: function()
    {
        if(!window.Camera){
            console.error('%c카메라를 찾을 수 없습니다! 프로젝트 세트에서 올바른 webgltemplate를 사용해야합니다.','font-size: 32px; font-weight: bold');
            throw new Error("카메라를 찾을 수 없습니다! 프로젝트 세트에서 올바른 webgltemplate를 사용해야합니다.");
            return;
        }
        return window.Camera.isCameraStarted;
    },
    WebGLPauseCamera: function()
    {
        window.Camera.pauseCamera();
    },    
    WebGLUnpauseCamera: function()
    {
        window.Camera.unpauseCamera();
    },
    WebGLGetVideoDimensions: function()
    {
        // window.Camera.getVideoDimensions()가 문자열을 반환한다고 가정합니다.
        var data = window.Camera.getVideoDimensions(); 
        if (typeof data !== 'string') {
            console.error("WebGLGetVideoDimensions: window.Camera.getVideoDimensions() did not return a string.");
            // 오류 상황 처리: 예를 들어 null 포인터(0)를 반환하거나 빈 문자열 처리
            data = ""; 
        }
    
        // UTF8 인코딩 시 필요한 버퍼 크기 계산 (+1은 null 종결 문자용)
        var bufferSize = lengthBytesUTF8(data) + 1; 
    
        // Emscripten 힙 메모리 할당 (직접 _malloc 호출)
        var buffer = _malloc(bufferSize); 
    
        if (buffer === 0) {
             console.error("WebGLGetVideoDimensions: _malloc failed to allocate memory.");
             return 0; // 메모리 할당 실패 시 0 반환 (null 포인터)
        }
    
        // 문자열을 UTF8로 인코딩하여 할당된 메모리에 복사 (직접 stringToUTF8 호출)
        stringToUTF8(data, buffer, bufferSize); 
    
        // 할당된 메모리 포인터 반환
        return buffer; 
    },
    WebGLFlipCamera: function(){
        window.Camera.flipCam();
    },
    WebGLIsCameraFlipped: function(){
        return window.Camera.videoDisplayCanvas.style.transform == "scaleX(-1)";
    },
    WebGLSubscribeVideoTexturePtr: function(textureId){
        window.Camera.updateUnityVideoTextureCallback = ()=>{
            var videoCanvas = window.Camera.VIDEO; // videoCapture;
            textureObj = GL.textures[textureId];
    
            if (videoCanvas == null || textureObj == null) return;      
    
            GLctx.bindTexture(GLctx.TEXTURE_2D, textureObj);
            GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_WRAP_S, GLctx.CLAMP_TO_EDGE);
            GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_WRAP_T, GLctx.CLAMP_TO_EDGE);
            GLctx.texParameteri(GLctx.TEXTURE_2D, GLctx.TEXTURE_MIN_FILTER, GLctx.LINEAR);
            GLctx.pixelStorei(GLctx.UNPACK_FLIP_Y_WEBGL, true); 
            GLctx.texSubImage2D(GLctx.TEXTURE_2D, 0, 0, 0, GLctx.RGBA, GLctx.UNSIGNED_BYTE, videoCanvas);
            GLctx.pixelStorei(GLctx.UNPACK_FLIP_Y_WEBGL, false);
    
            //console.log("updateUnityVideoTextureCallback - webcam texture updated " + textureId);
        }
    },
    WebGLFreeMemory: function(ptr) {
        if (ptr !== 0) {
            _free(ptr); // 직접 _free 호출
        }
    }
};

mergeInto(LibraryManager.library, LibraryOpenCVUnity);