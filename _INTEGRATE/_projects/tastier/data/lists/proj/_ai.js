import fs from "fs/promises";
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: "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"
});

/**
 * CONFIG
 */
const MODEL = "gpt-4o";
const OUTPUT_DIR = "./generated";
const REGION = process.env.REGION
const REGION_FILE = `${OUTPUT_DIR}/${REGION}.txt`;


console.log(`Region: ${REGION}`)

const PROMPT = `Task: Generate a region-segmented list of real recipe names for {{CATEGORY}}.

Scope Requirements:
	•	Include both high-end (Michelin-level) and everyday comfort-food recipes.
	•	Use canonical recipe names exactly as they appear on real menus, cookbooks, or professional kitchens.
	•	The category may include sub-types, base forms, and variants; treat each as a first-class recipe when commonly named.

Regions (mandatory, in this order):
${REGION}

Completeness Rules (category-agnostic):
	•	Explicitly list:
	•	Foundational / baseline forms
	•	Commonly named variants
	•	Everyday household versions
	•	Restaurant-standard menu items
	•	Do not rely on implication (if two things are commonly named separately, list both).
	•	If a preparation, ingredient, or format is routinely expected by a professional or user, include it.
	•	Always include English recipe names
	•	Do not omit, truncate or reduce, no bullet points
	•	If [INPUT LIST] is provided, reformat it following this prompt

English Naming Rule (Mandatory):
	•	Native or loanword recipe names alone are not sufficient.
	•	Every recipe must include an explicit English descriptor, either:
        •	As a full English name, or
        •	As a paired name in the format:
    Native Name (English Name)
	•	If a dish is commonly known by a native name in English contexts, it must still include an English explanation.
	•	This does not count as description and does not violate “names only.”

Validation Pass (mandatory before final output):
	•	Perform a professional “obvious omission” audit as if building a production recipe database.
	•	If something would feel missing to a chef, restaurateur, or user, add it.

Output Rules:
	•	Names only
	•	Grouped strictly by region
	•	No descriptions
	•	No commentary
	•	No summarization
	•	No FABRICATED Names
	•	NO DUPLICATION

Begin.

[INPUT LIST]

Continue output until the list is fully exhausted. If output is cut off, continue automatically without stopping, following above prompt rules.`

/**
 * CATEGORY LIST (ORDER MATTERS)
 */
const CATEGORIES = [
    "Most Popular",
    "Cocktails & Mocktails",
    "Breakfast",
    "Lunch",
    "Brunch",
    "Dinner",
    "Drinks",
    "Breads",
    "Chicken",
    "Beef",
    "Pork",
    "Seafood, Shrimp & Scallops",
    "Pastries",
    "Cakes",
    "Cookies",
    "Muffins & Cupcakes",
    "Desserts",
    "Candy & Chocolate",
    "Frosting & Icing",
    "Pie & Tart",
    "Potatoes",
    "Vegetables",
    "Tofu",
    "BBQ",
    "Rice",
    "Pasta",
    "Soup",
    "Street Food",
    "Side Dishes",
    "Appetizers",
    "Snacks",
    "Dumplings",
    "Sauces & Dips",
    "Dressings & Marinade",
    "Rubs & Spice Blends",
    "Deep Fried",
    "Steamed",
    "Braised",
    "Stocks & Broths",
    "Christmas",
    "New Years",
    "Thanksgiving",
    "Fondue",
    "Hot Pot",
    "Everything Found In A Grocery Store",
    "Everything Found In A Market (Fresh, Boxed, Pre-Made)",
    "Holidays",
    "Syrups",
    "Biscuits",
    "Bagels",
    "Camping & Outdoors",
    "Crackers",
    "Salads",
    "Sandwiches",
    "Gravies",
    "Jams & Jellies",
    "Pickles & Canning",
    "Pizza",
    "Doughs",
    "Stews",
    "Loafs",
    "Glazes",
    "Roasted & Baked",
    "Fruits",
    "Bakery",
    "Restaurant",
    "Diner",
    "Curing",
    "Wraps",
    "Fish",
    "Butters",
    "Flours",
    "Sugars",
    "Cheeses",
    "Vinegars",
    "Honeys",
    "Tea",
    "Milks",
    "Dried Fruits",
    "Dehydrated",
    "Yogurts",
    "Seasonings",
    "Extracts",
    "Breadcrumbs",
    "Oils",
    "Vinaigrettes",
    "Sausages",
    "Spreads",
    "Cereals, Granolas & Grains",
    "Jerkies & Pepperoni",
    "Cured Meats & Sandwich Meats & Deli Meats",
    "Historical",
    "Smoothies",
    "Alcohol",
    "Wine",
    "Beer",
    "Shooters",
    "Spices",
    "Chips",
    "Eggs",
    "Noodles",
    "Pub Food",
    "Condiments",
    "Legumes & Nuts",
    "Ice Cream & Gelato",
];

const MAX_RETRIES = 3;

/**
 * HELPERS
 */
async function generateCategory(category) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await client.responses.create({
                model: MODEL,
                top_p: 1.0,
                max_output_tokens: 2000,
                temperature: 0.25,
                top_p: 1.0,
                input: [
                    { role: "system", content: "Follow the user instructions exactly. Do not shorten lists. Do not summarize." },
                    {
                        role: "user",
                        content: PROMPT.replace('{{CATEGORY}}', category)
                    }
                ]
            });

            const text = response.output_text?.trim();

            if (!text || text.length < 200) {
                throw new Error("Output too short");
            }

            return text;
        } catch (err) {
            console.error(err)

            if (attempt === MAX_RETRIES) {
                return
            }

            console.warn(
                `Retry ${attempt}/${MAX_RETRIES} for category: ${category}`
            );

            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
}

/**
 * MAIN
 */
async function run() {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Ensure region file exists
    await fs.writeFile(REGION_FILE, "", { flag: "a" });

    for (const category of CATEGORIES) {
        console.log(`Generating: ${category}`);

        const text = await generateCategory(category);

        if (text?.length) {
            await fs.appendFile(REGION_FILE, text + "\n", "utf8");
        }
    }

    console.log("Done.");
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});