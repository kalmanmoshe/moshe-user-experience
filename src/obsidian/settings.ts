
export interface ColumnsSettings{
	wrapSize: number
	defaultSpan: number
}
export const DEFAULT_SETTINGS: ColumnsSettings = {
	wrapSize: 100,
	defaultSpan: 1,
};


export const COLUMN_NAME = "col";
export const COLUMN_MD = COLUMN_NAME + "-md";
export const TOKEN = "!!!";
export const SETTINGS_DELIM = "===";
export const MIN_WIDTH_VAR_NAME = "--obsidian-columns-min-width";
export const DEF_SPAN_VAR_NAME = "--obsidian-columns-def-span";
export const CODE_BLOCK_FENCE = "`";