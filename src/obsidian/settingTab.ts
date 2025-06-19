import { App, PluginSettingTab } from "obsidian";
import Columns from "src/main";

export default class ColumnsSettingsTab extends PluginSettingTab {
    private plugin: Columns;
    constructor(app: App,plugin: Columns) {
        super(app,plugin);
        this.plugin = plugin;
    }
    display() {
        
    }
}