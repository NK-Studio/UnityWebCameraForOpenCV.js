using System;
using System.Runtime.InteropServices;

namespace NK.Webcam
{
    public static class CameraUtility
    {
        /// <summary>
        /// 웹캠 목록을 요청합니다.
        /// </summary>
        /// <param name="gameObjectName">콜백을 받을 게임 오브젝트의 이름</param>
        /// <param name="callbackMethodName">웹캠 목록을 받을 콜백 메서드의 이름</param>
        [DllImport("__Internal")]
        private static extern void WebGLRequestWebcamList(string gameObjectName, string callbackMethodName);

        /// <summary>
        /// 카메라 권한을 요청합니다.
        /// </summary>
        /// <param name="gameObjectName">콜백을 받을 게임 오브젝트의 이름</param>
        /// <param name="successMethodName">권한 요청 성공 시 호출될 메서드의 이름</param>
        /// <param name="failMethodName">권한 요청 실패 시 호출될 메서드의 이름</param>
        [DllImport("__Internal")]
        private static extern void WebGLRequestCameraPermission(string gameObjectName, string successMethodName,
            string failMethodName);

        /// <summary>
        /// 선택된 웹캠의 장치 ID를 설정합니다.
        /// </summary>
        /// <param name="deviceId">설정할 장치 ID</param>
        [DllImport("__Internal")]
        private static extern void WebGLSetDeviceId(string deviceId);

        /// <summary>
        /// WebGL에서 AR 카메라 설정을 적용합니다.
        /// </summary>
        /// <param name="settings">설정 값</param>
        [DllImport("__Internal")]
        private static extern void SetWebGLARCameraSettings(string settings);

        /// <summary>
        /// WebGL에서 카메라를 시작합니다.
        /// </summary>
        [DllImport("__Internal")]
        private static extern void WebGLStartCamera();

        /// <summary>
        /// WebGL에서 카메라를 중지합니다.
        /// </summary>
        [DllImport("__Internal")]
        private static extern void WebGLStopCamera();

        /// <summary>
        /// WebGL에서 카메라가 시작되었는지 확인합니다.
        /// </summary>
        /// <returns>카메라가 시작되었는지 여부</returns>
        [DllImport("__Internal")]
        private static extern bool WebGLIsCameraStarted();

        /// <summary>
        /// WebGL에서 카메라를 일시정지합니다.
        /// </summary>
        [DllImport("__Internal")]
        private static extern void WebGLPauseCamera();

        /// <summary>
        /// WebGL에서 카메라의 일시정지를 해제합니다.
        /// </summary>
        [DllImport("__Internal")]
        private static extern void WebGLUnpauseCamera();

        /// <summary>
        /// WebGL에서 비디오의 크기를 가져옵니다.
        /// </summary>
        /// <returns>비디오 크기</returns>
        [DllImport("__Internal")]
        private static extern IntPtr WebGLGetVideoDimensions();

        /// <summary>
        /// WebGL에서 카메라를 뒤집습니다.
        /// </summary>
        [DllImport("__Internal")]
        private static extern void WebGLFlipCamera();

        /// <summary>
        /// WebGL에서 카메라가 뒤집혔는지 확인합니다.
        /// </summary>
        /// <returns>카메라가 뒤집혔는지 여부</returns>
        [DllImport("__Internal")]
        private static extern bool WebGLIsCameraFlipped();

        /// <summary>
        /// WebGL에서 메모리를 해제합니다.
        /// </summary>
        /// <param name="ptr">해제할 메모리의 포인터</param>
        [DllImport("__Internal")]
        private static extern void WebGLFreeMemory(IntPtr ptr);

        /// <summary>
        /// 웹캠 권한이 부여되었는지 확인합니다.
        /// </summary>
        /// <returns>권한 부여 여부</returns>
        [DllImport("__Internal")]
        private static extern bool IsWebcamPermissionGranted();

        /// <summary>
        /// 웹캠 목록을 요청합니다.
        /// </summary>
        /// <param name="gameObjectName">콜백을 받을 게임 오브젝트의 이름</param>
        /// <param name="callbackMethodName">웹캠 목록을 받을 콜백 메서드의 이름</param>
        public static void RequestWebcamList(string gameObjectName, string callbackMethodName) =>
            WebGLRequestWebcamList(gameObjectName, callbackMethodName);

        /// <summary>
        /// 카메라 권한을 요청합니다.
        /// </summary>
        /// <param name="gameObjectName">콜백을 받을 게임 오브젝트의 이름</param>
        /// <param name="successMethodName">권한 요청 성공 시 호출될 메서드의 이름</param>
        /// <param name="failMethodName">권한 요청 실패 시 호출될 메서드의 이름</param>
        public static void RequestCameraPermission(string gameObjectName, string successMethodName,
            string failMethodName) =>
            WebGLRequestCameraPermission(gameObjectName, successMethodName, failMethodName);

        /// <summary>
        /// 선택된 웹캠의 장치 ID를 설정합니다.
        /// </summary>
        /// <param name="deviceId">설정할 장치 ID</param>
        public static void SetDeviceId(string deviceId) => WebGLSetDeviceId(deviceId);

        /// <summary>
        /// WebGL에서 AR 카메라 설정을 적용합니다.
        /// </summary>
        /// <param name="settings">설정 값</param>
        public static void SetARCameraSettings(string settings) => SetWebGLARCameraSettings(settings);

        /// <summary>
        /// WebGL에서 카메라를 시작합니다.
        /// </summary>
        public static void StartCamera() => WebGLStartCamera();

        /// <summary>
        /// WebGL에서 카메라를 중지합니다.
        /// </summary>
        public static void StopCamera() => WebGLStopCamera();

        /// <summary>
        /// WebGL에서 카메라가 시작되었는지 확인합니다.
        /// </summary>
        /// <returns>카메라가 시작되었는지 여부</returns>
        public static bool IsCameraStarted() => WebGLIsCameraStarted();

        /// <summary>
        /// WebGL에서 카메라를 일시정지합니다.
        /// </summary>
        public static void PauseCamera() => WebGLPauseCamera();

        /// <summary>
        /// WebGL에서 카메라의 일시정지를 해제합니다.
        /// </summary>
        public static void UnpauseCamera() => WebGLUnpauseCamera();

        /// <summary>
        /// WebGL에서 비디오의 크기를 가져옵니다.
        /// </summary>
        /// <returns>비디오 크기</returns>
        public static IntPtr GetVideoDimensions() => WebGLGetVideoDimensions();

        /// <summary>
        /// WebGL에서 카메라를 뒤집습니다.
        /// </summary>
        public static void FlipCamera() => WebGLFlipCamera();

        /// <summary>
        /// WebGL에서 카메라가 뒤집혔는지 확인합니다.
        /// </summary>
        /// <returns>카메라가 뒤집혔는지 여부</returns>
        public static bool IsCameraFlipped() => WebGLIsCameraFlipped();

        /// <summary>
        /// WebGL에서 메모리를 해제합니다.
        /// </summary>
        /// <param name="ptr">해제할 메모리의 포인터</param>
        public static void FreeMemory(IntPtr ptr) => WebGLFreeMemory(ptr);

        /// <summary>
        /// 웹캠 권한이 부여되었는지 확인합니다.
        /// </summary>
        /// <returns>권한 부여 여부</returns>
        public static bool HasPermission() => IsWebcamPermissionGranted();
    }
}