import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, MosheUserExperienceSettings } from "./obsidian/settings";
import { EditorSelection, Extension, Prec } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { RememberCursorPosition } from "./rememberCursorPosition";

export default class MosheUserExperience extends Plugin{
    settings: MosheUserExperienceSettings;
    editorExtensions: Extension[]=[];
    extensions: Map<string, RememberCursorPosition>;
    async onload(){
        console.log("Moshe User Experience loaded");
        this.initializeExtensions();
        await this.loadSettings();
        try{
            this.app.workspace.on("layout-change", () => {
                //console.log("Layout changed", this.app.workspace.getLayout());
            });
        }
        catch(e){
            console.log(e);
        }
    }
    initializeExtensions(){
        this.extensions =new Map([
            ["rememberCursorPosition", new RememberCursorPosition(this)]
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


