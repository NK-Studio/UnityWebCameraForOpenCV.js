window.unityFacingMode = "environment";

window.WEBCAM_SETTINGS = {
    video: {
        facingMode: window.unityFacingMode,
        width: {ideal: 640},
        height: {ideal: 480},
    },
    audio: false
};

class Camera {
    #updateIntervalId; // Timer ID for the main update loop

    unityCanvas; // Unity 렌더링을위한 기본 캔버스 (VideoDisplayCanvas와 동일 할 수 있음)
    videoDisplayCanvas; // 비디오 피드를 표시하는 데 사용되는 캔버스 (별도일 수 있음)
    videoContext; // 비디오 캔버스의 컨텍스트
    videoCapture; // 처리를 위한 프레임 캡처에 사용되는 숨겨진 캔버스
    captureContext; // 비디오 캡처 캔버스에 대한 2D 컨텍스트
    VIDEO;  // 비디오 요소

    usingUnityVideoPlane = false; // Unity가 비디오 디스플레이를 직접 처리하는지 여부를 나타내는 플래그
    RESIZE_DELAY = 50; // 크기 조정 이벤트를 처리하기 전 지연(ms)
    FRAMERATE = 30; // 처리를 위해 초당 목표 프레임
    maxFrameSize = 300; // 처리 캔버스의 최대 치수 (너비 또는 높이)
    isCameraStarted = false; // 카메라가 시작되었는지 여부를 나타내는 플래그
    cameraPaused = false;     // Flag to temporarily pause video processing
    lastOrientation; // 마지막으로 알려진 장치 방향('portrait' 또는 'landscape')을 저장합니다.
    FOV; // 카메라 시야각(FOV)을 도 단위로 계산
    isWebcamPermissionGranted; // 웹캠 권한이 부여되었는지 여부를 나타내는 플래그

    // 크기 조정 처리를 위한 내부 상태
    resizeTimeoutId;
    fadeId;

    // Unity 통합을 위한 콜백 (Unity 비디오 플레인을 사용하지 않는 경우)
    updateUnityVideoTextureCallback = null;

    // 잠재적 조절 또는 분석을위한 타임 스탬프 (가시 논리에 크게 사용되지는 않지만)
    lastUpdateTime;
    lastDetectTime;
    lastMatchTrackTime;

    /**
     * Unity 렌더링을 위한 캔버스와 비디오 피드를 표시하는 캔버스를 사용하여 카메라를 초기화합니다.
     * @param {HTMLCanvasElement} unityCanvas - Unity 렌더링을 위한 캔버스.
     * @param {HTMLCanvasElement} videoDisplayCanvas - 비디오 피드를 표시하는 캔버스.
     * @returns {Promise<never>} 초기화 실패 시 거부되는 약속.
     */
    constructor(unityCanvas, videoDisplayCanvas) {
        if (!unityCanvas) {
            console.error("Camera 오류 : UnityCanvas는 NULL입니다. 초기화에 실패했을 수 있습니다.");
            return Promise.reject("UnityCanvas는 NULL입니다.");
        }

        if (!videoDisplayCanvas) {
            console.error("Camera 오류 : VideoDisplayCanvas는 NULL입니다. 초기화에 실패했을 수 있습니다.");
            return Promise.reject("videoDisplayCanvas는 NULL입니다.");
        }

        this.unityCanvas = unityCanvas;
        this.videoDisplayCanvas = videoDisplayCanvas;
        this.videoContext = videoDisplayCanvas.getContext('2d');

        // --- 프로퍼티 초기화 ---
        this.usingUnityVideoPlane = false;
        this.RESIZE_DELAY = 50;
        this.FRAMERATE = 30; // 초당 목표 프레임
        this.maxFrameSize = 300;
        this.isCameraStarted = false;
        this.cameraPaused = false;
        this.isWebcamPermissionGranted = false;

        // --- 숨김 상태 캡쳐 캔버스 생성 ---
        this.videoCapture = document.createElement("canvas");
        this.videoCapture.id = "videoCapture"; // 잠재적 디버깅을 위한 ID 할당

        // 본문에 추가하고 시각적으로 숨깁니다
        document.body.appendChild(this.videoCapture);
        this.captureContext = this.videoCapture.getContext('2d');
        this.videoCapture.style.position = 'absolute';
        this.videoCapture.style.top = '0px';
        this.videoCapture.style.zIndex = '-100'; // 숨김 처리
        this.videoCapture.style.opacity = '0'; // 숨김 처리
        this.videoCapture.style.pointerEvents = 'none'; // 클릭 이벤트 무시

        // 초기 크기 설정 (비디오 시작 시 조정됨)
        this.setFrameSize(this.maxFrameSize);

        // --- 회전 초기화 ---
        this.lastOrientation = window.matchMedia('(orientation: portrait)').matches ? 'PORTRAIT' : 'LANDSCAPE';

        // --- 크기 조정 이벤트 리스너 ---
        window.addEventListener('resize', this.resizeWithDelay.bind(this), true);

    }

    /**
     * 비디오 디스플레이 캔버스를 좌우 반전합니다. (유니티에서 호출)
     * Unity에 반전 상태를 알립니다.
     */
    flipCam() {
        const isCurrentlyFlipped = this.videoDisplayCanvas.style.transform !== "scaleX(-1)";

        // 반대로 설정합니다.
        if (isCurrentlyFlipped) {
            this.videoDisplayCanvas.style.transform = "scaleX(-1)";
        } else {
            this.videoDisplayCanvas.style.transform = "scaleX(1)";
        }

        // Unity 인스턴스가 존재하는 경우 알림
        if (window.unityInstance && typeof window.unityInstance.SendMessage === 'function') {
            window.unityInstance.SendMessage('ARCamera', 'OnFlipCameraMessage', isCurrentlyFlipped ? 'true' : 'false');
        }
    }

    /**
     * 비디오 요소를 일시 중지하고 업데이트 루프 처리를 중지합니다. (유니티에서 호출)
     */
    pauseCamera() {
        this.cameraPaused = true;
        if (this.VIDEO) {
            this.VIDEO.pause();
        }
    }

    /**
     * 비디오 요소를 다시 시작하고(일시 중지된 경우) 업데이트 루프 처리를 다시 시작합니다. (유니티에서 호출)
     */
    unpauseCamera() {
        this.cameraPaused = false;
        if (this.VIDEO) {
            this.VIDEO.play().catch(e => console.error("ARCamera: Error resuming video play.", e));
        }
        console.log("ARCamera: Unpaused.");
    }

    /**
     * JSON 문자열에서 ARCamera 설정을 업데이트합니다. (Unity에서 호출)
     * @param {string} settingsJson - ARCamera 속성에 해당하는 키-값 쌍이 포함된 JSON 문자열.
     */
    setARCameraSettings(settingsJson) {
        try {
            const parsedSettings = JSON.parse(settingsJson);
            Object.keys(parsedSettings).forEach(key => {
                // 이 인스턴스의 속성으로 키가 존재하고 값이 다른지 확인합니다.
                if (Object.prototype.hasOwnProperty.call(this, key) && this[key] !== parsedSettings[key]) {
                    // 필요한 경우 기본 유형 검사/강제 변환을 추가할 수 있습니다.
                    this[key] = parsedSettings[key];
                    console.log(`Camera: Set ${key} = ${this[key]}`);

                    // 특정 설정 변경 사항을 즉시 처리합니다.
                    if (key === 'FRAMERATE') {
                        this.setFramerate(this[key]);
                    } else if (key === 'maxFrameSize') {
                        this.setFrameSize(this[key]);
                    }
                } else if (!Object.prototype.hasOwnProperty.call(this, key)) {
                    console.warn(`카메라: 알 수 없는 속성 '${key}' 설정 시도`);
                }
            });
        } catch (error) {
            console.error("카메라: 설정 JSON 구문 분석 실패", error, settingsJson);
        }
    }

    /**
     * 사용자의 웹캠 접근을 요청합니다.
     * 권한을 기다리는 동안 전역 플래그 `window.requestingForPermissions`를 true로 설정합니다.
     * 권한이 부여되면 `window.webcamStream`에 미디어 스트림을 설정합니다.
     * 권한이 거부되면 오류를 기록하고 `window.requestingForPermissions`를 false로 설정합니다.
     * @returns {Promise<void>}
     */
    async requestWebcam() {
        window.requestingForPermissions = true; // 전역 상태 플래그 설정
        try {
            // navigator.permissions.query를 먼저 사용하여 상태 확인 (선택 사항)
            let permissionGranted = false;
            if (navigator.permissions && typeof navigator.permissions.query === 'function') {
                try {
                    const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                    permissionGranted = permissionStatus.state === 'granted';
                    permissionStatus.onchange = () => { // 권한 변경 감지
                        location.reload();
                    }
                } catch(queryError){
                    console.warn ( "카메라 권한 상태를 쿼리 할 수 없음 :", queryError);
                    // 쿼리 실패 시에도 getUserMedia 시도
                }
            }

            if (permissionGranted) {
                console.log ( "웹캠 허가가 이미 부여되었습니다.");
                // 바로 스트림 가져오기 시도
                window.webcamStream = await navigator.mediaDevices.getUserMedia(window.WEBCAM_SETTINGS);
                this.isWebcamPermissionGranted = true;
            } else {
                console.log ( "웹캠 허가 요청 ...");
                window.webcamStream = await navigator.mediaDevices.getUserMedia(window.WEBCAM_SETTINGS);
                this.isWebcamPermissionGranted = true;
                console.log ( "요청시 부여 된 웹캠 액세스");
            }
            window.requestingForPermissions = false;

        } catch (err) {
            console.error("Error accessing webcam:", err.name, err.message);
            window.requestingForPermissions = false;
            this.isWebcamPermissionGranted = false; // 권한이 거부된 경우 false로 설정
            // 사용자에게 오류 메시지 표시
            alert('카메라 권한이 없습니다.');
            throw err; // 오류를 다시 던져서 호출자(initializeMain)가 알 수 있도록 함
        }
    }

    /**
     * 제공된 비디오 요소를 사용하여 웹캠 피드를 시작합니다.
     * @param {HTMLVideoElement} videoElement - 웹캠 스트림에 연결된 비디오 요소.
     * @returns {Promise<void>} 카메라가 성공적으로 시작될 때 해결하거나 오류를 거부하는 약속.
     */
    async startWebCam(videoElement) {
        this.VIDEO = videoElement;
        if (!videoElement.srcObject){
            console.error("Camera Error: Video element has no srcObject. Was requestWebcam successful?");
            return Promise.reject("Video element has no srcObject.");
        }

        try {
            // playsinline 속성 추가 (iOS 호환성)
            this.VIDEO.setAttribute('playsinline', 'true');
            this.VIDEO.muted = true; // 오디오 필요 없음

            // 비디오 재생 시작 (autoplay가 이미 있을 수 있지만 명시적 호출)
            await videoElement.play();

            // 검증
            if (!this.videoCapture) {
                const errorMsg = 'ARCAMERA 오류 : Videocapture 캔버스는 NULL입니다. 초기화에 실패했을 수 있습니다.';
                console.error(errorMsg);
                return Promise.reject(errorMsg);
            }
            if (!this.unityCanvas) {
                const errorMsg = 'Arcamera 오류 : UnityCanvas는 NULL입니다. 시공 중에 올바르게 제공되었는지 확인하십시오.';
                console.error(errorMsg);
                return Promise.reject(errorMsg);
            }

            // 비디오 메타데이터 로드 및 크기 확인 대기 (oncanplay에서 처리)
            return new Promise((resolve) => {
                this.VIDEO.oncanplay = () => {
                    console.log("Camera: Video ready (oncanplay). Starting loop.");
                    // 초기 리사이즈 수행
                    this.resizeCanvas();

                    this.lastUpdateTime = Date.now();
                    this.lastDetectTime = Date.now(); // 예시용
                    this.lastMatchTrackTime = Date.now(); // 예시용

                    clearInterval(this.#updateIntervalId);
                    this.#updateIntervalId = setInterval(this.#mainUpdateLoop.bind(this), 1000 / this.FRAMERATE);
                    this.isCameraStarted = true;
                    this.cameraPaused = false;

                    console.log("Camera: Webcam started successfully via startWebCam.");
                    resolve(); // 시작 성공 Promise 해결
                };
                // 이미 oncanplay 상태일 수 있으므로 즉시 체크
                if(this.VIDEO.readyState >= this.VIDEO.HAVE_FUTURE_DATA) {
                    if (!this.isCameraStarted) { // 아직 시작 안됐으면
                        this.VIDEO.oncanplay(); // 수동 호출
                    }
                }
            });
        } catch (error) {
            console.error("Camera : Webcam 시작 오류", error);
            this.isCameraStarted = false;
            return Promise.reject("Camera : Webcam 시작 오류");
        }
    }

    /**
     * 트리거 웹캠을 요청합니다.
     * @returns {Promise<void>}
     * @constructor
     */
    async triggerWebcam() {
        console.log("트리거 웹캠");

        while (window.requestingForPermissions) {
            console.log("허가를 기다리고 있습니다");
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log("허가를 받았습니다");

        if (window.webcamStream) {
            const video = document.querySelector("#webcam-video");
            video.srcObject = window.webcamStream;

            try {
                await window.Camera.startWebCam(video);
                console.log("웹캠 시작 성공");
                window.unityInstance.SendMessage('ARCamera', 'OnStartWebcamSuccess');
            } catch (error) {
                console.error("웹캠 시작 오류", error);
                window.unityInstance.SendMessage('ARCamera', 'OnStartWebcamFail');
            }

            return Promise.resolve();
        } else {
            console.error("웹캠 스트림이 없습니다");
            window.unityInstance.SendMessage('ARCamera', 'OnStartWebcamFail');
            return Promise.reject("웹캠 스트림이 없습니다");
        }
    }

    /**
     * 웹캠 피드와 업데이트 루프를 중지합니다.
     */
    stopWebcam() {
        if (this.VIDEO && this.VIDEO.srcObject) {
            try {
                const stream = this.VIDEO.srcObject;
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
                this.VIDEO.srcObject = null;
            } catch (e) {
                console.error("Camera: 비디오 트랙을 중지하는 중 오류가 발생했습니다.", e);
            }
        }
        clearInterval(this.#updateIntervalId);
        this.#updateIntervalId = null;
        this.isCameraStarted = false;
        this.VIDEO = null; // Clear reference
        console.log("Camera: 웹캠이 중지되었습니다.");
    }

    /**
     * 비디오 프레임을 처리하는 메인 루프입니다.
     * 현재 비디오 프레임을 숨겨진 캡처 캔버스에 그립니다.
     * 선택적으로 디스플레이 캔버스에 그리며, 구독된 트래커에 알립니다.
     * @private
     */
    #mainUpdateLoop() {
        if (this.cameraPaused || !this.isCameraStarted || !this.VIDEO || !this.captureContext) {
            return;
        }

        const videoElement = this.VIDEO;
        const captureCanvas = this.videoCapture;
        const displayCanvas = this.videoDisplayCanvas;
        const captureContext = this.captureContext;

        if (videoElement.readyState < videoElement.HAVE_METADATA || videoElement.videoWidth === 0) {
            return; // 비디오가 준비되지 않았거나 크기가 0인 경우
        }

        // --- 숨겨진 캡처 캔버스 (처리 용)로 그리기 ---
        // 종횡비를 유지하면서 캡처 캔버스 내에서 비디오에 맞게 스케일링을 계산합니다.
        const scaleXCap = captureCanvas.width / videoElement.videoWidth;
        const scaleYCap = captureCanvas.height / videoElement.videoHeight;
        const scaleCap = Math.min(scaleXCap, scaleYCap); // 내부에 맞게 'Min'을 사용
        const offsetXCap = (captureCanvas.width - videoElement.videoWidth * scaleCap) / 2;
        const offsetYCap = (captureCanvas.height - videoElement.videoHeight * scaleCap) / 2;

        captureContext.clearRect(0, 0, captureCanvas.width, captureCanvas.height);
        // 중앙에 변환을 적용하고 비디오 이미지를 스케일링하십시오
        captureContext.setTransform(scaleCap, 0, 0, scaleCap, offsetXCap, offsetYCap);
        captureContext.drawImage(videoElement, 0, 0);
        captureContext.setTransform(1, 0, 0, 1, 0, 0); // 트랜스폼 리셋

        // --- 가시 디스플레이 캔버스로 그리기 (Unity로 처리하지 않으면) ---
        if (!this.usingUnityVideoPlane && this.videoContext && displayCanvas) {
            // 디스플레이 캔버스와 일치하는 윈도우 크기 (최적화 될 수 있음)
            if (displayCanvas.width !== window.innerWidth) displayCanvas.width = window.innerWidth;
            if (displayCanvas.height !== window.innerHeight) displayCanvas.height = window.innerHeight;

            const displayContext = this.videoContext;
            // 디스플레이 캔버스 내에서 비디오에 맞게 스케일링을 계산하십시오
            const scaleXDisplay = displayCanvas.width / videoElement.videoWidth;
            const scaleYDisplay = displayCanvas.height / videoElement.videoHeight;

            // 전체 이미지를 표시하려면 일반적으로 배경 채우기 'Min'에 'max'를 사용하십시오. 배경 효과에 대해 'MAX'를 가정 해 봅시다.
            const scaleDisplay = Math.max(scaleXDisplay, scaleYDisplay);
            const offsetXDisplay = (displayCanvas.width - videoElement.videoWidth * scaleDisplay) / 2;
            const offsetYDisplay = (displayCanvas.height - videoElement.videoHeight * scaleDisplay) / 2;

            displayContext.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
            displayContext.setTransform(scaleDisplay, 0, 0, scaleDisplay, offsetXDisplay, offsetYDisplay);
            displayContext.drawImage(videoElement, 0, 0);
            displayContext.setTransform(1, 0, 0, 1, 0, 0); // 트랜스폼 리셋
        }

        // --- Unity 비디오 텍스처 업데이트 (대체 통합) ---
        if (this.updateUnityVideoTextureCallback && typeof this.updateUnityVideoTextureCallback === 'function') {
            try {
                // 잠재적으로 업로드 할 수 있도록 * 캡처 * 캔버스를 전달하십시오
                this.updateUnityVideoTextureCallback(captureCanvas);
            } catch (e) {
                console.error("Camera : updateUnityVideoTextureCallback 의 오류 :", e);
            }
        }

        // Update 타임 스탬프
        this.lastUpdateTime = Date.now();
    }

    /**
     * 내부 비디오 캡처 캔버스의 최대 치수를 설정합니다.
     * 현재 비디오 크기와 새로운 최대 크기를 기반으로 캔버스를 크게 조정합니다.
     * @param {number} maxDimension - 캡처 캔버스의 최대 너비 또는 높이.
     */
    setFrameSize(maxDimension) {
        this.maxFrameSize = maxDimension;
        const captureCanvas = this.videoCapture;
        const videoElement = this.VIDEO;

        // 올바른 스케일 크기를 계산하려면 비디오 크기가 필요합니다
        if (!captureCanvas || !videoElement || videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) {
            // 기본값을 설정하거나 대기 하시겠습니까? 기본값을 설정해도 괜찮을 수 있습니다.
            if (captureCanvas) {
                // 비디오가 준비되지 않은 경우 임시 작은 크기를 설정하십시오
                if (captureCanvas.width !== 100 || captureCanvas.height !== 100) {
                    captureCanvas.width = 100;
                    captureCanvas.height = 100;
                }
            }
            return; // 아직 정확한 크기를 계산할 수 없습니다
        }

        // MaxFramesize 내에서 비디오에 맞는 스케일 팩터를 계산하십시오.
        const scale = Math.min(this.maxFrameSize / videoElement.videoWidth, this.maxFrameSize / videoElement.videoHeight);
        const newWidth = Math.round(scale * videoElement.videoWidth);
        const newHeight = Math.round(scale * videoElement.videoHeight);

        // 필요한 경우에만 크기를 조정하십시오
        if (captureCanvas.width !== newWidth || captureCanvas.height !== newHeight) {
            captureCanvas.width = newWidth;
            captureCanvas.height = newHeight;
            console.log(`ARCamera: Capture canvas resized to ${newWidth}x${newHeight}`);

            // 추적자에게 캡처 치수의 변경 사항에 대해 알립니다
            // this.#notifyTrackersCameraDims(newWidth, newHeight);
        }
    }

    /**
     * 비디오 처리 루프의 목표 프레임 속도를 설정합니다.
     * 새로운 속도로 인터벌 타이머를 다시 시작합니다.
     * @param {number} newFramerate - 원하는 초당 프레임 수.
     */
    setFramerate(newFramerate) {
        if (newFramerate > 0 && this.FRAMERATE !== newFramerate) {
            this.FRAMERATE = newFramerate;
            console.log(`카메라: 프레임 속도가 ${newFramerate}로 설정되었습니다.`);

            // 카메라가 실행 중인 경우 인터벌 타이머를 다시 시작합니다.
            clearInterval(this.#updateIntervalId);
            if (this.isCameraStarted) {
                this.#updateIntervalId = setInterval(this.#mainUpdateLoop.bind(this), 1000 / this.FRAMERATE);
            }
        }
    }

    /**
     * 창 크기 조정 이벤트를 지연 처리하여 과도한 처리를 방지합니다.
     * 캔버스를 페이드 아웃/인하고 트래커에 알립니다.
     * @param {Event} [event] - 크기 조정 이벤트 객체 (선택 사항).
     */
    resizeWithDelay(event) {
        // 창 자체에서 발생하지 않은 이벤트는 무시합니다 (예: 요소 크기 조정)
        if (event != null && event.target != window) {
            return;
        }

        // // 필수 요소에 대한 기본 확인
        if (!this.unityCanvas || !this.videoDisplayCanvas) {
            console.warn("ARCamera: 리사이즈 건너뛰기, 캔버스 요소가 없습니다.");
            return;
        }

        console.log("Arcamera : 크기 조정 시작 ...");

        // 리사이즈가 시작되었음을 트래커에 알립니다.
        // this.SUBSCRIBED_TRACKERS.forEach(tracker => {
        //     if (tracker && typeof tracker.onStartResize === 'function') {
        //         try {
        //             tracker.onStartResize();
        //         } catch (e) {
        //             console.error("Arcamera : 추적기의 오류 .Startresize :", e);
        //         }
        //     }
        // });

        // Fade out canvases
        this.unityCanvas.style.opacity = '0';
        if (this.videoDisplayCanvas !== this.unityCanvas) { // Avoid setting opacity twice on same element
            this.videoDisplayCanvas.style.opacity = '0';
        }

        clearTimeout(this.resizeTimeoutId);

        // 실제 크기 조정 논리를 수행하기 위해 타임아웃을 설정합니다.
        this.resizeTimeoutId = setTimeout(() => {
            console.log("카메라: 지연된 resizeCanvas() 실행 중.");
            this.resizeCanvas(); // 실제 크기 조정 논리를 수행합니다.

            // Notify trackers that resize has finished
            // this.SUBSCRIBED_TRACKERS.forEach(tracker => {
            //     if (tracker && typeof tracker.onFinishedResize === 'function') {
            //         try {
            //             tracker.onFinishedResize();
            //         } catch (e) {
            //             console.error("ARCamera: Error in tracker.onFinishedResize:", e);
            //         }
            //     }
            // });

            // --- Fade In Animation ---
            const fadeDuration = 300; // Shorter fade duration
            const fadeStepDuration = 10;
            const steps = fadeDuration / fadeStepDuration;
            const opacityStep = 1.0 / steps;
            let currentOpacity = 0.0;

            clearInterval(this.fadeId); // Clear any previous fade interval

            this.fadeId = setInterval(() => {
                currentOpacity += opacityStep;
                currentOpacity = Math.min(currentOpacity, 1.0); // Clamp to 1.0

                // 불투명도 적용 - 요소가 존재하는지 확인
                if (this.unityCanvas) this.unityCanvas.style.opacity = currentOpacity.toString();
                if (this.videoDisplayCanvas && this.videoDisplayCanvas !== this.unityCanvas) {
                    this.videoDisplayCanvas.style.opacity = currentOpacity.toString();
                }

                if (currentOpacity >= 1.0) {
                    clearInterval(this.fadeId);
                    this.fadeId = null;
                    // 페이드 인 후 스타일을 완전히 재설정하여 깨끗한 상태로 만듭니다.
                    if (this.unityCanvas) this.unityCanvas.style.opacity = '';
                    if (this.videoDisplayCanvas && this.videoDisplayCanvas !== this.unityCanvas) {
                        this.videoDisplayCanvas.style.opacity = '';
                    }
                    console.log("카메라: 리사이즈 페이드 인 완료.");
                }
            }, fadeStepDuration);

        }, this.RESIZE_DELAY);
    }

    /**
     * 창 크기 및 비디오 종횡비를 기반으로 캔버스의 실제 크기 조정을 수행합니다.
     * 업데이트는 캔버스 크기, FOV, 방향을 캡처하고 Unity/Trackers에 알립니다.
     */
    resizeCanvas() {
        // 필요한 경우 글로벌 참조를 보장하십시오 (직접 사용은 더 좋지만)
        // if (!window.Camera) window.Camera = this;

        const captureCanvas = this.videoCapture;
        const videoElement = this.VIDEO;
        const unityCanvas = this.unityCanvas;
        const videoDisplayCanvas = this.videoDisplayCanvas;

        if (!videoElement || videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) {
            console.warn("카메라 : ResizeCanvas 건너 뛰기 - 비디오가 준비되지 않았거나 잘못된 크기가 있습니다.");
            return;
        }

        const windowW = window.innerWidth;
        const windowH = window.innerHeight;

        // --- 디스플레이 캔버스를 창에 맞게 조정하십시오 ---
        // 레이아웃 제어, 캔버스 너비/높이 드로잉 버퍼 크기
        if (unityCanvas) {
            // Match CSS dimensions to window
            if (unityCanvas.style.width !== `${windowW}px`) unityCanvas.style.width = `${windowW}px`;
            if (unityCanvas.style.height !== `${windowH}px`) unityCanvas.style.height = `${windowH}px`;
            // Unity가 관리하지 않는 경우 선택적으로 도면 버퍼도 크기를 조정하십시오.
            // if (unityCanvas.width !== windowW) unityCanvas.width = windowW;
            // if (unityCanvas.height !== windowH) unityCanvas.height = windowH;
        }
        // videoDisplayCanvas가 별도의 요소 인 경우 똑같이하십시오.
        if (videoDisplayCanvas && videoDisplayCanvas !== unityCanvas) {
            if (videoDisplayCanvas.style.width !== `${windowW}px`) videoDisplayCanvas.style.width = `${windowW}px`;
            if (videoDisplayCanvas.style.height !== `${windowH}px`) videoDisplayCanvas.style.height = `${windowH}px`;

            // Camera가 직접 그리는 경우 버퍼 크기를 조정하십시오
            if (!this.usingUnityVideoPlane) {
                if (videoDisplayCanvas.width !== windowW) videoDisplayCanvas.width = windowW;
                if (videoDisplayCanvas.height !== windowH) videoDisplayCanvas.height = windowH;
            }
        }

        // --- 캡처 캔버스 크기를 조정하십시오 ---
        // 이것은 MaxFramesize 및 현재 비디오 크기를 기반으로 재 계산합니다
        this.setFrameSize(this.maxFrameSize); // This also notifies trackers via #notifyTrackersCameraDims

        // --- FOV 및 방향을 업데이트하십시오 ---
        this.#updateFovAndOrientation(); // Unity에 알립니다.

        // --- Unity에 비디오 크기를 알립니다 (잠재적인 종횡비 보정을 위해) ---
        if (window.unityInstance && typeof window.unityInstance.SendMessage === 'function') {
            window.unityInstance.SendMessage('ARCamera', 'Resize', `${videoElement.videoWidth},${videoElement.videoHeight}`);
        }

        console.log(`카메라: resizeCanvas 완료. 창: ${windowW}x${windowH}, 캡처: ${captureCanvas?.width}x${captureCanvas?.height}`);
    }

    /**
     * 카메라의 시야각(FOV)과 현재 방향을 계산하고 업데이트합니다.
     * Unity에 변경 사항을 알립니다.
     * @private
     */
    #updateFovAndOrientation() {
        const videoElement = this.VIDEO;
        const unityCanvas = this.unityCanvas; // 종횡비 계산 컨텍스트로 사용

        if (!videoElement || videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0 || !unityCanvas) {
            return; // 요소와 유효한 크기가 필요합니다.
        }

        // --- FOV 계산 ---
        // 이 계산은 단순화된 것처럼 보입니다. 더 정확한 FOV는 카메라 내부 매개변수에서 나오거나
        // 장치에 따라 고정된 값일 수 있습니다. 이는 종횡비에서 파생하려고 시도합니다.
        const windowW = window.innerWidth;
        const windowH = window.innerHeight;
        const windowAspectRatio = windowW / windowH;
        const videoAspectRatio = videoElement.videoWidth / videoElement.videoHeight;

        // 이 FOV 계산 논리는 잠재적으로 결함이 있거나 특정 설정에 맞춰져 있습니다.
        // 이는 종횡비(창 또는 비디오) 중 어느 것이 '넓은지'에 따라 FOV를 조정하는 것처럼 보입니다.
        // 일반적인 수직 FOV 계산은 초점 거리와 센서 높이, 또는 알려진 수평 FOV와 종횡비가 필요합니다.
        // 원래 논리를 유지하지만 잠재적인 부정확성을 인정합니다.
        const effectiveAspectRatio = Math.min(videoAspectRatio, windowAspectRatio); // 또는 최대값이어야 하나요? 아니면 그냥 videoAspectRatio?
        const verticalFovFactor = 0.5 / effectiveAspectRatio; // 이 '0.5'는 아마도 정규화된 초점 거리 가정과 관련이 있을 것입니다.
        const verticalFovRadians = 2 * Math.atan(verticalFovFactor);
        const fovDegrees = verticalFovRadians * 180 / Math.PI;

        this.FOV = fovDegrees;

        // 계산된 FOV를 Unity에 알립니다.
        if (window.unityInstance && typeof window.unityInstance.SendMessage === 'function') {
            window.unityInstance.SendMessage('ARCamera', 'SetCameraFov', fovDegrees);
        }

        // --- 방향 업데이트 ---
        const currentOrientation = window.matchMedia('(orientation: portrait)').matches ? 'PORTRAIT' : 'LANDSCAPE';
        if (this.lastOrientation !== currentOrientation) {
            console.log(`카메라 : 방향이 변경되었습니다 -> ${currentOrientation}`);
            this.lastOrientation = currentOrientation;

            // 방향 변경을 Unity에 알립니다.
            if (window.unityInstance && typeof window.unityInstance.SendMessage === 'function') {
                window.unityInstance.SendMessage('ARCamera', 'OnChangeOrientationMessage', currentOrientation);
            }
        }
    }

    /**
     * 숨겨진 캡처 캔버스에서 현재 프레임을 데이터 URL로 반환합니다.
     * @param {string} [mimeType='image/png'] - 원하는 이미지 형식.
     * @returns {string | null} 캔버스를 사용할 수없는 경우 데이터 URL 문자열 또는 NULL.
     */
    getCameraTexture(mimeType = 'image/png') {
        if (!this.videoCapture || !this.captureContext) return null;
        try {
            // 캔버스에 컨텐츠가 있는지 확인하십시오 (여론 조사가 드러나는 경우 추첨 전화가 필요할 수 있음)
            // 이것은 #MainUpDateLoop이 실행 중이며 정기적으로 그리기한다고 가정합니다.
            if (this.videoCapture.width > 0 && this.videoCapture.height > 0) {
                return this.videoCapture.toDataURL(mimeType);
            } else {
                return null;
            }
        } catch (e) {
            console.error("카메라 : 카메라 텍스처를 얻는 오류:", e);
            return null;
        }
    }

    /**
     * 비디오 피드의 원본 크기를 반환합니다.
     * @returns {string | null} 사용할 수 없는 경우 비디오의 크기를 "width,height" 형식의 문자열 또는 null로 반환합니다.
     */
    getVideoDimensions()
    {
        const videoElement = this.VIDEO;
        if (videoElement && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            return `${videoElement.videoWidth},${videoElement.videoHeight}`;
        }
        return null;
    }
}
