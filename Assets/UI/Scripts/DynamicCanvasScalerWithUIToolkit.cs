using UnityEngine;
using UnityEngine.UIElements; // CanvasScaler를 사용하기 위해 필요합니다.

namespace UI
{
    // CanvasScaler 컴포넌트가 반드시 존재하도록 강제합니다.
    [RequireComponent(typeof(UIDocument))]
    public class DynamicCanvasScalerWithUIToolkit : MonoBehaviour
    {
        [Header("참조 해상도 설정")] [Tooltip("가로 모드(너비 >= 높이)일 때 사용할 참조 해상도")]
        public PanelSettings landscapeReferenceResolution;

        [Tooltip("세로 모드(너비 < 높이)일 때 사용할 참조 해상도")]
        public PanelSettings portraitReferenceResolution;

        private UIDocument _document;
        private int lastScreenWidth = 0;
        private int lastScreenHeight = 0;

        private void Awake()
        {
            // CanvasScaler 컴포넌트 가져오기
            _document = GetComponent<UIDocument>();
            if (_document == null)
            {
                Debug.LogError("DynamicCanvasScaler 스크립트는 CanvasScaler 컴포넌트가 있는 게임 오브젝트에 부착되어야 합니다.", this);
                enabled = false; // 컴포넌트가 없으면 스크립트 비활성화
                return;
            }

            // 초기 해상도 설정 실행
            UpdateReferenceResolution();
        }

        private void Update()
        {
            // 현재 화면 너비와 높이가 마지막으로 확인했을 때와 다른지 체크
            if (Screen.width != lastScreenWidth || Screen.height != lastScreenHeight)
            {
                // 다르다면 해상도 업데이트 함수 호출
                UpdateReferenceResolution();
            }
        }

        private void UpdateReferenceResolution()
        {
            if (_document == null) return; // 안전 확인

            int currentWidth = Screen.width;
            int currentHeight = Screen.height;

            // 현재 화면의 너비와 높이를 비교하여 가로/세로 모드 결정
            if (currentWidth >= currentHeight) // 가로 모드 또는 정사각형
            {
                // 현재 설정된 참조 해상도가 landscape용과 다를 경우에만 변경
                if (_document.panelSettings != landscapeReferenceResolution)
                {
                    Debug.Log(
                        $"화면 방향 변경 감지: 가로 모드 또는 정사각형 ({currentWidth}x{currentHeight}). 가로 참조 해상도 적용: {landscapeReferenceResolution}");
                    _document.panelSettings = landscapeReferenceResolution;
                }
            }
            else // 세로 모드
            {
                // 현재 설정된 참조 해상도가 portrait용과 다를 경우에만 변경
                if (_document.panelSettings != portraitReferenceResolution)
                {
                    Debug.Log(
                        $"화면 방향 변경 감지: 세로 모드 ({currentWidth}x{currentHeight}). 세로 참조 해상도 적용: {portraitReferenceResolution}");
                    _document.panelSettings = portraitReferenceResolution;
                }
            }

            // 마지막으로 확인한 화면 크기 업데이트
            lastScreenWidth = currentWidth;
            lastScreenHeight = currentHeight;
        }
    }
}