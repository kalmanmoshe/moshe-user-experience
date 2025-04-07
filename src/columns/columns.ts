import { MarkdownRenderChild, MarkdownRenderer,  MarkdownPostProcessorContext, Editor, MarkdownView, } from "obsidian";
//import { SettingItem, display, loadSettings, saveSettings, createSetting } from "obsidian-settings/settings"
import MosheUserExperience from "src/main";
import { ColumnsSettings } from "./settings";
const NAME = "Obsidian Columns"
const COLUMNNAME = "col"
const COLUMNMD = COLUMNNAME + "-md"
const TOKEN = "!!!"
const SETTINGSDELIM = "==="
const MINWIDTHVARNAME = "--obsidian-columns-min-width"
const DEFSPANVARNAME = "--obsidian-columns-def-span"
const CODEBLOCKFENCE = "`"

type BORDERSETTINGS = {
	borderColor?: string,
	borderStyle?: string,
	borderWidth?: string,
	borderRadius?: string,
	borderPadding?: string,
}

type COLMDSETTINGS = {
	flexGrow?: string,
	height?: string,
	textAlign?: string,
} & BORDERSETTINGS

type COLSETTINGS = {
	height?: string,
	textAlign?: string,
	colMax?: string
} & BORDERSETTINGS




const findSettings = (source: string, unallowed = ["`"], delim = SETTINGSDELIM): { settings: string, source: string } => {
	const lines = source.split("\n")

	lineLoop: for (const line of lines) {
		for (const j of unallowed) {
			if (line.contains(j)) {
				break lineLoop
			}
			if (line == delim) {
				const split = source.split(delim + "\n")
				if (split.length > 1) {
					return { settings: split[0], source: split.slice(1).join(delim + "\n") }
				}
				break lineLoop
			}
		}
	}
	return { settings: "", source: source }
}

const parseSettings = <T>(settings: string) => {
	const o = {}
	settings.split("\n").map((i) => {
		return i.split(";")
	}).reduce((a, b) => {
		a.push(...b)
		return a
	}).map((i) => {
		return i.split("=").map((j) => {
			return j.trim()
		}).slice(0, 2)
	}).forEach((i) => {
		(o as any)[i[0]] = i[1]
	})
	return o as T
}

const countBeginning = (source: string) => {
	let out = 0
	const letters = source.split("")
	for (const letter of letters) {
		if (letter == CODEBLOCKFENCE) {
			out++
		} else {
			break
		}
	}
	return out
}
/**
 * splits the source into rows based on the SETTINGSDELIM
 * @param source 
 * @returns 
 */
const parseRows = (source: string) => {
	const lines = source.split("\n")
	const rows = []
	let curToken = 0
	let newToken = 0
	let curRow = []
	for (const line of lines) {
		const newCount = countBeginning(line)
		newToken = newCount < 3 ? 0 : newCount
		if (curToken == 0 && newToken == 0 && line.startsWith(SETTINGSDELIM)) {
			rows.push(curRow.join("\n"))
			curRow = []
			continue
		} else if (curToken == 0) {
			curToken = newToken
		} else if (curToken == newToken) {
			curToken = 0
		}
		curRow.push(line)
	}
	rows.push(curRow.join("\n"))
	return rows
}

const parseDirtyNumber = (num: string) => {
	return parseFloat(num.split("")
		.filter((char: string) => "0123456789.".contains(char))
		.join(""))
}
function parseAttributesFromString(str: string) {
	const fakeHTML = `<div ${str}></div>`;
	const doc = new DOMParser().parseFromString(fakeHTML, "text/html");
	const parsedDiv = doc.body.firstChild;
	if (!parsedDiv || !(parsedDiv instanceof HTMLElement)) return [];
	return Array.from(parsedDiv.attributes).map(attr => ({
		name: attr.name,
		value: attr.value
	}));
}

export class Columns {
	pluglin: MosheUserExperience;
	private generateFlexStyleFromSpan(span: number){
		const o: Record<string,string> = {}
		o.flexGrow = span.toString()
		o.flexBasis = (this.settings.wrapSize * span).toString() + "px"
		o.width = (this.settings.wrapSize * span).toString() + "px"
		return o
	}
	
	settings: ColumnsSettings;

	processChild = (c: HTMLElement) => {
		if (c.firstChild != null && "tagName" in c.firstChild && (c.firstChild as HTMLElement).tagName == "BR") {
			c.removeChild(c.firstChild)
		}
		let firstChild = c

		while (firstChild != null) {
			if ("style" in firstChild) {
				firstChild.style.marginTop = "0px"
			}
			firstChild = (firstChild.firstChild as HTMLElement)
		}
		let lastChild = c
		while (lastChild != null) {
			if ("style" in lastChild) {
				lastChild.style.marginBottom = "0px"
			}
			lastChild = (lastChild.lastChild as HTMLElement)
		}
	}
	constructor(plugin: MosheUserExperience) {
		this.pluglin = plugin
		this.settings = plugin.settings.columns
		this.onload()
	}
	async onload() {

		//this.pluglin.addSettingTab(new ObsidianColumnsSettings(this.pluglin.app, this));
		this.setCodeblocks()
		this.addEditorCommands()
		this.addSyntaxHighlighting()
	

		const processList = (element: Element, context: MarkdownPostProcessorContext) => {
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
					if (!listItem.textContent.trim().startsWith(TOKEN + COLUMNNAME)) {
						processList(listItem, context)
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
						this.applyAttributes(childDiv, this.generateFlexStyleFromSpan(span))
						let afterText = false
						processList(itemListItem, context)
						for (const itemListItemChild of Array.from(itemListItem.childNodes)) {
							if (afterText) {
								childDiv.appendChild(itemListItemChild)
							}
							if (itemListItemChild.nodeName == "#text") {
								afterText = true
							}
						}
						this.processChild(childDiv)
					}
				}
			}
		}

		this.pluglin.registerMarkdownPostProcessor((element, context) => { processList(element, context) });
	}
	
	setCodeblocks(){
		this.pluglin.registerMarkdownCodeBlockProcessor(COLUMNNAME, this.columnBlockProcessor.bind(this))
		this.pluglin.registerMarkdownCodeBlockProcessor(COLUMNMD, this.markdownColumnCodeBlockProcessor.bind(this))
	}

	addSyntaxHighlighting() {
		// @ts-ignore
		if (!window.CodeMirror || !Array.isArray(window.CodeMirror.modeInfo)) return;
	
		// @ts-ignore
		const modeInfo = window.CodeMirror.modeInfo;
		const modesToAdd = [
			{ name: "col", mime: "text/x-markdown", mode: "markdown" },
			{ name: "col-md", mime: "text/x-markdown", mode: "markdown" },
		];
	
		for (const mode of modesToAdd) {
			if (!modeInfo.some((el: {name: string}) => el.name === mode.name)) {
				modeInfo.push(mode);
			}
		}
	}
	removeSyntaxHighlighting() {
		//@ts-ignore
		if (!window.CodeMirror || !Array.isArray(window.CodeMirror.modeInfo)) return;
	
		// @ts-ignore
		window.CodeMirror.modeInfo = window.CodeMirror.modeInfo.filter(
			(el: {name: string}) => el.name !== "col" && el.name !== "col-md"
		);
	}

	async columnBlockProcessor(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		const { source: content, settings } = findSettings(source);
		const attrs = Object.fromEntries(parseAttributesFromString(settings).map(a => [a.name, a.value]));
		const rows = parseRows(content);
		const srcPath = ctx.sourcePath;
	
		const applyScrollHeight = async (
			parent: HTMLElement,
			height: string,
			wait: Promise<void>
		): Promise<Record<string, string>> => {
			if (height === "shortest") {
				await wait;
				const shortest = Math.min(...Array.from(parent.children).map(c => {
					const child = c.firstElementChild as HTMLElement;
					const cs = getComputedStyle(child);
					return parseDirtyNumber(cs.height) + parseDirtyNumber(cs.lineHeight);
				}));
	
				Array.from(parent.children).forEach(c => {
					this.applyAttributes(c.firstElementChild as HTMLElement, {
						height: `${shortest}px`,
						overflow: "scroll"
					});
				});
	
				return {}; // nothing to apply to parent
			} else {
				return {
					height,
					overflow: "scroll"
				};
			}
		};
	
		const renderRow = async (row: string) => {
			const temp = createDiv();
			const renderChild = new MarkdownRenderChild(temp);
			ctx.addChild(renderChild);
			const render = MarkdownRenderer.renderMarkdown(row, temp, srcPath, renderChild);
	
			const parent = el.createEl("div", { cls: "columnParent" });
	
			Array.from(temp.children).forEach((child: HTMLElement) => {
				const wrapper = parent.createEl("div", { cls: "columnChild" });
				ctx.addChild(new MarkdownRenderChild(wrapper));
				const childAttrs = Object.assign({},this.generateFlexStyleFromSpan(this.settings.defaultSpan))
				// Use generated default flex styles
	
				// Copy inline flex styles from special code blocks
				if (child.classList.contains("block-language-" + COLUMNMD)) {
					const inner = child.childNodes[0] as HTMLElement;
					console.log("inner",inner)
					if (inner?.style.flexGrow) {
						this.applyAttributes(wrapper, {
							flexGrow: inner.style.flexGrow,
							flexBasis: inner.style.flexBasis,
							width: inner.style.flexBasis
						});
					}
					wrapper.innerHTML = inner.innerHTML;
					console.log("wrapper",wrapper)
				}
				
				this.processChild(child);
			});
	
			// Aggregate and apply parent styles
			const parentStyles: Record<string, string> = Object.assign({},attrs);
			if (attrs.height) {
				const scrollStyles = await applyScrollHeight(parent, attrs.height, render);
				Object.assign(parentStyles, scrollStyles);
			}
			console.log("parent styles", parentStyles, attrs);
			this.applyAttributes(parent, parentStyles);
			this.applyPotentialBorderStyling(attrs, parent);
		};
	
		for (const row of rows) {
			await renderRow(row);
		}
	}
	
	
	markdownColumnCodeBlockProcessor(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext){
		const { source: content, settings } = findSettings(source);
		const attributes = Object.fromEntries(parseAttributesFromString(settings).map(a => [a.name, a.value]));

		const sourcePath = ctx.sourcePath;
		const child = el.createDiv();
		const renderChild = new MarkdownRenderChild(child)
		ctx.addChild(renderChild)
		MarkdownRenderer.renderMarkdown(content,child,sourcePath,renderChild);
		const childAttributes=Object.assign({},attributes)
		if (attributes.flexGrow != null) {
			const flexGrow = parseFloat(attributes.flexGrow)
			const CSS = this.generateFlexStyleFromSpan(flexGrow)
			delete CSS.width
			Object.assign(childAttributes, CSS)
		}
		if (attributes.height != null) {
			Object.assign(childAttributes, {
				height: attributes.height.toString(),
				overflow:  "scroll"
			})
		}
		this.applyPotentialBorderStyling(attributes, child);
		this.applyAttributes(child, childAttributes)
		console.log("child", child, childAttributes)
	}
	applyAttributes(el: HTMLElement, attributes: Record<string, string | number>) {
		for (const key in attributes) {
			const value = attributes[key].toString();
	
			// Apply to style if it's a CSS property
			if (key in el.style) {
				(el.style as any)[key] = value;
			}
			// Otherwise treat it as an HTML attribute
			else {
				el.setAttribute(key, value);
			}
		}
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

		this.pluglin.addCommand({
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

		this.pluglin.addCommand({
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
	private applyPotentialBorderStyling(settings: COLMDSETTINGS | COLSETTINGS, child: HTMLDivElement) {
		const { borderColor, borderStyle, borderWidth, borderRadius, borderPadding } = settings;
		const hasBorder = borderColor != null || borderStyle != null || borderWidth != null || borderRadius != null || borderPadding != null;
		if (!hasBorder) return;
		const style = {
			borderColor: borderColor ?? "white",
			borderStyle: borderStyle ?? "solid",
			borderWidth: this.parseBorderSizeInput(borderWidth, "1px"),
			borderRadius: this.parseBorderSizeInput(borderRadius),
			padding: this.parseBorderSizeInput(borderPadding),
		};
		this.applyAttributes(child, style);
	}
	

	private parseBorderSizeInput(input: string, defaultSize = "0"): string {
		if (input == null) {
			return defaultSize;
		}
		if (!+input) {
			return input;
		}

		return input + "px";
	}

	onunload() {
		
	}

	async loadSettings() {
		const root = document.querySelector(":root") as HTMLElement;
		root.style.setProperty(MINWIDTHVARNAME, this.settings.wrapSize + "px");
		root.style.setProperty(DEFSPANVARNAME, this.settings.defaultSpan.toString());
	}
}


interface ModalSettings {
	//numberOfColumns: SettingItem<number>,
}

const DEFAULT_MODAL_SETTINGS: ModalSettings = {
	numberOfColumns: { value: 2, name: "Number of Columns", desc: "Number of Columns to be made" },
}
/*
export class ColumnInsertModal extends Modal {
	onSubmit: (result: ModalSettings) => void;

	constructor(app: App, onSubmit: (result: ModalSettings) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "Create a Column Wrapper" });


		const modalSettings: ModalSettings = DEFAULT_MODAL_SETTINGS

		const keyvals = (Object.entries(DEFAULT_MODAL_SETTINGS) as [string, SettingItem<any>][])

		for (const keyval of keyvals) {
			createSetting(contentEl, keyval, "", (value: any, key: any) => {
				(modalSettings as any)[key].value = value
			})
		}

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(modalSettings);
					}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}*/