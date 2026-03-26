import React, { useState, useEffect } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import fs from "fs/promises";
import _fs from "fs";
import path from "path";
import trash from "trash";

const USE_TRASH = process.argv.includes("--trash");

const REGION_PRIORITY = [
	"USA",
	"Europe",
	"UK",
	"Canada",
	"Australia",
	"Japan",
	"Asia",
	"Germany",
	"France",
	"Italy",
	"Spain",
	"Netherlands",
	"Russia",
	"Korea",
	"India",
	"China",
	"Sweden",
	"Norway",
	"Denmark",
	"Finland",
	"Scandinavia",
	"Poland",
];

const LANGUAGE_PRIORITY = [
	"En",
	"Fr",
	"De",
	"Es",
	"It",
	"Nl",
	"Pt",
	"Sv",
	"No",
	"Da",
	"Fi",
	"Ja",
	"Hi",
	"Zh",
	"El",
	"Pl",
	"Ru",
	"Ca",
	"Pa",
	"Ta",
	"Cs",
];

type RomFile = {
	name: string;
	fullPath: string;
	base: string;
	regions: string[];
	version: number | null;
	disc: string | null;
	discNumber: number | null;
	year: number | null;
	demo: boolean;
	alt: boolean;
};

const regionRegex = /\(([^)]+)\)/g;
const versionRegex = /\(v(\d+\.\d+)\)/i;
const discRegex = /\(Disc (\d+)\)/i;
const demoRegex = /\((Taikenban(?: [^\)]+)?|Demo(?: [^\)]+)?)\)/i;
const altRegex = /\(Alt\)/i;
const yearRegex = /\b(19|20)\d{2}\b/;

function parseFile(file: string): RomFile {
	const name = path.basename(file);
	const fullPath = path.resolve(file);
	const matches = name.match(regionRegex) || [];

	const versionMatch = name.match(versionRegex);
	const version = versionMatch ? parseFloat(versionMatch[1]) : null;

	const discMatch = name.match(discRegex);
	const disc = discMatch ? discMatch[0] : null;
	const discNumber = discMatch ? parseInt(discMatch[1], 10) : null;

	const yearMatch = name.match(yearRegex);
	const year = yearMatch ? parseInt(yearMatch[0]) : null;

	const isDemo = demoRegex.test(name);
	const isAlt = altRegex.test(name);

	const regionParts = matches.flatMap((m) =>
		m
			.slice(1, -1)
			.split(",")
			.map((s) => s.trim()),
	);

	let base = name;
	matches.forEach((m) => (base = base.replace(m, "")));
	base = base.replace(path.extname(name), "").trim();
	const baseKey = year ? `${base.toLowerCase()}__${year}` : base.toLowerCase();

	return {
		name,
		fullPath,
		base: baseKey,
		regions: regionParts,
		version,
		disc,
		discNumber,
		year,
		demo: isDemo,
		alt: isAlt,
	};
}

function scoreRom(rom: RomFile): number {
	const regionScore = Math.min(
		...rom.regions
			.map((r) => REGION_PRIORITY.indexOf(r))
			.filter((i) => i !== -1),
		REGION_PRIORITY.length,
	);
	const langScore = Math.min(
		...rom.regions
			.map((r) => LANGUAGE_PRIORITY.indexOf(r))
			.filter((i) => i !== -1),
		LANGUAGE_PRIORITY.length,
	);
	const versionScore = rom.version ?? 0;
	const demoPenalty = rom.demo ? 1000000 : 0;
	const altPenalty = rom.alt ? 500000 : 0;

	return (
		-regionScore * 10000 -
		langScore * 100 +
		versionScore -
		demoPenalty -
		altPenalty
	);
}

type AppProps = {
	groups: Map<string, RomFile[]>;
};

const App: React.FC<AppProps> = ({ groups }) => {
	const [keys] = useState(Array.from(groups.keys()));
	const [index, setIndex] = useState(0);
	const [cursor, setCursor] = useState(0);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const { exit } = useApp();

	const key = keys[index];
	const files = groups.get(key);
	const allFiles = [...(files ?? [])].sort((a, b) => {
		const aSelected = selected.has(a.name);
		const bSelected = selected.has(b.name);
		if (aSelected && !bSelected) return -1;
		if (!aSelected && bSelected) return 1;
		return a.name.localeCompare(b.name);
	});

	useEffect(() => {
		if (!files) {
			exit();
			
			return;
		}

		const recommendedFiles = new Set<string>();
		const byDisc = new Map<number, RomFile[]>();
		const multiDisc = files.some((f) => f.discNumber !== null);

		if (multiDisc) {
			for (const file of files) {
				if (file.discNumber !== null) {
					const list = byDisc.get(file.discNumber) ?? [];
					list.push(file);
					byDisc.set(file.discNumber, list);
				}
			}
			for (const list of byDisc.values()) {
				const preferred =
					list
						.filter((f) => !f.alt)
						.sort((a, b) => scoreRom(b) - scoreRom(a))[0] ?? list[0];
				recommendedFiles.add(preferred.name);
			}
		} else {
			const sorted = [...files].sort((a, b) => scoreRom(b) - scoreRom(a));
			recommendedFiles.add(sorted[0].name);
		}

		if (recommendedFiles.size === files.length) {
			setIndex((i) => i + 1);
			return;
		}

		setSelected(recommendedFiles);
		setCursor(0);
	}, [index, files]);

	useInput((input, key) => {
		if (key.downArrow) {
			setCursor((i) => (i + 1) % allFiles.length);
		} else if (key.upArrow) {
			setCursor((i) => (i - 1 + allFiles.length) % allFiles.length);
		} else if (input === " ") {
			const name = allFiles[cursor].name;
			setSelected((prev) => {
				const next = new Set(prev);
				next.has(name) ? next.delete(name) : next.add(name);
				return next;
			});
		} else if (input === "d") {
			const toDelete = allFiles.filter((f) => !selected.has(f.name));
			Promise.all(
				toDelete.map(async (file) => {
					if (USE_TRASH) {
						await trash([file.fullPath]);
					} else {
						await fs.rm(file.fullPath);
					}
				}),
			).then(() => {
				setIndex((i) => i + 1);
				setSelected(new Set());
				setCursor(0);
			});
		} else if (input === "s") {
			setIndex((i) => i + 1);
			setSelected(new Set());
			setCursor(0);
		} else if (input === "q") {
			exit();
		}
	});

	const keepFiles = allFiles.filter((f) => selected.has(f.name));
	const removeFiles = allFiles.filter((f) => !selected.has(f.name));

	if (!files || index >= keys.length) {
		return <Text>✅ Done reviewing all duplicates.</Text>;
	}

	return (
		<Box flexDirection="column">
			<Text color="cyanBright">Game: {key.replace(/__\d{4}$/, "")}</Text>
			<Text> </Text>
			<Text color="green">Keep:</Text>
			{keepFiles.map((file, i) => {
				const isCursor = allFiles.indexOf(file) === cursor;
				return (
					<Text key={file.name} color={isCursor ? "green" : undefined}>
						✅ {isCursor ? "▸ " : "  "}
						{file.name}
					</Text>
				);
			})}
			<Text> </Text>
			<Text color="red" marginTop={1}>
				Remove:
			</Text>
			{removeFiles.map((file, i) => {
				const isCursor = allFiles.indexOf(file) === cursor;
				return (
					<Text key={file.name} color={isCursor ? "green" : undefined}>
						❌ {isCursor ? "▸ " : "  "}
						{file.name}
					</Text>
				);
			})}

			<Box marginTop={1}>
				<Text>
					↑/↓ to navigate · <Text color="cyan">space</Text> to toggle ·{" "}
					<Text color="green">d</Text> to delete unselected ·{" "}
					<Text color="yellow">s</Text> to skip · <Text color="red">q</Text> to
					quit
				</Text>
			</Box>
		</Box>
	);
};

(async () => {
	const files = (await fs.readdir(".")).filter((f) => _fs.statSync(f).isFile());
	const roms = files.map(parseFile);
	const groups = new Map<string, RomFile[]>();

	for (const rom of roms) {
		if (!groups.has(rom.base)) groups.set(rom.base, []);
		groups.get(rom.base)?.push(rom);
	}

	const duplicates = new Map<string, RomFile[]>();
	for (const [key, group] of groups.entries()) {
		if (group.length > 1) {
			duplicates.set(key, group);
		}
	}

	render(<App groups={duplicates} />);
})();
