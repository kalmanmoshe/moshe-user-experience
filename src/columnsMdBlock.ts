import { MarkdownPostProcessorContext, MarkdownRenderChild, MarkdownRenderer } from "obsidian";
import Columns from "./main";
import { findSettings, parseAttributesFromString, applyPotentialBorderStyling, applyAttributes } from "./columns";

export default class ColumnsMdBlock {
    private plugin: Columns;
    private source: string;
    private el: HTMLElement;
    private ctx: MarkdownPostProcessorContext;
    private attrs: Record<string, string> = {};
    constructor(plugin: Columns,source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        this.plugin = plugin;
        this.source = source;
        this.el = el;
        this.ctx = ctx;
        this.process();
    }
    private process(){
		const { source: content, settings } = findSettings(this.source);
		this.attrs = parseAttributesFromString(settings);
		const sourcePath = this.ctx.sourcePath;
		const child = this.el.createDiv();
		const renderChild = new MarkdownRenderChild(child)
		this.ctx.addChild(renderChild)
		MarkdownRenderer.renderMarkdown(content,child,sourcePath,renderChild);
		const childAttributes=Object.assign({},this.attrs)
		if (this.attrs.flexGrow != null) {
			const flexGrow = parseFloat(this.attrs.flexGrow)
			const CSS = this.generateFlexStyleFromSpan(flexGrow)
			delete CSS.width
			Object.assign(childAttributes, CSS)
		}
		if (this.attrs.height != null) {
			Object.assign(childAttributes, {
				height: this.attrs.height.toString(),
				overflow:  "scroll"
			})
		}
		applyPotentialBorderStyling(this.attrs, child);
		applyAttributes(child, childAttributes)
	}
    private generateFlexStyleFromSpan(span: number){
		const o: Record<string,string> = {}
		o.flexGrow = span.toString()
		o.flexBasis = (this.plugin.settings.wrapSize * span).toString() + "px"
		o.width = (this.plugin.settings.wrapSize * span).toString() + "px"
		return o
	}
	static process(plugin: Columns, source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		new ColumnsMdBlock(plugin, source, el, ctx);
	}
}