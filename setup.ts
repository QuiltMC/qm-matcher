import { exec } from "https://deno.land/x/execute@v1.1.0/mod.ts";

const from_version = Deno.args[0];
if (from_version === undefined) {
    throw new Error("Missing from_version argument! Place the version you're updating to as the first argument in `deno task match`. (example: deno task match 1.20 1.20.1)");
}

const to_version = Deno.args[1];
if (to_version === undefined) {
    throw new Error("Missing to_version argument! Place the version you're updating to as the second argument in `deno task match`. (example: deno task match 1.20 1.20.1)");
}

// clone
console.log('Cloning old qm version...')
await exec('git clone https://github.com/quiltmc/quilt-mappings.git ' + from_version);
// todo: just copy instead?
console.log('Copying to new version...')
await exec('cp -r ' + from_version + ' ' + to_version);

// update version
console.log('Updating version in new clone...')
const decoder = new TextDecoder('utf-8')
const contents = Deno.readFileSync(to_version + '/buildSrc/src/main/java/quilt/internal/Constants.java')
const text = decoder.decode(contents);
const new_text = text.replace(from_version, to_version);
Deno.writeFileSync(to_version + '/buildSrc/src/main/java/quilt/internal/Constants.java', new TextEncoder().encode(new_text))

// set up new branch
console.log('Setting up new branch...')
await exec('git -C ' + to_version + ' checkout -b ' + to_version)

console.log("Done!");
Deno.exit(0);