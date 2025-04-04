using System;
using UnityEngine;
using System.Runtime.InteropServices;
using JetBrains.Annotations;
using UnityEngine.Events;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using NK.OpenCV;

namespace NK.Webcam
{
    public enum CameraOrientation
    {
        Portrait,
        Landscape
    }

    [RequireComponent(typeof(Camera))]
    public class CameraBackground : MonoBehaviour
    {
        [Tooltip("오브젝트가 활성화/비활성화될때 카메라를 일시정지/재개합니다.")] [SerializeField]
        private bool unpausePauseOnEnableDisable;

        [Tooltip("카메라가 비활성화될때 카메라를 일시정지합니다.")] [SerializeField]
        private bool pauseOnApplicationLostFocus;

        [Tooltip("카메라가 파괴될때 카메라를 일시정지합니다.")] [SerializeField]
        private bool pauseOnDestroy;

        [SerializeField] [Range(0, 1000)] private int resizeDelay = 50;

        public UnityEvent<CameraOrientation> OnCameraOrientationChanged;

        private Camera _mainCamera;
        private bool _paused;

        /// <summary>
        /// 카메라가 뒤집혔는지 여부를 나타냅니다.
        /// </summary>
        public bool IsFlip { get; private set; }

        /// <summary>
        /// 카메라의 현재 방향을 나타냅니다.
        /// </summary>
        public CameraOrientation Orientation { get; private set; }

        private void Awake()
        {
            _mainCamera = Camera.main;
        }

        private async void Start()
        {
            try
            {
                IsFlip = CameraUtility.IsCameraFlipped();

                OnCameraOrientationChanged?.Invoke(Screen.height > Screen.width
                    ? CameraOrientation.Portrait
                    : CameraOrientation.Landscape);

                // 카메라의 ClearFlags를 Depth로 설정합니다.
                if (_mainCamera != null)
                {
                    _mainCamera.backgroundColor = Color.clear;

                    if (GraphicsSettings.currentRenderPipeline != null &&
                        GraphicsSettings.defaultRenderPipeline.GetType().ToString()
                            .EndsWith("UniversalRenderPipelineAsset"))
                    {
                        _mainCamera.clearFlags = CameraClearFlags.Depth;
                        _mainCamera.allowHDR = false;
                        var camData = GetComponent<UniversalAdditionalCameraData>();
                        camData.renderPostProcessing = false;
                    }
                }

                await OpenCVUtility.WaitForOpenCVLoad();

                SetARCameraSettings();
                StartCamera();
            }
            catch (Exception e)
            {
                Debug.LogError(e);
            }
        }

        private void OnEnable()
        {
            if (unpausePauseOnEnableDisable)
                UnpauseCamera();
        }

        private void OnDisable()
        {
            if (unpausePauseOnEnableDisable)
                PauseCamera();
        }

        private void OnDestroy()
        {
            if (pauseOnDestroy)
                PauseCamera();
        }

        /// <summary>
        /// AR 카메라 설정을 JSON 형식으로 설정합니다.
        /// </summary>
        private void SetARCameraSettings()
        {
            var json = new System.Text.StringBuilder();
            json.Append("{");
            json.Append("\"RESIZE_DELAY\":").Append(resizeDelay);
            json.Append("}");

            CameraUtility.SetARCameraSettings(json.ToString());
        }

        /// <summary>
        /// 비디오 크기를 조정합니다.
        /// </summary>
        private void StartCamera()
        {
            if (CameraUtility.IsCameraStarted())
            {
                SetVideoDimensions();
            }
            else
            {
                CameraUtility.StartCamera();
            }
        }

        /// <summary>
        /// 카메라를 일시정지합니다.
        /// </summary>
        public void PauseCamera()
        {
            if (_paused)
                return;

            CameraUtility.PauseCamera();

            _paused = true;
        }

        /// <summary>
        /// 카메라를 일시정지 해제합니다.
        /// </summary>
        public void UnpauseCamera()
        {
            if (!_paused)
                return;

            CameraUtility.UnpauseCamera();

            _paused = false;
        }

        /// <summary>
        /// 비디오 크기를 조정합니다.
        /// </summary>
        /// <param name="dimensions">"width,height" 형식의 문자열로 비디오 크기</param>
        private void Resize(string dimensions)
        {
            // var vals = dimensions.Split(new[] { "," }, StringSplitOptions.RemoveEmptyEntries);
            // var width = int.Parse(vals[0]);
            // var height = int.Parse(vals[1]);

            // Debug.Log("Got Video Texture Size - " + width + " x " + height);
        }

        /// <summary>
        /// WebGL 컨텍스트에서 비디오 크기를 가져옵니다.
        /// </summary>
        /// <returns>"width,height" 형식의 문자열로 비디오 크기를 반환합니다.</returns>
        private string GetVideoDimensions()
        {
            IntPtr bufferPtr = IntPtr.Zero;
            try
            {
                bufferPtr =CameraUtility.GetVideoDimensions();
                if (bufferPtr == IntPtr.Zero)
                {
                    Debug.LogError("WebGLGetVideoDims returned a null pointer. Allocation might have failed.");
                    return null;
                }

                // 포인터로부터 UTF8 문자열 읽기
                string videoDims = Marshal.PtrToStringUTF8(bufferPtr);
                return videoDims;
            }
            catch (Exception e)
            {
                Debug.LogError($"Error getting video dimensions: {e.Message}");
                return null;
            }
            finally
            {
                // C#에서 사용이 끝난 후 반드시 메모리 해제!
                if (bufferPtr != IntPtr.Zero)
                {
                    CameraUtility.FreeMemory(bufferPtr);
                }
            }
        }

        /// <summary>
        /// 비디오 크기를 설정합니다.
        /// </summary>
        private void SetVideoDimensions()
        {
            var videoDims = GetVideoDimensions();
            Resize(videoDims);
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            if (pauseOnApplicationLostFocus)
            {
                if (CameraUtility.IsCameraStarted())
                {
                    if (hasFocus)
                        UnpauseCamera();
                    else
                        PauseCamera();
                }
            }
        }

        private void OnApplicationPause(bool pauseStatus)
        {
            if (pauseOnApplicationLostFocus)
            {
                if (CameraUtility.IsCameraStarted())
                {
                    if (!pauseStatus)
                        UnpauseCamera();
                    else
                        PauseCamera();
                }
            }
        }

        /// <summary>
        /// 카메라를 뒤집습니다.
        /// </summary>
        public void FlipCamera()
        {
            CameraUtility.FlipCamera();
        }

        /// <summary>
        /// 웹캠 카메라 시작 성공 시 호출됩니다. (js에서 호출)
        /// </summary>
        [UsedImplicitly]
        private void OnStartWebcamSuccess()
        {
            SetVideoDimensions();
        }

        /// <summary>
        /// 웹캠 카메라 시작 실패 시 호출됩니다. (js에서 호출)
        /// </summary>
        [UsedImplicitly]
        private void OnStartWebcamFail()
        {
            Debug.LogError("Webcam failed to start!");
        }

        /// <summary>
        /// 카메라의 시야각(Field of View)을 설정합니다. (js에서 호출)
        /// </summary>
        /// <param name="fov">설정할 시야각 값</param>
        [UsedImplicitly]
        private void SetCameraFov(float fov)
        {
            _mainCamera.fieldOfView = fov;
            Debug.Log("Camera FOV set to: " + fov);
        }

        /// <summary>
        /// 플립 메시지를 받아서 처리합니다. (js에서 호출)
        /// </summary>
        /// <param name="message">처리할 메시지</param>
        [UsedImplicitly]
        private void OnFlipCameraMessage(string message)
        {
            IsFlip = message == "true";

            // //flip videoPlane
            // if (_videoBackground != null)
            // {
            //     var newScale = _videoBackground.transform.localScale;
            //     newScale.x = Mathf.Abs(newScale.x) * (IsFlip ? -1 : 1);
            //     _videoBackground.transform.localScale = newScale;
            // }
        }

        /// <summary>
        /// 단말기 회전에 대한 메시지를 받아서 처리합니다. (js에서 호출)
        /// </summary>
        /// <param name="message">처리할 메시지</param>
        [UsedImplicitly]
        private void OnChangeOrientationMessage(string message)
        {
            Orientation = message == "PORTRAIT" ? CameraOrientation.Portrait : CameraOrientation.Landscape;
            OnCameraOrientationChanged?.Invoke(Orientation);
        }
    }
}