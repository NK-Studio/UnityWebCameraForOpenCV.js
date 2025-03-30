using System.Runtime.InteropServices;
using UnityEngine;

namespace NK.OpenCV
{
    public static class OpenCVUtility
    {
        /// <summary>
        /// OpenCV가 로드되었는지 확인합니다.
        /// </summary>
        /// <returns>OpenCV가 로드되었으면 true, 그렇지 않으면 false</returns>
        [DllImport("__Internal")]
        public static extern bool WebIsLoadOpenCV();
        
        /// <summary>
        /// OpenCV가 로드될 때까지 기다립니다.
        /// </summary>
        public static async Awaitable WaitForOpenCVLoad()
        {
            while (!WebIsLoadOpenCV())
            {
                // 다음 프레임까지 기다립니다.
                await Awaitable.NextFrameAsync();
            }
        }
    }
}