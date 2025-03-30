using System;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

namespace NK.OpenCV
{
    public class Init : MonoBehaviour
    {
        [SerializeField] private SceneReference nextScene;
        
        private async void Start()
        {
            var document = GetComponent<UIDocument>();
            Label bodyText = document.rootVisualElement.Q<Label>("bodyText");

            try
            {
                bodyText.text = "Camera Permission 확인 중...";
                await CameraBackground.WaitWebcamPermissionGranted();
                SceneManager.LoadScene(nextScene.Path);
            }
            catch (Exception e)
            {
                Debug.LogException(e);
            }
        }
    }
}