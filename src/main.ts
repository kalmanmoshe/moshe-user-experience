import { Editor, MarkdownPostProcessorContext, MarkdownRenderChild, MarkdownView, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, ColumnsSettings, COLUMN_NAME, COLUMN_MD, MIN_WIDTH_VAR_NAME, DEF_SPAN_VAR_NAME, TOKEN } from "./obsidian/settings";
import ColumnsSettingsTab from "./obsidian/settingTab";
import { turnOffSyntaxHighlighting, turnOnSyntaxHighlighting, setPluginInstance } from "obsidian-dev-utils";
import ColumnsBlock from "./columnsBlock";
import ColumnsMdBlock from "./columnsMdBlock";
import { applyAttributes, processChild } from "./columns";

export default class Columns extends Plugin{
    settings: ColumnsSettings;
    async onload(){
        console.log("Moshe User Experience loaded");
        await this.loadSettings();
        this.setCodeBlocks();
        this.registerMarkdownPostProcessor(this.processList.bind(this));
        setPluginInstance(this);
        turnOnSyntaxHighlighting([COLUMN_NAME, COLUMN_MD])
        
        this.addSettingTab(new ColumnsSettingsTab(this.app, this));
        this.addEditorCommands();
    }
    onunload() {
		turnOffSyntaxHighlighting([COLUMN_NAME, COLUMN_MD]);
	}
    private async loadSettings() {
        const data = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
        this.saveSettings();
    }
    async saveSettings() {
        await this.saveData(this.settings);
        /**
         * Loads and applies column-related CSS variables to the document root.
         */
        const root = document.querySelector(":root") as HTMLElement;
		root.style.setProperty(MIN_WIDTH_VAR_NAME, this.settings.wrapSize + "px");
		root.style.setProperty(DEF_SPAN_VAR_NAME, this.settings.defaultSpan.toString());
    }
    setCodeBlocks(){
        this.registerMarkdownCodeBlockProcessor(COLUMN_NAME, (source, el, ctx) => {
            return ColumnsBlock.process(this, source, el, ctx);
        });
		this.registerMarkdownCodeBlockProcessor(COLUMN_MD, (source, el, ctx) => {
            return ColumnsMdBlock.process(this, source, el, ctx);
        });
	}
    private addEditorCommands() {/*
        this.pluglin.addCommand({
            id: "insert-column-wrapper",
            name: "Insert column wrapper",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                new ColumnInsertModal(this.pluglin.app, (result) => {
                    const num = result.numberOfColumns.value
                    let outString = "````col\n"
                    for (let i = 0; i < num; i++) {
                        outString += "```col-md\nflexGrow=1\n===\n# Column " + i + "\n```\n"
                    }
                    outString += "````\n"
                    editor.replaceSelection(outString)
                }).open()
            }
        })*/

        this.addCommand({
            id: "insert-quick-column-wrapper",
            name: "Insert quick column wrapper",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const selectedText = editor.getSelection() // Get the currently selected text
                const cursorPosition = editor.getCursor() // Get the current cursor position

                // Construct the string with the selected text placed in the specified location
                const outString = "````col\n```col-md\nflexGrow=1\n===\n" + selectedText + "\n```\n````\n"

                editor.replaceSelection(outString) // Replace the selection with the constructed string

                // If there was no selected text, place the cursor on the specified line, else place it after the inserted string
                if (selectedText === "") {
                    editor.setCursor({ line: cursorPosition.line + 4, ch: 0 }) // Place the cursor on the specified line
                } else {
                    const lines = selectedText.split("\n").length // Calculate the number of lines in the selected text
                    editor.setCursor({ line: cursorPosition.line + 4 + lines - 1, ch: selectedText.length - selectedText.lastIndexOf("\n") - 1 }) // Place the cursor after the inserted string
                }
            }
        })

        this.addCommand({
            id: "insert-column",
            name: "Insert column",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const selectedText = editor.getSelection() // Get the currently selected text
                const cursorPosition = editor.getCursor() // Get the current cursor position

                let outString
                if (selectedText === "") {
                    // If there is no selected text, insert a new column with a placeholder
                    outString = "```col-md\nflexGrow=1\n===\n# New Column\n\n```"
                    editor.replaceSelection(outString); // Replace the selection with the constructed string
                    editor.setCursor({ line: cursorPosition.line + 4, ch: 0 }) // Place the cursor on the new line after # New Column
                } else {
                    // If there is selected text, place it in the specified location
                    outString = "```col-md\nflexGrow=1\n===\n" + selectedText + "\n```"
                    editor.replaceSelection(outString); // Replace the selection with the constructed string
                    const lines = selectedText.split("\n").length // Calculate the number of lines in the selected text
                    editor.setCursor({ line: cursorPosition.line + lines + 2, ch: selectedText.length - selectedText.lastIndexOf("\n") - 1 }) // Place the cursor after the last character of the selected text
                }
            }
        })
    }
    private processList(element: Element, context: MarkdownPostProcessorContext){
        for (const child of Array.from(element.children)) {
            if (child == null) {
                continue
            }
            if (child.nodeName != "UL" && child.nodeName != "OL") {
                continue
            }
            for (const listItem of Array.from(child.children)) {
                if (listItem == null) {
                    continue
                }
                if (!listItem.textContent.trim().startsWith(TOKEN + COLUMN_NAME)) {
                    this.processList(listItem, context)
                    continue
                }
                child.removeChild(listItem)
                const colParent = element.createEl("div", { cls: "columnParent" })
                const renderColP = new MarkdownRenderChild(colParent)
                context.addChild(renderColP)
                const itemList = listItem.querySelector("ul, ol")
                if (itemList == null) {
                    continue
                }
                for (const itemListItem of Array.from(itemList.children)) {
                    const childDiv = colParent.createEl("div", { cls: "columnChild" })
                    const renderColC = new MarkdownRenderChild(childDiv)
                    context.addChild(renderColC)
                    let span = parseFloat(itemListItem.textContent.split("\n")[0].split(" ")[0])
                    if (isNaN(span)) {
                        span = this.settings.defaultSpan
                    }
                    applyAttributes(childDiv, this.generateFlexStyleFromSpan(span))
                    let afterText = false
                    this.processList(itemListItem, context)
                    for (const itemListItemChild of Array.from(itemListItem.childNodes)) {
                        if (afterText) {
                            childDiv.appendChild(itemListItemChild)
                        }
                        if (itemListItemChild.nodeName == "#text") {
                            afterText = true
                        }
                    }
                    processChild(childDiv)
                }
            }
        }
    }
    /**
     * this is a duplicate of the one in ColumnsMdBlock, but im to tired to refactor it right now
     * @param span 
     * @returns 
     */
    private generateFlexStyleFromSpan(span: number){
		const o: Record<string,string> = {}
		o.flexGrow = span.toString()
		o.flexBasis = (this.settings.wrapSize * span).toString() + "px"
		o.width = (this.settings.wrapSize * span).toString() + "px"
		return o
	}
}

