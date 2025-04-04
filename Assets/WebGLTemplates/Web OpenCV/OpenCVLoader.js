
class OpenCVLoader {

    #camera; // 카메라 객체

    constructor(Camera) {
        this.#camera = Camera;
    }

    /**
     * OpenCV.js 라이브러리를 비동기적으로 로드합니다.
     * @returns {Promise<void>} 로드가 완료되면 resolve되는 Promise.
     */
    async loadOpenCV() {
        return new Promise((resolve, reject) => {
            const scriptId = 'opencv-js'; // 스크립트 태그 ID
            if (document.getElementById(scriptId)) {
                 // 이미 로드된 경우
                 if (window.cv) {
                      console.log('OpenCV.js already loaded.');
                      resolve();
                 } else {
                      // 스크립트는 있지만 cv 객체가 없는 이상한 경우, 로드를 기다림
                      cv.onRuntimeInitialized = () => {
                           console.log('cv initialized (already loaded script)');
                           window.cv = cv;
                           resolve();
                      };
                 }
                 return;
            }

            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'opencv.js'; // 실제 경로로 수정 필요
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous'; // 필요에 따라 설정

            script.onload = () => {
                 // cv 객체가 로드될 때까지 기다립니다.
                 // 때때로 onload 후에도 cv.onRuntimeInitialized가 호출될 수 있습니다.
                 if (cv.onRuntimeInitialized) {
                      cv.onRuntimeInitialized(() => {
                           console.log('cv initialized');
                           window.cv = cv; // 전역으로 접근 가능하게 설정
                           resolve();
                      });
                 } else {
                      // onRuntimeInitialized가 없는 구버전 호환성 (확실하지 않음)
                      console.warn('cv.onRuntimeInitialized not found, assuming loaded.');
                      window.cv = cv;
                      resolve();
                 }
                 // 로드 성공 후 스크립트 태그를 유지할 필요는 없지만, 디버깅을 위해 남겨둘 수 있습니다.
                 // document.body.removeChild(script); // 필요시 제거
            };

            script.onerror = () => {
                 console.error('failed to load opencv...');
                 reject(new Error('Failed to load opencv.js'));
                 // 실패 시 스크립트 태그 제거
                 if(script.parentNode) {
                      script.parentNode.removeChild(script);
                 }
            };

            document.body.appendChild(script);
        });
    }

    /**
     * 이미지 트래커를 초기화합니다. 파라미터 설정, 특징점 검출기 생성 등을 수행합니다.
     * @returns {Promise<void>} 초기화가 완료되면 resolve되는 Promise.
     */
    async initialize() {

        try {
            // OpenCV 로드 확인 및 로드
            if (!window.cv) {
                await this.loadOpenCV();
            }else{
                console.log('OpenCV는 이미로드되었습니다.');
            }

            // 로드 후 OpenCV 초기화 확인
            if (!window.cv) {
                console.error('OpenCV가 로드되지 않았습니다.');
                return Promise.reject(new Error('OpenCV가 로드되지 않았습니다.'));
            }

            // Camera 객체가 전역에 존재한다고 가정
            if (this.#camera) {
                this.#camera.resizeCanvas(); // 캔버스 크기 조정 함수 호출로 추정
            } else {
                console.warn('카메라 객체를 찾을 수없고 캔버스를 크기를 조정할 수 없습니다.');
            }

            console.log('초기화 완료!');
            return Promise.resolve();

        } catch (error) {
            console.error('초기화 실패 :', error);
            return Promise.reject(error);
        }
    }
}
