using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;
using Newtonsoft.Json;
using UnityEngine.SceneManagement;
using Button = UnityEngine.UIElements.Button;

namespace NK.Webcam
{
    public class Device
    {
        [JsonProperty("deviceId")] public string DeviceId { get; set; }

        [JsonProperty("label")] public string Label { get; set; }
    }

    public class WebcamSelector : MonoBehaviour
    {
        /// <summary>
        /// 웹캠을 선택한 후 로드할 씬입니다.
        /// </summary>
        public SceneReference NextScene;

        private List<Device> Device { get; set; }
        private UIDocument _document;
        private DropdownField _webcamDropdown;
        private Button _accessButton;

        private void Start()
        {
            CameraUtility.RequestWebcamList(gameObject.name, nameof(ShowWebcamListInDropdown));

            _document = GetComponent<UIDocument>();
            var root = _document.rootVisualElement;
            _webcamDropdown = root.Q<DropdownField>("webcam-dropdown");
            _accessButton = root.Q<Button>("access-button");
            _accessButton.SetEnabled(false);
            _accessButton.clicked += OnAccess;
        }

        private void ShowWebcamListInDropdown(string json)
        {
            Device = JsonConvert.DeserializeObject<List<Device>>(json);

            if (Device.Count == 0)
            {
                Debug.LogError("No webcam devices found.");
                return;
            }

            _accessButton.SetEnabled(true);

            var webcamNameList = new List<string>();
            foreach (var device in Device)
                webcamNameList.Add(device.Label);

            _webcamDropdown.choices = webcamNameList;
            _webcamDropdown.value = webcamNameList[0];
        }

        private void OnAccess()
        {
            int index = _webcamDropdown.index;
            // string deviceName = Device[index].label; 장치 이름이 필요한 경우
            string deviceId = Device[index].DeviceId;
            CameraUtility.SetDeviceId(deviceId);
            SceneManager.LoadScene(NextScene.Path);
        }
    }
}