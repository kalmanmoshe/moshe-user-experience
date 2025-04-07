/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import { ColumnsSettings, DEFAULT_COLUMNS_SETTINGS } from "src/columns/settings";

import { DEFAULT_REMEMBER_CURSOR_POSITION_SETTINGS, RememberCursorPositionSettings } from "src/rememberCursorPosition/settings";


export interface MosheUserExperienceSettings{
	rememberCursorPosition?: RememberCursorPositionSettings
	columns?: ColumnsSettings
}
export const DEFAULT_SETTINGS: MosheUserExperienceSettings = {
	rememberCursorPosition: DEFAULT_REMEMBER_CURSOR_POSITION_SETTINGS,
	columns: DEFAULT_COLUMNS_SETTINGS 
};


export class MosheUserExperienceSettings{

}