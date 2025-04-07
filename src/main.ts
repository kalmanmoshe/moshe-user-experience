import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, MosheUserExperienceSettings } from "./obsidian/settings";
import { Extension, Prec } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { RememberCursorPosition } from "./rememberCursorPosition/rememberCursorPosition";
import { arrayToMap } from "./utils/types";
import { Columns } from "./columns/columns";


export default class MosheUserExperience extends Plugin{
    settings: MosheUserExperienceSettings;
    editorExtensions: Extension[]=[];
    extensions: {
        rememberCursorPosition?: RememberCursorPosition, 
        columns?: Columns
    }={};
    async onload(){
        console.log("Moshe User Experience loaded");
        await this.loadSettings();
        this.initializeExtensions();
    }
    
    initializeExtensions(){
        this.extensions = {
            rememberCursorPosition: new RememberCursorPosition(this,arrayToMap(this.settings.rememberCursorPosition.state.EphemeralState)),
            columns: new Columns(this)
        };
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
        const {rememberCursorPosition} = this.extensions;
        if(rememberCursorPosition){
            rememberCursorPosition.handleEditorViewUpdate(update);
        }
    }

    private handleEditorViewScroll(event: Event, view: EditorView) {
        const rememberCursorPosition: RememberCursorPosition | undefined = this.extensions.rememberCursorPosition;
        if(rememberCursorPosition){
            rememberCursorPosition.handleEditorViewScroll(event, view);
        }
    }
}

