
import MosheUserExperience from "../main";
import { EditorState } from "@codemirror/state";
import { ViewUpdate } from "@codemirror/view";
import { mapToArray,  } from "../utils/types";
import { EditorView} from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { MarkdownView, TFile, WorkspaceLeaf } from "obsidian";
import { RememberCursorPositionSettings } from "./settings";

export type Cursor = { 
	from: {ch: number,line: number}, 
	to: {ch: number,line: number}
};

function stateSelectionToCursor(view: EditorView): Cursor {
	const cursor = view.state.selection.main;
	const from = view.state.doc.lineAt(cursor.from);
	const to = view.state.doc.lineAt(cursor.to);
	return {
		from: { line: from.number - 1, ch: cursor.from - from.from },
		to: { line: to.number - 1, ch: cursor.to - to.from },
	};
}
function scrollFromView(view: EditorView) {
	const scrollEl = view.scrollDOM;
	const scrollTop = scrollEl.scrollTop;
	const scrollHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
	return scrollTop / scrollHeight;
}
export type EphemeralState = { cursor?: Cursor, scroll?: number };

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
	lastLoadedFileName: string | null = null;
	settings: RememberCursorPositionSettings
	constructor(plugin: MosheUserExperience,db?: Map<string, EphemeralState>) {
		this.plugin = plugin;
		this.settings = plugin.settings.rememberCursorPosition;
		this.db = db||new Map();
		this.interval = new EventBasedInterval(() => this.writeDb(), {INTERVAL_DELAY: this.settings.saveTimer});
		this.plugin.app.workspace.onLayoutReady(() => {
			this.restoreEphemeralState();
			this.registerVaultEvents();
			this.registerWorkspaceEvents();
		})
	}
    private registerVaultEvents(){
        const vaultEvents: { [key: string]: (...args: any) => void } = {
            "rename": this.renameFile.bind(this),
            "delete": this.deleteFile.bind(this),
        };
        for (const [eventName, callback] of Object.entries(vaultEvents)) {
            //@ts-expect-error
            const eventRef = this.plugin.app.vault.on(eventName, callback);
            this.plugin.registerEvent(eventRef);
        }
	}
	private registerWorkspaceEvents(){
        const vaultEvents: { [key: string]: (...args: any) => void } = {
            "file-open": this.restoreEphemeralState.bind(this),
            "quit": () => { this.interval.trigger(); }
        };
        for (const [eventName, callback] of Object.entries(vaultEvents)) {
            //@ts-expect-error
            const eventRef = this.plugin.app.workspace.on(eventName, callback);
            this.plugin.registerEvent(eventRef);
        }
	}
	private renameFile(newPath: string, oldPath: string) {
		this.db.set(newPath, this.db.get(oldPath))
		this.db.delete(oldPath)
		this.interval.trigger();
	}
	private deleteFile(filePath: string) {
		this.db.has(filePath) && this.db.delete(filePath);
		this.interval.trigger();
	}
	private cursorSelectionsEqual(selection1: EditorSelection, selection2: EditorSelection): boolean {
		const ranges1 = selection1.ranges;
		const ranges2 = selection2.ranges;
		return ranges1.length===ranges2.length&&
            ranges1.every((range,index) => range.from==ranges2[index].from&&range.to==ranges2[index].to);
	}
	private updateEphemeralState(path: string, state: EphemeralState) {
		const obj = this.db.get(path);
		if (obj) {
			if ("cursor" in state) obj.cursor = state.cursor;
			if ("scroll" in state) obj.scroll = state.scroll;
		}
		this.db.set(path, obj||state);
	}
	private activeFilePath() {
		const path = this.plugin.app.workspace.getActiveFile()?.path;
		if (!path) throw new Error("No active file");
		return path;
	}
	/**
	 * Filters out view updates triggered when a new file is opened in which
	 * Oosidian sets the cursor to just after the frontmatter.
	 * 
	 * @param update 
	 * @returns true if this update is just Obsidian setting the initial selection
	 */
	private isUpdateNewView(update: ViewUpdate): boolean {
		//we take the start state because wen a new doc is opened, the view defaults to after the yaml
		const selection = update.startState.selection.main;
	
		const isInitialSelection =
			selection.from === 0 &&
			selection.to === 0;
	
			const noUserEvents = update.transactions.every(tx =>
				!tx.isUserEvent?.("select") &&
				!tx.isUserEvent?.("input") &&
				!tx.isUserEvent?.("scroll")
			);
	
		const noDocChange = !update.docChanged;
		return isInitialSelection && noUserEvents && noDocChange;
	}
	handleEditorViewUpdate(update: ViewUpdate) {
		if(!update.selectionSet||this.isUpdateNewView(update)) return;
		if(this.cursorSelectionsEqual(update.state.selection, update.startState.selection)) return;
		const path = this.activeFilePath();

		this.updateEphemeralState(path, {cursor: stateSelectionToCursor(update.view)});
		this.interval.trigger();
	}
	handleEditorViewScroll(event: Event, view: EditorView) {
		const path = this.activeFilePath();
		this.updateEphemeralState(path, {scroll: scrollFromView(view)});
		this.interval.trigger();
	}
	private async restoreEphemeralState(file?: TFile) {
		const fileName = file?.path??this.plugin.app.workspace.getActiveFile()?.path;
		if (fileName && this.loadingFile && this.lastLoadedFileName == fileName) //if already started loading
			return;
		
		const activeLeaf = this.plugin.app.workspace.getMostRecentLeaf();
		//@ts-expect-error
		if (activeLeaf && this.loadedLeafIdList.includes(activeLeaf.id + ":" + activeLeaf.getViewState().state.file))
			return;
		
		this.loadedLeafIdList = []
		this.plugin.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.getViewState().type ==="markdown") {
				//@ts-expect-error
				this.loadedLeafIdList.push(leaf.id + ":" +  leaf.getViewState().state.file)
			}
		});
		
		this.loadingFile = true;

		if (this.lastLoadedFileName != fileName) {
			this.lastEphemeralState = {}
			this.lastLoadedFileName = fileName;
			
			let st:EphemeralState

			if (fileName) {
				st = this.db.get(fileName);
				if (st) {
					//waiting for load note
					await this.delay(this.settings.delayAfterFileOpening)

					// Don't scroll when a link scrolls and highlights text
					// i.e. if file is open by links like [link](note.md#header) and wikilinks
					// See #10, #32, #46, #51
					const containsFlashingSpan = this.plugin.app.workspace.containerEl.querySelector("span.is-flashing");

					if (!containsFlashingSpan) {
						await this.delay(10)
						this.setEphemeralState(st);
					}
				}
			} 
			this.lastEphemeralState = st;
		}

		this.loadingFile = false;
	}
	private scrollPercentToPixel(scroll: number,el: HTMLElement) {
		const maxScrollTop = el.scrollHeight - el.clientHeight;
		return scroll * maxScrollTop;
	}
	setEphemeralState(state: EphemeralState,leaf?: WorkspaceLeaf) {
		leaf = leaf||this.plugin.app.workspace.getMostRecentLeaf();
		if (state.scroll&&leaf.view instanceof MarkdownView) {
			//@ts-expect-error
			const scrollEl = leaf.view.editor.cm?.scrollDOM
			if (!scrollEl) return;
			state.scroll = this.scrollPercentToPixel(state.scroll,scrollEl);
		}
		// for now i cant get the scroll to work in the editor view, so i will just set the cursor position
		state.scroll = undefined
		leaf.setEphemeralState(state);
		if(!(leaf.view instanceof MarkdownView)) return;
		leaf.view.editor.scrollIntoView(state.cursor,true);
	}
	private async writeDb() {
		const data:typeof this.plugin.settings = await this.plugin.loadData() || {};
		data.rememberCursorPosition.state = {EphemeralState: mapToArray<string,EphemeralState>(this.db), windowLayout: null};
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
	outdated = false;
	job?: unknown;
	action: (job: typeof this.job) => void;

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

