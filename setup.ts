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
if (existsSync("./qm")) {
    for (const dirEntry of Deno.readDirSync("./qm")) {
        if (dirEntry.isDirectory && existsSync("./qm/" + dirEntry.name + "/mappings")) {
            console.log("Deleting old mappings directory " + dirEntry.name + "...")
            Deno.removeSync("./qm/" + dirEntry.name, {recursive: true});
        }
    }
}

// clone
console.log('Cloning old qm version...')
await exec('git clone https://github.com/quiltmc/quilt-mappings.git --depth 1 --branch ' + from_version + ' --single-branch qm/' + from_version);

console.log('Copying to new version...')
await exec('cp -r qm/' + from_version + ' qm/' + to_version);

// update version
console.log('Updating version in new clone...')
const versionsFile = 'qm/' + to_version + '/gradle/libs.versions.toml'

const decoder = new TextDecoder('utf-8')
const contents = Deno.readFileSync(versionsFile)
const text = decoder.decode(contents);

const old_version_string = 'minecraft = "' + from_version + '"';
const new_version_string = 'minecraft = "' + to_version + '"';

const new_text = text.replace(old_version_string, new_version_string);
Deno.writeFileSync(versionsFile, new TextEncoder().encode(new_text))

const new_contents = Deno.readFileSync(versionsFile)
const new_raw_text = decoder.decode(new_contents);
if (!new_raw_text.includes(new_version_string) || new_raw_text.includes(old_version_string)) {
    throw new Error("Failed to update version in new clone! Check that your versions are correct (first version must match current QM default branch), and if yes, please follow manual steps, starting at step 5.");
}

// set up new branch
console.log('Setting up new branch...')
await exec('git -C qm/' + to_version + ' checkout -b ' + to_version)

console.log("Done!");
Deno.exit(0);