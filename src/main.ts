import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, MosheUserExperienceSettings } from "./obsidian/settings";
import { EditorSelection, Extension, Prec } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";

export default class MosheUserExperience extends Plugin{
    settings: MosheUserExperienceSettings;
    editorExtensions: Extension[]=[];
    async onload(){
        console.log("Moshe User Experience loaded");
        await this.loadSettings();
        //@ts-ignore
        const plugins = this.app.plugins
        console.log(plugins)
        try{
            this.app.workspace.on("layout-change", () => {
                console.log("Layout changed")
            });
        }
        catch(e){
            console.log(e);
        }
    }
    private async loadSettings() {
        const data = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
        this.app.workspace.onLayoutReady(() => {
            this.updateEditorExtensions();
        });
    }
    updateEditorExtensions(){
        this.setEditorExtensions();
		this.app.workspace.updateOptions();
    }

    private setEditorExtensions() {
        console.log("editor extensions before:", this.editorExtensions);
		while (this.editorExtensions.length) this.editorExtensions.pop();
		console.log("editor extensions after:", this.editorExtensions);
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
        if(!update.selectionSet) return;
        const selectionsEqual = (selection1: EditorSelection, selection2: EditorSelection) => {
            return selection1.ranges.length===selection2.ranges.length&&
            selection1.ranges.every((range,index) => range.from==selection2.ranges[index].from&&range.to==selection2.ranges[index].to);
        }
        if(selectionsEqual(update.state.selection, update.startState.selection)) return;
        const cursor = update.state.selection.main.head;
        console.log("Cursor moved to pos:", cursor);
    }
    private handleEditorViewScroll(event: Event, view: EditorView) {
        const scrollEl = view.scrollDOM;
        const scrollTop = scrollEl.scrollTop;
        const scrollHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
        const scrollRatio = scrollTop / scrollHeight;
        console.log("Scroll changed:", scrollRatio.toFixed(4));
    }
}


