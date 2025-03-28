import { Cursor, WindowLayout } from "src/rememberCursorPosition";


export interface MosheUserExperienceSettings{
	delayAfterFileOpening: 100,
	saveTimer: 5000,
	rememberCursorPosition:
		{ EphemeralState: Array<[string,Cursor]>, windowLayout: WindowLayout }
}
export const DEFAULT_SETTINGS: MosheUserExperienceSettings = {
	delayAfterFileOpening: 100,
	saveTimer: 5000,
	rememberCursorPosition: { EphemeralState: [], windowLayout: null }
};


export class MosheUserExperienceSettings{

}