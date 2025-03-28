
import { App, Plugin, PluginSettingTab, Setting, MarkdownView, TAbstractFile, Editor } from "obsidian";
import MosheUserExperience from "./main";
import { EditorView } from "codemirror";
import { EditorSelection, EditorState } from "@codemirror/state";
import { ViewUpdate } from "@codemirror/view";

export type Cursor = { from: number, to: number }

function stateSelectionToCursor(selection: typeof EditorState.prototype.selection): Cursor {
	const cursor = selection.main;
	return { from: cursor.from, to: cursor.to}
}
function scrollFromView(view: EditorView) {
	const scrollEl = view.scrollDOM;
	const scrollTop = scrollEl.scrollTop;
	const scrollHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
	return scrollTop / scrollHeight;
}

class EphemeralState {
	private cursor?: Cursor;
	private scroll?: number;
	constructor(cursor?: Cursor, scroll?: number) {
		this.cursor = cursor;
		this.scroll = scroll;
	}
	setCursor(cursor: Cursor) {this.cursor = cursor}
	setScroll(scroll: number) {this.scroll = scroll}
}
enum LayoutType {
	split,
}
export class WindowLayout {
	type: LayoutType;
	path: string;
	children: WindowLayout[];

}


export class RememberCursorPosition {
    plugin: MosheUserExperience
	/**
	 * The database containing The cursor positions key is filed path value is EphemeralState When multiple files with the same.path are edited, it updates the last one
	 */
	db: Map<string,EphemeralState>
	/**
	 * Tracking the currently open windows For multiple same file support only used on obsidian startup/quit
	 */
	//layout: 
	lastSavedDb: { [file_path: string]: EphemeralState };
	lastEphemeralState: EphemeralState;
	lastLoadedFileName: string;
	loadedLeafIdList: string[] = [];
	loadingFile = false;
	outdated: boolean;
	constructor(plugin: MosheUserExperience) {
		this.plugin = plugin;
		this.db = new Map();
		this.registerVaultEvents();
	}
	async onload() {
		try {
			//this.db = await this.readDb();
			//this.lastSavedDb = await this.readDb();
		} catch (e) {
			console.error(
				"Remember Cursor Position plugin can't read database: " + e
			);
			this.db = new Map();
			this.lastSavedDb = {};
		}
		this.plugin.registerInterval(
			window.setInterval(() => this.writeDb(), this.plugin.settings.saveTimer)
		);
	}
    private registerVaultEvents(){
        const vaultEvents: { [key: string]: (...args: any) => void } = {
            "rename": this.renameFile.bind(this),
            "delete": this.deleteFile.bind(this),
            "file-open": this.restoreEphemeralState.bind(this),
            "quit": () => { this.writeDb(); }
        };
        for (const [eventName, callback] of Object.entries(vaultEvents)) {
            //@ts-expect-error
            const eventRef = this.plugin.app.vault.on(eventName, callback);
            this.plugin.registerEvent(eventRef);
        }

        this.restoreEphemeralState();
	}
	private registerWriteDbInterva() {
		this.plugin.registerInterval(
			window.setInterval(() => this.writeDb(), this.plugin.settings.saveTimer)
		);
	}
	renameFile(newPath: string, oldPath: string) {
		this.db.set(newPath, this.db.get(oldPath))
		this.db.delete(oldPath)
	}
	deleteFile(filePath: string) {
		this.db.has(filePath) && this.db.delete(filePath);
	}
	private cursorSelectionsEqual(selection1: EditorSelection, selection2: EditorSelection): boolean {
		const ranges1 = selection1.ranges;
		const ranges2 = selection2.ranges;
		return ranges1.length===ranges2.length&&
            ranges1.every((range,index) => range.from==ranges2[index].from&&range.to==ranges2[index].to);
	}
	updateEphemeralState(path: string, state: EphemeralState) {
		this.db.set(path, state);
	}
	activeFilePath() {
		const path = this.plugin.app.workspace.getActiveFile()?.path;
		if (!path) throw new Error("No active file");
		return path;
	}
	handleEditorViewUpdate(update: ViewUpdate) {
		if(!update.selectionSet) return;
        if(this.cursorSelectionsEqual(update.state.selection, update.startState.selection)) return;
		const path = this.activeFilePath();
		const state = new EphemeralState(
			stateSelectionToCursor(update.state.selection),
			scrollFromView(update.view)
		);
		this.updateEphemeralState(path, state);
		console.log("update", this.db);
	}
	handleEditorViewScroll(event: Event, view: EditorView) {
		const path = this.activeFilePath();
		if (!this.db.has(path)) return this.addEntryFromView(path, view);
		const state = this.db.get(path);
		const scrollRatio = scrollFromView(view);
		state.setScroll(scrollRatio);
		console.log("update", this.db);
	}
	addEntryFromView(path: string,view: EditorView) {
		const state = new EphemeralState(
			stateSelectionToCursor(view.state.selection),
			scrollFromView(view)
		);
		this.updateEphemeralState(path, state);
	}

	async saveEphemeralState(st: EphemeralState) {
		const fileName = this.plugin.app.workspace.getActiveFile()?.path;
		if (fileName && fileName == this.lastLoadedFileName) { //do not save if file changed or was not loaded
			//this.db[fileName] = st;
		}
	}

	
	async restoreEphemeralState() {
		const fileName = this.plugin.app.workspace.getActiveFile()?.path;

		if (fileName && this.loadingFile && this.lastLoadedFileName == fileName) //if already started loading
			return;
		
		const activeLeaf = this.plugin.app.workspace.getMostRecentLeaf()
		//@ts-expect-error
		if (activeLeaf && this.loadedLeafIdList.includes(activeLeaf.id + ":" + activeLeaf.getViewState().state.file))
			return;

		
		this.loadingFile = true;

		if (this.lastLoadedFileName != fileName) {
			this.lastLoadedFileName = fileName;
			
			let st:EphemeralState
			if (fileName) {
				st = this.db.get(fileName);
				if (st) {

					// Don't scroll when a link scrolls and highlights text
					// i.e. if file is open by links like [link](note.md#header) and wikilinks
					// See #10, #32, #46, #51
					const containsFlashingSpan = this.plugin.app.workspace.containerEl.querySelector("span.is-flashing");

					if (!containsFlashingSpan) {
						await this.delay(10);
					}
				}
			} 
			this.lastEphemeralState = st;
		}

		this.loadingFile = false;
	}

	private async writeDb() {
		const data = await this.plugin.loadData() || {};
		data["rememberCursorPosition"] = this.db;
		await this.plugin.saveData(data);
	}
	async delay(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
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