import { MarkdownRenderChild, MarkdownRenderer,  MarkdownPostProcessorContext } from "obsidian";
import Columns from "./main";
import { COLUMN_MD } from "./obsidian/settings";
import { applyAttributes, applyPotentialBorderStyling, findSettings, parseAttributesFromElement, parseAttributesFromString, parseDirtyNumber, parseRows, processChild } from "./columns";
export default class ColumnsBlock {
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
    private async applyScrollHeight(parent: HTMLElement,height: string,wait: Promise<void>): Promise<Record<string, string>>{
        if (height === "shortest") {
            await wait;
            const shortest = Math.min(...Array.from(parent.children).map(c => {
                const child = c.firstElementChild as HTMLElement;
                const cs = getComputedStyle(child);
                return parseDirtyNumber(cs.height) + parseDirtyNumber(cs.lineHeight);
            }));

            Array.from(parent.children).forEach(c => {
                applyAttributes(c.firstElementChild as HTMLElement, {
                    height: `${shortest}px`,
                    overflow: "scroll"
                });
            });
            console.log("finished applying",this.el)
            return {}; // nothing to apply to parent
        } else {
            console.log("finished applying",this.el)
            return {height,overflow: "scroll"};
        }
    }
    private async renderRow(row: string) {
        const temp = createDiv();
        const renderChild = new MarkdownRenderChild(temp);
        this.ctx.addChild(renderChild);
        const render = MarkdownRenderer.renderMarkdown(row, temp, this.ctx.sourcePath, renderChild);

        const parent = this.el.createEl("div", { cls: "columnParent" });

        Array.from(temp.children).forEach((child: HTMLElement) => {
            const wrapper = parent.createEl("div", { cls: "columnChild" });
            this.ctx.addChild(new MarkdownRenderChild(wrapper));
            // Use generated default flex styles
            wrapper.innerHTML = child.innerHTML;
            // Copy inline flex styles from special code blocks
            if (child.classList.contains("block-language-" + COLUMN_MD)) {
                const inner = child.childNodes[0] as HTMLElement;
                applyAttributes(wrapper,parseAttributesFromElement(inner))
                wrapper.innerHTML = inner.innerHTML;
            }
            child.remove();
            processChild(child);
        });

        // Aggregate and apply parent styles
        const parentStyles: Record<string, string> = Object.assign({},this.attrs);
        if (this.attrs.height) {
            const scrollStyles = await this.applyScrollHeight(parent, this.attrs.height, render);
            Object.assign(parentStyles, scrollStyles);
        }
        applyAttributes(parent, parentStyles);
        applyPotentialBorderStyling(this.attrs, parent);
    }
    async process() {
        const { source: content, settings } = findSettings(this.source);
        this.attrs = parseAttributesFromString(settings);
        const rows = parseRows(content);
        
        for (const row of rows) {
            await this.renderRow(row);
        }
    }
    static async process(plugin: Columns,source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        new ColumnsBlock(plugin, source, el, ctx);
    }
}