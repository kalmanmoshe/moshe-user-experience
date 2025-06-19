import MosheUserExperience from "src/main";
import { CODE_BLOCK_FENCE, SETTINGS_DELIM } from "./obsidian/settings";


type BorderSettings = {
	borderColor?: string,
	borderStyle?: string,
	borderWidth?: string,
	borderRadius?: string,
	borderPadding?: string,
}

type ColMdSettings = {
	flexGrow?: string,
	height?: string,
	textAlign?: string,
} & BorderSettings

type ColSettings = {
	height?: string,
	textAlign?: string,
	colMax?: string
} & BorderSettings


export function refreshCodeMirror(plugin: MosheUserExperience) {
    plugin.app.workspace.onLayoutReady(() =>
        plugin.app.workspace.iterateCodeMirrors((cm) =>
            cm.setOption("mode", cm.getOption("mode"))
        )
    );
}
export const findSettings = (source: string, unallowed = ["`"], delim = SETTINGS_DELIM): { settings: string, source: string } => {
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

const countBeginning = (source: string) => {
	let out = 0
	const letters = source.split("")
	for (const letter of letters) {
		if (letter == CODE_BLOCK_FENCE) {
			out++
		} else {
			break
		}
	}
	return out
}
/**
 * splits the source into rows based on the SETTINGS_DELIM
 * @param source 
 * @returns 
 */
export const parseRows = (source: string) => {
	const lines = source.split("\n")
	const rows = []
	let curToken = 0
	let newToken = 0
	let curRow = []
	for (const line of lines) {
		const newCount = countBeginning(line)
		newToken = newCount < 3 ? 0 : newCount
		if (curToken == 0 && newToken == 0 && line.startsWith(SETTINGS_DELIM)) {
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

export const parseDirtyNumber = (num: string) => {
	return parseFloat(num.split("")
		.filter((char: string) => "0123456789.".contains(char))
		.join(""))
}
export function parseAttributesFromElement(el: HTMLElement) {
	// Convert attributes to Record<string, string>
	const attributes: Record<string, string> = {};
	for (const attr of Array.from(el.attributes)) {
		attributes[attr.name] = attr.value;
	}
  
	// Convert inline styles to Record<string, string>
	for (let i = 0; i < el.style.length; i++) {
		const prop = el.style[i];
		attributes[prop] = el.style.getPropertyValue(prop);
	}
	delete attributes["style"]
	return attributes
}
export function parseAttributesFromString(str: string): Record<string, string> {
	const fakeHTML = `<div ${str}></div>`;
	const doc = new DOMParser().parseFromString(fakeHTML, "text/html");
	const parsedDiv = doc.body.firstChild;
	if (!parsedDiv || !(parsedDiv instanceof HTMLElement)) return {};
	const attributes: Record<string, string> = parseAttributesFromElement(parsedDiv);
	const fixedAttributes: Record<string, string> = {};
	for (const key in attributes) {
		const lowerStr = str.toLowerCase();
		const index = lowerStr.indexOf(key);
		if (index === -1) {
			throw new Error("Key not found in original string: " + key);
		}
		// Recover original key casing
		const originalKey = str.substring(index, index + key.length).trim();
		fixedAttributes[originalKey] = attributes[key];
	}

	return fixedAttributes;
}
function toPascalCase(str: string) {
	return str
		.split("-")
		.map((word,index) => index===0?word:word.charAt(0).toUpperCase() + word.slice(1))
		.join("");
}
  
function normalizeAttributesToObj(attributes: Record<string, string | number>): Record<string, string> {
	const normalized: Record<string, string> = {};
	for (const key in attributes) {
		const value = String(attributes[key]);
		if (key.includes("-")) {
			const newKey = toPascalCase(key);
			normalized[newKey] = value;
		} else {
			normalized[key] = value;
		}
	}

	return normalized;
}

export function applyAttributes(el: HTMLElement, attributes: Record<string, string | number>) {
	attributes = normalizeAttributesToObj(attributes)
	for (const key in attributes) {
		const value = attributes[key].toString();
		if (key in el.style) {
			(el.style as any)[key] = value;
		}
		else if (key in el) {
			(el as any)[key] = value;
		}
	}
}
export function processChild(c: HTMLElement) {
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
function parseBorderSizeInput(input: string, defaultSize = "0"): string {
	if (input == null) {
		return defaultSize;
	}
	if (!+input) {
		return input;
	}

	return input + "px";
}
export function applyPotentialBorderStyling(settings: ColMdSettings | ColSettings, child: HTMLDivElement) {
	const { borderColor, borderStyle, borderWidth, borderRadius, borderPadding } = settings;
	const hasBorder = borderColor != null || borderStyle != null || borderWidth != null || borderRadius != null || borderPadding != null;
	if (!hasBorder) return;
	const style = {
		borderColor: borderColor ?? "white",
		borderStyle: borderStyle ?? "solid",
		borderWidth: parseBorderSizeInput(borderWidth, "1px"),
		borderRadius: parseBorderSizeInput(borderRadius),
		padding: parseBorderSizeInput(borderPadding),
	};
	applyAttributes(child, style);
}


