
import MosheUserExperience from "./main";
import { EditorState } from "@codemirror/state";
import { ViewUpdate } from "@codemirror/view";
import { mapToArray, mapToJson } from "./utils/types";
import { EditorPosition, MarkdownView } from "obsidian";
import { EditorView} from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";

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
export type EphemeralState = { cursor: Cursor, scroll: number };
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
	loadedLeafIdList: string[] = [];
	loadingFile = false;
	outdated: boolean;
	interval: EventBasedInterval;
	constructor(plugin: MosheUserExperience,db?: Map<string, EphemeralState>) {
		this.plugin = plugin;
		this.db = db||new Map();
		this.interval = new EventBasedInterval(() => this.writeDb(), {});
		this.plugin.app.workspace.onLayoutReady(() => {
			this.restoreEphemeralState();
			this.registerVaultEvents();
		})
	}
    private registerVaultEvents(){
        const vaultEvents: { [key: string]: (...args: any) => void } = {
            "rename": this.renameFile.bind(this),
            "delete": this.deleteFile.bind(this),
            "file-open": this.restoreEphemeralState.bind(this),
            "quit": () => { this.interval.trigger(); }
        };
        for (const [eventName, callback] of Object.entries(vaultEvents)) {
            //@ts-expect-error
            const eventRef = this.plugin.app.vault.on(eventName, callback);
            this.plugin.registerEvent(eventRef);
        }
	}
	renameFile(newPath: string, oldPath: string) {
		this.db.set(newPath, this.db.get(oldPath))
		this.db.delete(oldPath)
		this.interval.trigger();
	}
	deleteFile(filePath: string) {
		this.db.has(filePath) && this.db.delete(filePath);
		this.interval.trigger();
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
		const state = {
			cursor: stateSelectionToCursor(update.state.selection),
			scroll: scrollFromView(update.view)
		};
		this.updateEphemeralState(path, state);
		this.interval.trigger();
	}
	handleEditorViewScroll(event: Event, view: EditorView) {
		const path = this.activeFilePath();
		if (!this.db.has(path)) return this.addEntryFromView(path, view);
		const state = this.db.get(path);
		const scrollRatio = scrollFromView(view);
		state.scroll=scrollRatio;
		this.interval.trigger();
	}
	addEntryFromView(path: string,view: EditorView) {
		const state = {
			cursor: stateSelectionToCursor(view.state.selection),
			scroll: scrollFromView(view)
		}
		this.updateEphemeralState(path, state);
	}
	
	async restoreEphemeralState() {
		const fileName = this.plugin.app.workspace.getActiveFile()?.path;
		if (!fileName) return;
		const activeLeaf = this.plugin.app.workspace.getMostRecentLeaf()
		//@ts-expect-error
		if (activeLeaf && this.loadedLeafIdList.includes(activeLeaf.id + ":" + activeLeaf.getViewState().state.file))
			return;
		this.loadingFile = true;
		const st:EphemeralState = this.db.get(fileName);
		console.log("Restoring cursor position for file: ", fileName, st);
		if (st) {
			// Don't scroll when a link scrolls and highlights text
			// i.e. if file is open by links like [link](note.md#header) and wikilinks
			// See #10, #32, #46, #51
			const containsFlashingSpan = this.plugin.app.workspace.containerEl.querySelector("span.is-flashing");

			if (!containsFlashingSpan) {
				await this.delay(10);
				this.setEphemeralState(st);
			}
		}
		this.lastEphemeralState = st;

		this.loadingFile = false;
	}
	setEphemeralState(state: EphemeralState) {
		//@ts-expect-error
		const view = (app.workspace.activeEditor?.editor as any).cm as EditorView;
		if (!view) return;
		view.dispatch({
			selection: EditorSelection.range(state.cursor.from, state.cursor.to),
			scrollIntoView: true,
		});
		console.log("Setting cursor position for file: ", view);
		/*
		if (state.cursor) {
			const editor = view?.editor;
			if (editor) {
				const from: EditorPosition= {  };
				editor.setSelection(from, state.cursor.to);
			}
		}

		if (view && state.scroll) {
			view.setEphemeralState(state);
			// view.previewMode.applyScroll(state.scroll);
			// view.sourceMode.applyScroll(state.scroll);
		}*/
	}
	private async writeDb() {
		const data:typeof this.plugin.settings = await this.plugin.loadData() || {};
		data.rememberCursorPosition = {EphemeralState: mapToArray<string,EphemeralState>(this.db), windowLayout: null};
		await this.plugin.saveData(data);
	}
	async delay(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}



class EventBasedInterval {
	INTERVAL_DELAY = 4000;
	IDLE_TIMEOUT = 10000;
	lastEvent = 0;
	intervalId: number | null = null;
	job?: unknown;
	outdated = false;
	action: (eventData?: unknown) => void;

	constructor(action: (eventData?: unknown) => void, config: { INTERVAL_DELAY?: number; IDLE_TIMEOUT?: number } = {}) {
		this.action = action;
		if (config.INTERVAL_DELAY) this.INTERVAL_DELAY = config.INTERVAL_DELAY;
		if (config.IDLE_TIMEOUT) this.IDLE_TIMEOUT = config.IDLE_TIMEOUT;
	}

	trigger(eventData?: unknown) {
		this.lastEvent = Date.now();
		this.outdated = true;
		this.job = eventData;

		if (this.intervalId === null) {
			this.intervalId = window.setInterval(() => this.tick(), this.INTERVAL_DELAY);
		}
	}

	private tick() {
		if (!this.outdated) return;

		const now = Date.now();
		const isIdle = now - this.lastEvent > this.IDLE_TIMEOUT;

		if (isIdle) {
			this.clear();
			return;
		}

		this.action(this.job);
		this.job = undefined;
		this.outdated = false;
	}

	clear() {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
			this.job = undefined;
		}
	}

	isRunning(): boolean {
		return this.intervalId !== null;
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