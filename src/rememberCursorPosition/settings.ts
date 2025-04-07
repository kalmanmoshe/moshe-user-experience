import { Plugin } from "obsidian"
import { EphemeralState, WindowLayout } from "src/rememberCursorPosition/rememberCursorPosition";

export interface RememberCursorPositionSettings {
    delayAfterFileOpening: number,
	saveTimer: number,
	state: { 
		EphemeralState: Array<[string,EphemeralState]>, 
		windowLayout: WindowLayout 
	}
}
export const DEFAULT_REMEMBER_CURSOR_POSITION_SETTINGS: RememberCursorPositionSettings = {
    delayAfterFileOpening: 100,
	saveTimer: 5000,
	state: { EphemeralState: [], windowLayout: null }
}


export function displayRememberCursorPositionSettings(plugin: Plugin,containerEl: HTMLElement): void {

}

/*
class SettingTab extends PluginSettingTab {
	plugin: MosheUserExperience;

	constructor(app: App, plugin: MosheUserExperience) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Remember cursor position - Settings" });

		new Setting(containerEl)
			.setName("Data file name")
			.setDesc("Save positions to this file")
			.addText((text) =>
				text
					.setPlaceholder("Example: cursor-positions.json")
					.setValue(this.plugin.settings.dbFileName)
					.onChange(async (value) => {
						this.plugin.settings.dbFileName = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Delay after opening a new note")
			.setDesc(
				"This plugin shouldn't scroll if you used a link to the note header like [link](note.md#header). If it did, then increase the delay until everything works. If you are not using links to page sections, set the delay to zero (slider to the left). Slider values: 0-300 ms (default value: 100 ms)."
			)
			.addSlider((text) =>
				text
					.setLimits(0, 300, 10)
					.setValue(this.plugin.settings.delayAfterFileOpening)
					.onChange(async (value) => {
						this.plugin.settings.delayAfterFileOpening = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Delay between saving the cursor position to file")
			.setDesc(
				"Useful for multi-device users. If you don't want to wait until closing Obsidian to the cursor position been saved."			)
			.addSlider((text) =>
				text
					.setLimits(SAFE_DB_FLUSH_INTERVAL, SAFE_DB_FLUSH_INTERVAL * 10, 10)
					.setValue(this.plugin.settings.saveTimer)
					.onChange(async (value) => {
						this.plugin.settings.saveTimer = value;
						await this.plugin.saveSettings();
					})
			);
	}
}*/