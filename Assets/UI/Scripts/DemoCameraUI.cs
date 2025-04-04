using System;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UIElements;

namespace UI
{
    public class DemoCameraUI : MonoBehaviour
    {
        public UnityEvent OnPause;
        public UnityEvent OnUnpause;
        public UnityEvent OnFlip;

        private void Start()
        {
            if (TryGetComponent(out UIDocument document))
            {
                var root = document.rootVisualElement;
                root.Q<Button>("pause-button").clicked += () => OnPause.Invoke();
                root.Q<Button>("unpause-button").clicked += () => OnUnpause.Invoke();
                root.Q<Button>("flip-button").clicked += () => OnFlip.Invoke();
            }
        }
    }
}