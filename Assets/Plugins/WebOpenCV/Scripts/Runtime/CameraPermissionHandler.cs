using System;
using UnityEngine;
using UnityEngine.SceneManagement;
using Random = UnityEngine.Random;

namespace NK.Webcam
{
    public class CameraPermissionHandler : MonoBehaviour
    {
        [SerializeField] private SceneReference nextScene;

        private void Start()
        {
            CameraUtility.RequestCameraPermission(gameObject.name, nameof(Success), nameof(Fail));
        }

        private async void Success()
        {
            try
            {
                await Awaitable.WaitForSecondsAsync(Random.Range(1.2f, 2.4f));
                SceneManager.LoadScene(nextScene.Path);
            }
            catch (Exception e)
            {
                Debug.LogException(e);
            }
        }

        private void Fail()
        {
            Debug.LogError("Camera permission denied.");
        }
    }
}