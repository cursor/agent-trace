import { generateJsonSchemas } from "../schemas";
import { mkdir, writeFile } from "fs/promises";

async function generateSchemas() {
  const schemas = generateJsonSchemas();
  const schemaDir = "schemas";

  await mkdir(schemaDir, { recursive: true });

  for (const [filename, schema] of Object.entries(schemas)) {
    const filepath = `${schemaDir}/${filename}`;
    await writeFile(filepath, JSON.stringify(schema, null, 2) + "\n");
    console.log(`✓ Generated ${filepath}`);
  }

  console.log(`\nSuccessfully generated ${Object.keys(schemas).length} schema(s)`);
}

generateSchemas().catch((error) => {
  console.error("Error generating schemas:", error);
  process.exit(1);
});
