// Extracts SCHEMA comment lines (// or *) and cleans them
function extractSchemaComments(input: string): string[] {
    const regex = /^\s*(?:\/\/|\*)\s?.*SCHEMA\s*$/gm;

    return (input.match(regex) || []).map(line =>
        // remove leading "// " or "* "
        line.replace(/^\s*(?:\/\/|\*)\s?/, '').trim()
    );
}

async function main() {
    const [, , file] = process.argv;

    if (!file) {
        console.error("Usage: bun run extract-schema.ts <file.ts>");
        process.exit(1);
    }

    const content = await Bun.file(`${file}.ts`).text();
    const lines = extractSchemaComments(content);

    // Output each cleaned SCHEMA line
    for (const line of lines) {
        console.log(line);
    }
}

main();