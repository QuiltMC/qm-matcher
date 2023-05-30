import * as enigma from "./enigma_mappings.mjs";
import * as tiny from "./tiny.mjs";
import * as jar_utils from "./jar_utils.mjs";
import { readFileSync } from "fs";

// @TODO change to Deno stuff so we can avoid npm?

// CHANGE THIS
const from_version = "OLD_VERSION";
const to_version = "NEW_VERSION";

console.log("Loading mappings...");
let base_mappings = new enigma.Mappings("base");
let new_mappings = new enigma.Mappings("new");
// @TODO unharcode this
enigma.read_mappings(from_version + "/mappings/", base_mappings);
enigma.read_mappings(to_version + "/mappings/", new_mappings);

console.log(`Loading ${to_version} hashed tiny file...`);
// @TODO download it from somewhere the maven? (snapshot make it a bit complicated)
const new_tiny = tiny.parse(readFileSync(`hashed-${to_version}.tiny`, {encoding: "utf-8"}));

function load_jar_file(base_path, version) {
    const path = base_path + version + "-hashed.jar";
    return jar_utils.load_file(path);
}

console.log(`Loading ${from_version} hashed mojmap JAR file...`);
const base_hashed_mojmap_jar = load_jar_file(from_version + "/", from_version);
console.log(`Loading ${to_version} hashed mojmap JAR file...`);
const new_hashed_mojmap_jar = load_jar_file(to_version + "/", to_version);

/**
 * Remaps the parameters to the new descriptor of the method.
 * @param {Array} old_detailed_params the old parameters with name, comments and LVT index
 * @param {boolean} is_static whether or not the new method is static
 * @param {enigma.Method} new_method the new method
 */
function remap_params(old_detailed_params, is_static, new_method) {
    let args = [];
    let resolved = [];
    for (const old_param of old_detailed_params) {
        if (old_param.name === undefined)
            continue;
        for (let i = 0; i < new_method.descriptor.params.length; i++) {
            if (resolved.includes(i)) continue;
            if (old_param.type === new_method.descriptor.params[i]) {
                let param = new enigma.Mapping(undefined, old_param.name);
                param.comments = old_param.comments;
                args[new_method.descriptor.get_lvt_index_of(i, is_static)] = param;
                resolved.push(i);
                break;
            }
        }
    }

    new_method.args = args;
}

let fixed_methods = [];
base_mappings.methods.forEach(method => {
    let new_class = new_mappings.find_class(method.owner_class.toString());
    if (!new_class) return;

    let new_method = new_mappings.find_method(method.intermediary);

    if (!new_method) { // Needs fixing.
        let tiny_method;
        if (tiny_method = new_tiny.find_target_method(method.intermediary)) { // The method actually exists in the new version.
            let new_descriptor = tiny_method.resolve_descriptor(new_tiny);

            // We try to figure out where it should be inserted in the new mappings to avoid messing up the diff.
            // Definitely not perfect.
            let old_index = method.owner_class.methods.indexOf(method);
            let to_shift = 0;
            for (let i = 0; i < old_index; i++) {
                let class_method = method.owner_class.methods[i];
                if (class_method.intermediary !== "<init>" 
                        && !fixed_methods.includes(class_method) && !new_tiny.find_target_method(class_method.intermediary)
                        && !new_class.find_method(class_method.intermediary)) {
                    to_shift++;
                }
            }

            old_index -= to_shift;

            // Simple case: only the return type changes.
            if (method.descriptor.are_params_equal_with(new_descriptor)) {
                console.log(`\u001b[92mMethod ${method.intermediary} (${method.named}) have a different return type (${method.descriptor.return_type} => ${new_descriptor.return_type}).\u001b[0m`);

                // @TODO actually check if the static modifier changes?
                new_method = new enigma.Method(new_class, method.intermediary, method.named, new_descriptor);
                new_method.args = method.args;

                new_class.methods.splice(old_index, new_method, new_method);

                fixed_methods.push(method);
            } else {
                console.log(`\u001b[38;5;208mMethod ${method.intermediary} (${method.named}) have a different descriptor (${method.descriptor.toString()} => ${new_descriptor.toString()}).\u001b[0m`);
                let new_class = new_mappings.find_class(method.owner_class.toString());

                // Bad luck, the parameters changed.
                new_method = new enigma.Method(new_class, method.intermediary, method.named, new_descriptor);

                // Load the class files (yes), to figure out whether or not the method is (and was) static.
                // This is important since Enigma uses LVT indexing for parameters.
                let raw_base_class = base_hashed_mojmap_jar.load_class(method.owner_class);
                let raw_new_class = new_hashed_mojmap_jar.load_class(tiny_method.owner.to);

                remap_params(
                    method.detailed_params(raw_base_class.find_method_from_enigma(method).is_static()),
                    raw_new_class.find_method_from_enigma(new_method).is_static(),
                    new_method
                );

                new_class.methods.splice(old_index, new_method, new_method);

                fixed_methods.push(method);
            }

            new_method.comments = method.comments;
        } else {
            console.log(`\u001b[31mLost method ${method.intermediary} (${method.named}).\u001b[0m`);
        }
    }
});

let fixed_fields = [];
base_mappings.fields.forEach(field => {
    let new_class = new_mappings.find_class(field.owner_class.toString());
    if (!new_class) return;

    let new_field = new_mappings.find_field(field.intermediary);

    if (!new_field) { // Needs fixing.
        let tiny_field;
        if (tiny_field = new_tiny.find_target_field(field.intermediary)) {
            let new_type = tiny_field.resolve_type(new_tiny);

            // We try to figure out where it should be inserted in the new mappings to avoid messing up the diff.
            // Definitely not perfect.
            let old_index = field.owner_class.fields.indexOf(field);
            let to_shift = 0;
            for (let i = 0; i < old_index; i++) {
                let class_field = field.owner_class.fields[i];
                if (!fixed_fields.includes(class_field) && !new_tiny.find_target_field(class_field.intermediary)
                        && !new_class.find_field(class_field.intermediary)) {
                    to_shift++;
                }
            }

            old_index -= to_shift;

            console.log(`\u001b[38;5;200mField ${field.intermediary} (${field.named}) have a different type (${field.type} => ${new_type}).\u001b[0m`);

            new_field = new enigma.Field(new_class, field.intermediary, field.named, new_type);
            new_field.comments = field.comments;

            new_class.fields.splice(old_index, new_field, new_field);

            fixed_fields.push(field);
        } else {
            console.log(`\u001b[31mLost field ${field.intermediary} (${field.named}).\u001b[0m`);
        }
    }
});

console.log("Rebuilding tree...");
new_mappings.rebuild_tree(); // Rebuild the mappings tree which is important for writing.

console.log("Writing...");
enigma.write_mappings("", "", new_mappings);

base_mappings.show_stats();
new_mappings.show_stats();
