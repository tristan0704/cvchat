import type { FaceAnalysisReport } from "@/lib/face-analysis"

export type FaceLandmarkPanelHandle = {
    stopAndAnalyze: () => Promise<FaceAnalysisReport | null>
    isWebcamRunning: () => boolean
}
