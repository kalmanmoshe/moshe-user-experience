import { Plugin } from "obsidian"

export interface ColumnsSettings {
	wrapSize: number
	defaultSpan: number
}
export const DEFAULT_COLUMNS_SETTINGS: ColumnsSettings = {
	wrapSize: 100,
	defaultSpan: 1,
}


export function displayColumnSettings(plugin: Plugin,containerEl: HTMLElement): void {/*
    wrapSize: {
        value: 100,
        name: "Minimum width of column",
        desc: "Columns will have this minimum width before wrapping to a new row. 0 disables column wrapping. Useful for smaller devices",
        onChange: (val: any) => {
            (document.querySelector(":root") as HTMLElement).style.setProperty(MINWIDTHVARNAME, val.toString() + "px")
        }
    },
    defaultSpan: {
        value: 1,
        name: "The default span of an item",
        desc: "The default width of a column. If the minimum width is specified, the width of the column will be multiplied by this setting.",
        onChange: (val: any) => {
            (document.querySelector(":root") as HTMLElement).style.setProperty(DEFSPANVARNAME, val.toString());
        }
    }*/
}
