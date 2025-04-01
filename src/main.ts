import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, MosheUserExperienceSettings } from "./obsidian/settings";
import { Extension, Prec } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { RememberCursorPosition } from "./rememberCursorPosition";
import { arrayToMap } from "./utils/types";

export default class MosheUserExperience extends Plugin{
    settings: MosheUserExperienceSettings;
    editorExtensions: Extension[]=[];
    extensions: Map<string, RememberCursorPosition>=new Map();
    async onload(){
        console.log("Moshe User Experience loaded");
        await this.loadSettings();
        this.initializeExtensions();
    }
    
    initializeExtensions(){
        this.extensions =new Map([
            ["rememberCursorPosition", new RememberCursorPosition(this,arrayToMap(this.settings.rememberCursorPosition.EphemeralState))]
        ]);
    }
    private async loadSettings() {
        const data = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
        await this.saveData(this.settings);
        this.app.workspace.onLayoutReady(() => {
            this.updateEditorExtensions();
        });
    }
    updateEditorExtensions(){
        this.setEditorExtensions();
		this.app.workspace.updateOptions();
    }

    private setEditorExtensions() {
		while (this.editorExtensions.length) this.editorExtensions.pop();
		this.editorExtensions.push([
			Prec.lowest([
                EditorView.updateListener.of((update: ViewUpdate) => {
                    this.handleEditorViewUpdate(update);
                }),
                EditorView.domEventHandlers({
                    scroll: (event, view) => {
                        this.handleEditorViewScroll(event, view);
                    }
                })
            ]
        )]);

		this.registerEditorExtension(this.editorExtensions.flat());
	}
    private handleEditorViewUpdate(update: ViewUpdate) {        
        this.extensions.get("rememberCursorPosition")?.handleEditorViewUpdate(update);
    }

    private handleEditorViewScroll(event: Event, view: EditorView) {
        this.extensions.get("rememberCursorPosition")?.handleEditorViewScroll(event, view);
    }
}


