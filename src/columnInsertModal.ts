
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