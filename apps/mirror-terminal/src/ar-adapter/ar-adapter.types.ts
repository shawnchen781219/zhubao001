export interface ArFrameInput {
	frameId: string;
	capturedAt: string;
	source: "PLACEHOLDER_ONLY";
}

export interface ArRenderResult {
	frameId: string;
	overlayProductId?: string;
	previewLocalKey?: string;
}

export interface ArAdapterPort {
	initialize(): Promise<void>;
	renderFrame(input: ArFrameInput): Promise<ArRenderResult>;
	dispose(): Promise<void>;
}
