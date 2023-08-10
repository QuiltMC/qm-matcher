import { exec } from "https://deno.land/x/execute@v1.1.0/mod.ts";
import { existsSync } from "https://deno.land/std/fs/mod.ts";

const from_version = Deno.args[0];
if (from_version === undefined) {
    throw new Error("Missing from_version argument! Place the version you're updating to as the first argument in `deno task match`. (example: deno task match 1.20 1.20.1)");
}

const to_version = Deno.args[1];
if (to_version === undefined) {
    throw new Error("Missing to_version argument! Place the version you're updating to as the second argument in `deno task match`. (example: deno task match 1.20 1.20.1)");
}

console.log("Cleaning up folder...")
for (const dirEntry of Deno.readDirSync("./")) {
    if (dirEntry.isDirectory && existsSync(dirEntry.name + "/mappings")) {
        console.log("Deleting old mappings directory " + dirEntry.name + "...")
        Deno.removeSync("./" + dirEntry.name, { recursive: true });
    }
}

// clone
console.log('Cloning old qm version...')
await exec('git clone https://github.com/quiltmc/quilt-mappings.git ' + from_version);

console.log('Copying to new version...')
await exec('cp -r ' + from_version + ' ' + to_version);

// update version
console.log('Updating version in new clone...')
const decoder = new TextDecoder('utf-8')
const contents = Deno.readFileSync(to_version + '/buildSrc/src/main/java/quilt/internal/Constants.java')
const text = decoder.decode(contents);
const new_text = text.replace(from_version, to_version);
Deno.writeFileSync(to_version + '/buildSrc/src/main/java/quilt/internal/Constants.java', new TextEncoder().encode(new_text))

const new_contents = Deno.readFileSync(to_version + '/buildSrc/src/main/java/quilt/internal/Constants.java')
const new_raw_text = decoder.decode(new_contents);
if (!new_raw_text.includes(to_version) || new_raw_text.includes(from_version)) {
    throw new Error("Failed to update version in new clone! Check that your versions are correct (first version must match current QM default branch), and if yes, please follow manual steps, starting at step 5.");
}

// set up new branch
console.log('Setting up new branch...')
await exec('git -C ' + to_version + ' checkout -b ' + to_version)

console.log("Done!");
Deno.exit(0);